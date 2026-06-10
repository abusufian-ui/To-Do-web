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

const { uploadToB2, getMimeType, normalizeFileName, downloadFileFromB2 } = require('../utils/b2Client');
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
    const unique = Math.random().toString(36).substring(2, 9);
    const tmpPath = path.join(TEMP_DIR, `${Date.now()}_${unique}_${safe}`);
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
    const unique = Math.random().toString(36).substring(2, 9);
    const tmpExtractDir = path.join(TEMP_DIR, `extract_${Date.now()}_${unique}`);
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
    sectionCode, teacherName, userId, portalUrl, semester
}) {
    const normalized = normalizeFileName(fileName);
    if (!normalized) return;

    const globalCourseCode = courseCode ? courseCode.split('-')[0].trim() : '';

    // ── Course Material: store original ──────────────────────────────────────
    const materialExists = await CourseMaterial.exists({ courseCode: globalCourseCode, normalizedFileName: normalized, semester });
    if (!materialExists) {
        try {
            const b2Key = await uploadMaterialToB2(buffer, globalCourseCode, sectionCode, fileName);
            await CourseMaterial.create({
                userId, courseCode: globalCourseCode, courseName, sectionCode, teacherName,
                fileName, normalizedFileName: normalized,
                b2Key, fileType: ext.replace('.', ''),
                fileSize: buffer.length, originalPortalUrl: portalUrl,
                isArchiveExtracted: false, semester
            });
            console.log(`[MATERIAL] ✅ Stored: ${fileName} (section: ${sectionCode}, semester: ${semester})`);
        } catch (err) {
            if (err.code === 11000) {
                console.log(`[MATERIAL] Duplicate caught by index: ${fileName}`);
            } else {
                console.error(`[MATERIAL] Failed to store ${fileName}:`, err.message);
            }
        }
    } else {
        console.log(`[MATERIAL] ⏭️  Exists in course/semester: ${fileName}`);
    }
}

/**
 * Process a ZIP file: extract contents, process each entry individually.
 */
async function processZipFile({ buffer, fileName, courseCode, courseName, sectionCode, teacherName, userId, portalUrl, semester }) {
    const normalized = normalizeFileName(fileName);
    const globalCourseCode = courseCode ? courseCode.split('-')[0].trim() : '';

    // Store the ZIP itself in Course Material as-is
    const materialExists = await CourseMaterial.exists({ courseCode: globalCourseCode, normalizedFileName: normalized, semester });
    if (!materialExists) {
        try {
            const b2Key = await uploadMaterialToB2(buffer, globalCourseCode, sectionCode, fileName);
            await CourseMaterial.create({
                userId, courseCode: globalCourseCode, courseName, sectionCode, teacherName,
                fileName, normalizedFileName: normalized,
                b2Key, fileType: 'zip', fileSize: buffer.length,
                originalPortalUrl: portalUrl, semester
            });
            console.log(`[MATERIAL] ✅ Stored ZIP: ${fileName} (section: ${sectionCode}, semester: ${semester})`);
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
        // Only extract and upload PDFs and convertible documents (doc, docx, ppt, pptx, xls, xlsx)
        if (entryExt !== '.pdf' && !CONVERTIBLE_EXTS.has(entryExt)) {
            continue;
        }

        // Upload extracted file to Course Material with parentArchive marker
        const entryNorm = normalizeFileName(entry.name);
        if (!entryNorm) continue;

        const entryMaterialExists = await CourseMaterial.exists({ courseCode: globalCourseCode, normalizedFileName: entryNorm, semester });
        if (!entryMaterialExists) {
            try {
                const b2Key = await uploadMaterialToB2(entry.buffer, globalCourseCode, sectionCode, entry.name);
                await CourseMaterial.create({
                    userId, courseCode: globalCourseCode, courseName, sectionCode, teacherName,
                    fileName: entry.name, normalizedFileName: entryNorm,
                    b2Key, fileType: entryExt.replace('.', ''),
                    fileSize: entry.buffer.length, originalPortalUrl: portalUrl,
                    isArchiveExtracted: true, parentArchive: fileName, semester
                });
                console.log(`[MATERIAL] ✅ Stored Extracted Doc: ${entry.name} from ZIP: ${fileName} (section: ${sectionCode})`);
            } catch (err) {
                if (err.code !== 11000) console.error(`[MATERIAL] ZIP entry store failed: ${err.message}`);
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
/**
 * Phase 2: Process newly created course materials for the vault.
 * Disabled: Course Vault functionality is removed.
 */
async function processVaultFilesForUser(userIdStr) {
    console.log(`[VAULT_PROC] 🚫 Course Vault sync is disabled.`);
    return;
}

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

        let sessionExpired = false;

        // Phase 1: Download and store all course materials (in parallel)
        await Promise.all(pendingLinks.map(async (linkSet) => {
            const { courseUrl, courseName, courseCode, sectionCode, teacherName, links, semester } = linkSet;

            if (!sectionCode || !courseCode || !links || links.length === 0) {
                await MaterialLink.findByIdAndUpdate(linkSet._id, { processed: true, processedAt: new Date() });
                return;
            }

            console.log(`[MATERIAL_PROC] 📂 Processing: ${courseCode} (${sectionCode}) — ${links.length} links`);

            const globalCourseCode = courseCode ? courseCode.split('-')[0].trim() : '';

            try {
                for (let i = 0; i < links.length; i += 5) {
                    if (sessionExpired) return;
                    const chunk = links.slice(i, i + 5);
                    await Promise.all(chunk.map(async (link) => {
                        if (sessionExpired) return;
                        if (!link.downloadUrl || !link.fileName) return;

                        // ── HIGH SPEED PRE-CHECK: Skip download if file exists ──
                        const normalized = normalizeFileName(link.fileName);
                        if (!normalized) return;

                        const fileExists = await CourseMaterial.exists({ courseCode: globalCourseCode, normalizedFileName: normalized, semester });
                        if (fileExists) {
                            console.log(`[MATERIAL_PROC] ⏭️ Fast-pass skip (exists): ${link.fileName}`);
                            // Mark this link as processed in MaterialLink subdocument
                            await MaterialLink.updateOne(
                                { _id: linkSet._id, "links.downloadUrl": link.downloadUrl },
                                { $set: { "links.$.processed": true } }
                            );
                            return;
                        }

                        const ext = getExtension(link.fileName);

                        let buffer;
                        try {
                            buffer = await downloadPortalFile(link.downloadUrl, cookieString);
                        } catch (err) {
                            if (err.message === 'SESSION_EXPIRED') {
                                console.warn(`[MATERIAL_PROC] ⚠️ Session expired. Stopping processing.`);
                                sessionExpired = true;
                                return;
                            }
                            console.warn(`[MATERIAL_PROC] Download failed for ${link.fileName}: ${err.message}`);
                            return;
                        }

                        console.log(`[MATERIAL_PROC] ⬇️ Downloaded: ${link.fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);

                        if (ext === '.zip') {
                            await processZipFile({
                                buffer, fileName: link.fileName,
                                courseCode, courseName, sectionCode, teacherName,
                                userId: userIdStr, portalUrl: link.downloadUrl, semester
                            });
                        } else {
                            await processOneFile({
                                buffer, fileName: link.fileName, ext,
                                courseCode, courseName, sectionCode, teacherName,
                                userId: userIdStr, portalUrl: link.downloadUrl, semester
                            });
                        }

                        // Mark this link as processed in MaterialLink subdocument
                        await MaterialLink.updateOne(
                            { _id: linkSet._id, "links.downloadUrl": link.downloadUrl },
                            { $set: { "links.$.processed": true } }
                        );
                    }));
                }
            } catch (err) {
                console.error(`[MATERIAL_PROC] Error in loop for ${courseCode}:`, err.message);
            }

            if (!sessionExpired) {
                // Mark this link set as processed
                await MaterialLink.findByIdAndUpdate(linkSet._id, {
                    processed: true,
                    processedAt: new Date()
                });
                console.log(`[MATERIAL_PROC] ✅ Done: ${courseCode} (${sectionCode})`);
            }
        }));

        // Phase 2: Process newly created course materials for the vault
        if (!sessionExpired) {
            await processVaultFilesForUser(userIdStr);
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
    const { getCurrentSemesterCode, parseSemesterFromCourseCode } = require('./scraperEngine');
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
                            const parsedSem = parseSemesterFromCourseCode(course.code);
                            const semester = parsedSem || getCurrentSemesterCode();
                            await MaterialLink.findOneAndUpdate(
                                { userId: user._id, courseUrl: course.portalUrl },
                                {
                                    $set: {
                                        courseName: course.name, courseCode: course.code,
                                        sectionCode: course.section, teacherName: (course.instructors || [])[0] || '',
                                        links, lastScrapedAt: new Date(), processed: false, semester
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

module.exports = { processUserMaterials, runNightlyMaterialSync, processVaultFilesForUser };
