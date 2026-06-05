'use strict';

/**
 * materialProcessor.js
 *
 * Processes staged MaterialLink documents:
 *  1. Downloads files from Horizon portal (using the user's live session cookie)
 *  2. Applies 3-layer deduplication (section, teacher, filename)
 *  3. Extracts ZIP archives; stores RAR as-is
 *  4. Uploads originals to B2 under course-material/ (downloadable)
 *  5. Converts DOCX/PPTX to PDF and uploads to B2 under course-vault/ (view-only)
 *
 * KEY RULE: This processor MUST run while the session cookie is still valid,
 * because portal download URLs are session-bound.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const extract = require('extract-zip');

const { uploadToB2, getMimeType, normalizeFileName } = require('../utils/b2Client');
const { convertToPdf } = require('../utils/documentConverter');

const CourseMaterial = require('../models/CourseMaterial');
const CourseVaultFile = require('../models/CourseVaultFile');
const MaterialLink    = require('../models/MaterialLink');

// ── Constants ────────────────────────────────────────────────────────────────
const TEMP_DIR = path.join(os.tmpdir(), 'myportal-materials');
const DELAY_BETWEEN_FILES = 500;   // ms between file downloads (respect UCP server)
const DOWNLOAD_TIMEOUT_MS = 60000; // 60s per file

// Extensions that get converted to PDF for the Vault
const CONVERTIBLE_EXTS = new Set(['.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls']);

// ── Helpers ──────────────────────────────────────────────────────────────────
function ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanTempFile(filePath) {
    try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
}

function cleanTempDir(dirPath) {
    try {
        if (dirPath && fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (_) {}
}

function getExtension(filename) {
    return ('.' + (filename.split('.').pop() || '')).toLowerCase();
}

/**
 * Write a buffer to a unique temp file. Returns the file path.
 */
function writeTempFile(buffer, originalName) {
    ensureTempDir();
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tmpPath = path.join(TEMP_DIR, `${Date.now()}_${safe}`);
    fs.writeFileSync(tmpPath, buffer);
    return tmpPath;
}

/**
 * Download a file from the Horizon portal using the session cookie.
 * Returns a Buffer. Throws on failure.
 */
async function downloadPortalFile(url, cookieString) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,application/octet-stream,*/*'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} downloading ${url}`);
        }

        // Detect if session expired (redirect to login page)
        const finalUrl = response.url || '';
        if (finalUrl.includes('/login') || finalUrl.includes('/web/login')) {
            throw new Error('SESSION_EXPIRED');
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * Extract a ZIP buffer. Returns array of { name, buffer }.
 * Skips directories, __MACOSX, and empty entries.
 */
async function extractZipBuffer(zipBuffer) {
    const tmpZip = writeTempFile(zipBuffer, 'archive.zip');
    const tmpExtractDir = path.join(TEMP_DIR, `extract_${Date.now()}`);
    const entries = [];

    try {
        await extract(tmpZip, { dir: tmpExtractDir });
        const collectFiles = (dir, basePath = '') => {
            for (const item of fs.readdirSync(dir)) {
                if (item.startsWith('.') || item === '__MACOSX') continue;
                const fullPath = path.join(dir, item);
                const relPath = basePath ? `${basePath}/${item}` : item;
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    collectFiles(fullPath, relPath);
                } else if (stat.size > 0) {
                    entries.push({ name: item, relativePath: relPath, buffer: fs.readFileSync(fullPath) });
                }
            }
        };
        collectFiles(tmpExtractDir);
    } finally {
        cleanTempFile(tmpZip);
        cleanTempDir(tmpExtractDir);
    }

    return entries;
}

// ── Core Upload Functions ─────────────────────────────────────────────────────

/**
 * Upload a single file to B2 under course-material/.
 * Returns the b2Key.
 */
async function uploadMaterialToB2(buffer, courseCode, sectionCode, fileName) {
    const ext = getExtension(fileName);
    const safe = normalizeFileName(fileName) || `file_${Date.now()}${ext}`;
    const key = `course-material/${courseCode}/${sectionCode}/${safe}`;
    await uploadToB2(key, buffer, getMimeType(fileName));
    return key;
}

/**
 * Upload a single PDF to B2 under course-vault/.
 * If conversion is needed, it happens here.
 * Returns { b2Key, isConverted, finalExt }.
 */
async function uploadVaultToB2(buffer, ext, originalFileName, courseCode, teacherSlug) {
    let finalBuffer = buffer;
    let finalExt = ext;
    let isConverted = false;

    if (CONVERTIBLE_EXTS.has(ext)) {
        // Write to temp, convert, read PDF back
        const tmpInput = writeTempFile(buffer, originalFileName);
        try {
            const pdfPath = await convertToPdf(tmpInput, TEMP_DIR);
            finalBuffer = fs.readFileSync(pdfPath);
            finalExt = '.pdf';
            isConverted = true;
            cleanTempFile(pdfPath);
        } catch (convErr) {
            console.warn(`[VAULT] PDF conversion failed for ${originalFileName}: ${convErr.message}. Storing original.`);
        } finally {
            cleanTempFile(tmpInput);
        }
    }

    // RAR files are not stored in vault
    if (ext === '.rar') return null;

    const safe = normalizeFileName(originalFileName.replace(ext, finalExt)) || `file_${Date.now()}${finalExt}`;
    const key = `course-vault/${courseCode}/${teacherSlug}/${safe}`;
    await uploadToB2(key, finalBuffer, getMimeType(finalExt === '.pdf' ? 'file.pdf' : originalFileName));

    return { b2Key: key, isConverted, finalExt, fileSize: finalBuffer.length };
}

// ── Per-file Processing ───────────────────────────────────────────────────────

/**
 * Process a single file buffer for both Material and Vault.
 */
async function processOneFile({
    buffer, fileName, ext, courseCode, courseName,
    sectionCode, teacherName, userId, portalUrl
}) {
    const normalized = normalizeFileName(fileName);
    if (!normalized) return;

    const teacherSlug = teacherName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

    // ── Course Material: store original ──────────────────────────────────────
    const materialExists = await CourseMaterial.exists({ sectionCode, normalizedFileName: normalized });
    if (!materialExists) {
        try {
            const b2Key = await uploadMaterialToB2(buffer, courseCode, sectionCode, fileName);
            await CourseMaterial.create({
                userId, courseCode, courseName, sectionCode, teacherName,
                fileName, normalizedFileName: normalized,
                b2Key, fileType: ext.replace('.', ''),
                fileSize: buffer.length, originalPortalUrl: portalUrl,
                isArchiveExtracted: false
            });
            console.log(`[MATERIAL] ✅ Stored: ${fileName} (section: ${sectionCode})`);
        } catch (err) {
            if (err.code === 11000) {
                console.log(`[MATERIAL] Duplicate caught by index: ${fileName}`);
            } else {
                console.error(`[MATERIAL] Failed to store ${fileName}:`, err.message);
            }
        }
    } else {
        console.log(`[MATERIAL] ⏭️  Exists in section: ${fileName}`);
    }

    // ── Course Vault: teacher dedup + PDF conversion ──────────────────────────
    // RAR files are never added to vault
    if (ext === '.rar') return;

    // Check if teacher already has this file
    const vaultExists = await CourseVaultFile.exists({ courseCode, teacherName, normalizedFileName: normalized });
    if (vaultExists) {
        console.log(`[VAULT] ⏭️  Exists for teacher: ${fileName}`);
        return;
    }

    // Check teacher-section guard: if teacher covered by a different section, skip vault
    const anyTeacherVault = await CourseVaultFile.findOne({ courseCode, teacherName }).lean();
    if (anyTeacherVault && anyTeacherVault.section && anyTeacherVault.section !== sectionCode) {
        console.log(`[VAULT] ⏭️  Teacher ${teacherName} already covered by section ${anyTeacherVault.section}`);
        return;
    }

    try {
        const vaultResult = await uploadVaultToB2(buffer, ext, fileName, courseCode, teacherSlug);
        if (!vaultResult) return;

        await CourseVaultFile.create({
            courseCode, courseName, teacherName,
            section: sectionCode, uploadedBy: userId,
            fileName: fileName.replace(ext, vaultResult.finalExt),
            normalizedFileName: normalized,
            originalFileName: fileName,
            b2Key: vaultResult.b2Key,
            fileType: vaultResult.finalExt.replace('.', ''),
            fileSize: vaultResult.fileSize,
            isConverted: vaultResult.isConverted
        });
        console.log(`[VAULT] ✅ Stored: ${fileName} → ${vaultResult.finalExt} (teacher: ${teacherName})`);
    } catch (err) {
        if (err.code === 11000) {
            console.log(`[VAULT] Duplicate caught by index: ${fileName}`);
        } else {
            console.error(`[VAULT] Failed to store ${fileName}:`, err.message);
        }
    }
}

/**
 * Process a ZIP file: extract contents, process each entry individually.
 */
async function processZipFile({ buffer, fileName, courseCode, courseName, sectionCode, teacherName, userId, portalUrl }) {
    const normalized = normalizeFileName(fileName);

    // Store the ZIP itself in Course Material as-is
    const materialExists = await CourseMaterial.exists({ sectionCode, normalizedFileName: normalized });
    if (!materialExists) {
        try {
            const b2Key = await uploadMaterialToB2(buffer, courseCode, sectionCode, fileName);
            await CourseMaterial.create({
                userId, courseCode, courseName, sectionCode, teacherName,
                fileName, normalizedFileName: normalized,
                b2Key, fileType: 'zip', fileSize: buffer.length,
                originalPortalUrl: portalUrl
            });
        } catch (err) {
            if (err.code !== 11000) console.error(`[MATERIAL] ZIP store failed: ${err.message}`);
        }
    }

    // Extract and process each contained file
    let entries;
    try {
        entries = await extractZipBuffer(buffer);
    } catch (err) {
        console.warn(`[MATERIAL] ZIP extraction failed for ${fileName}: ${err.message}`);
        return;
    }

    for (const entry of entries) {
        const entryExt = getExtension(entry.name);
        if (entryExt === '.rar' || entryExt === '.zip') continue; // skip nested archives

        // Upload extracted file to Course Material with parentArchive marker
        const entryNorm = normalizeFileName(entry.name);
        if (!entryNorm) continue;

        const entryMaterialExists = await CourseMaterial.exists({ sectionCode, normalizedFileName: entryNorm });
        if (!entryMaterialExists) {
            try {
                const b2Key = await uploadMaterialToB2(entry.buffer, courseCode, sectionCode, entry.name);
                await CourseMaterial.create({
                    userId, courseCode, courseName, sectionCode, teacherName,
                    fileName: entry.name, normalizedFileName: entryNorm,
                    b2Key, fileType: entryExt.replace('.', ''),
                    fileSize: entry.buffer.length, originalPortalUrl: portalUrl,
                    isArchiveExtracted: true, parentArchive: fileName
                });
            } catch (err) {
                if (err.code !== 11000) console.error(`[MATERIAL] ZIP entry store failed: ${err.message}`);
            }
        }

        // Also process for vault
        const teacherSlug = teacherName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
        const vaultExists = await CourseVaultFile.exists({ courseCode, teacherName, normalizedFileName: entryNorm });
        if (!vaultExists && entryExt !== '.rar') {
            try {
                const vaultResult = await uploadVaultToB2(entry.buffer, entryExt, entry.name, courseCode, teacherSlug);
                if (vaultResult) {
                    await CourseVaultFile.create({
                        courseCode, courseName, teacherName,
                        section: sectionCode, uploadedBy: userId,
                        fileName: entry.name.replace(entryExt, vaultResult.finalExt),
                        normalizedFileName: entryNorm, originalFileName: entry.name,
                        b2Key: vaultResult.b2Key, fileType: vaultResult.finalExt.replace('.', ''),
                        fileSize: vaultResult.fileSize, isConverted: vaultResult.isConverted,
                        isArchiveExtracted: true, parentArchive: fileName
                    });
                }
            } catch (err) {
                if (err.code !== 11000) console.error(`[VAULT] ZIP entry vault failed: ${err.message}`);
            }
        }
    }
}

// ── Main Processor ─────────────────────────────────────────────────────────────

/**
 * processUserMaterials(userId, cookieString)
 *
 * Called immediately after extension-sync receives materialLinksData.
 * Runs in background. cookieString MUST be the current live session cookie.
 */
async function processUserMaterials(userId, cookieString) {
    const userIdStr = userId.toString();
    console.log(`[MATERIAL_PROC] 🚀 Starting for user ${userIdStr}`);

    try {
        const pendingLinks = await MaterialLink.find({ userId: userIdStr, processed: false }).lean();
        if (pendingLinks.length === 0) {
            console.log(`[MATERIAL_PROC] No pending link sets for ${userIdStr}`);
            return;
        }

        console.log(`[MATERIAL_PROC] Found ${pendingLinks.length} course link sets to process`);

        for (const linkSet of pendingLinks) {
            const { courseUrl, courseName, courseCode, sectionCode, teacherName, links } = linkSet;

            if (!sectionCode || !courseCode || !links || links.length === 0) {
                await MaterialLink.findByIdAndUpdate(linkSet._id, { processed: true, processedAt: new Date() });
                continue;
            }

            console.log(`[MATERIAL_PROC] 📂 Processing: ${courseCode} (${sectionCode}) — ${links.length} links`);

            for (const link of links) {
                if (!link.downloadUrl || !link.fileName) continue;

                const ext = getExtension(link.fileName);

                // Download the file using the live session cookie
                let buffer;
                try {
                    buffer = await downloadPortalFile(link.downloadUrl, cookieString);
                } catch (err) {
                    if (err.message === 'SESSION_EXPIRED') {
                        console.warn(`[MATERIAL_PROC] ⚠️ Session expired. Stopping processing.`);
                        return; // Cookie dead — stop everything
                    }
                    console.warn(`[MATERIAL_PROC] Download failed for ${link.fileName}: ${err.message}`);
                    continue;
                }

                console.log(`[MATERIAL_PROC] ⬇️  Downloaded: ${link.fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);

                // Route by file type
                if (ext === '.zip') {
                    await processZipFile({
                        buffer, fileName: link.fileName,
                        courseCode, courseName, sectionCode, teacherName,
                        userId: userIdStr, portalUrl: link.downloadUrl
                    });
                } else {
                    // Includes RAR, PDF, DOCX, PPTX, and all others
                    await processOneFile({
                        buffer, fileName: link.fileName, ext,
                        courseCode, courseName, sectionCode, teacherName,
                        userId: userIdStr, portalUrl: link.downloadUrl
                    });
                }

                // Be gentle with the portal server
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_FILES));
            }

            // Mark this link set as processed
            await MaterialLink.findByIdAndUpdate(linkSet._id, {
                processed: true,
                processedAt: new Date()
            });

            console.log(`[MATERIAL_PROC] ✅ Done: ${courseCode} (${sectionCode})`);
        }

        console.log(`[MATERIAL_PROC] 🏁 Completed for user ${userIdStr}`);
    } catch (err) {
        console.error(`[MATERIAL_PROC] ❌ Unexpected error for user ${userIdStr}:`, err.message);
    }
}

/**
 * runMaterialSyncForAllUsers(getUserCookie)
 *
 * Used by the nightly cron. For each user, fetches fresh material links
 * from the portal (using stored cookie) then processes them.
 *
 * @param {Function} getUserCookie - async (userId) => cookieString from DB
 */
async function runNightlyMaterialSync(User, Course) {
    console.log('[NIGHTLY_MATERIAL] 🌙 Starting nightly material sync...');
    const cheerio = require('cheerio');
    try {
        const activeUsers = await User.find({ isPortalConnected: true, ucpCookie: { $exists: true, $ne: null } }).lean();
        console.log(`[NIGHTLY_MATERIAL] Found ${activeUsers.length} active users`);

        for (const user of activeUsers) {
            if (!user.ucpCookie) continue;

            try {
                // Scrape fresh material links for each of the user's courses
                const courses = await Course.find({ userId: user._id, type: 'university', portalUrl: { $exists: true, $ne: '' } }).lean();
                if (courses.length === 0) continue;

                console.log(`[NIGHTLY_MATERIAL] Fetching material links for ${user.email} (${courses.length} courses)`);

                for (const course of courses) {
                    const courseId = course.portalUrl.split('/').pop();
                    if (!courseId) continue;

                    try {
                        const controller = new AbortController();
                        const tid = setTimeout(() => controller.abort(), 15000);
                        const res = await fetch(`https://horizon.ucp.edu.pk/student/course/material/${courseId}`, {
                            headers: { 'Cookie': user.ucpCookie, 'User-Agent': 'Mozilla/5.0' },
                            signal: controller.signal
                        });
                        clearTimeout(tid);

                        if (!res.ok) continue;
                        const html = await res.text();
                        if (html.includes('/login')) {
                            console.warn(`[NIGHTLY_MATERIAL] Session expired for ${user.email}`);
                            break;
                        }

                        const $ = cheerio.load(html);
                        const links = [];
                        $('table tbody tr').each((_, row) => {
                            const tds = $(row).find('td');
                            if (tds.length >= 4) {
                                const fileName = $(tds[1]).text().replace(/\s+/g, ' ').trim();
                                const description = $(tds[2]).text().replace(/\s+/g, ' ').trim();
                                const href = $(tds[3]).find('a').attr('href') || '';
                                if (href.includes('/student/class/material/download/')) {
                                    const fullUrl = href.startsWith('http') ? href : `https://horizon.ucp.edu.pk${href}`;
                                    links.push({ fileName, description, downloadUrl: fullUrl, token: href.split('/').pop() });
                                }
                            }
                        });

                        if (links.length > 0) {
                            await MaterialLink.findOneAndUpdate(
                                { userId: user._id, courseUrl: course.portalUrl },
                                {
                                    $set: {
                                        courseName: course.name, courseCode: course.code,
                                        sectionCode: course.section, teacherName: (course.instructors || [])[0] || '',
                                        links, lastScrapedAt: new Date(), processed: false
                                    }
                                },
                                { upsert: true }
                            );
                        }
                    } catch (e) {
                        console.warn(`[NIGHTLY_MATERIAL] Failed course ${course.code}:`, e.message);
                    }

                    await new Promise(r => setTimeout(r, 1000));
                }

                // Process the freshly staged links immediately using stored cookie
                await processUserMaterials(user._id.toString(), user.ucpCookie);
            } catch (err) {
                console.error(`[NIGHTLY_MATERIAL] Error for ${user.email}:`, err.message);
            }

            // Delay between users
            await new Promise(r => setTimeout(r, 5000));
        }

        console.log('[NIGHTLY_MATERIAL] ✅ Nightly material sync complete.');
    } catch (err) {
        console.error('[NIGHTLY_MATERIAL] Fatal error:', err.message);
    }
}

module.exports = { processUserMaterials, runNightlyMaterialSync };
