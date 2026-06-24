'use strict';

const Submission = require('../models/Submission');
const { uploadToB2 } = require('../utils/b2Client');

const DOWNLOAD_TIMEOUT_MS = 60000;

/**
 * Downloads a submission file from UCP Portal and extracts its filename from the response headers.
 */
async function downloadSubmissionFile(url, cookieString) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} downloading ${url}`);
        }

        const finalUrl = response.url || '';
        if (finalUrl.includes('/login') || finalUrl.includes('/web/login')) {
            throw new Error('SESSION_EXPIRED');
        }

        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'attachment';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename\*?=["']?([^"';]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1].replace(/UTF-8''/i, ''));
            } else {
                const match2 = contentDisposition.match(/filename=(.+)/i);
                if (match2 && match2[1]) {
                    filename = match2[1].trim().replace(/['"]/g, '');
                }
            }
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return { buffer, filename };
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
}

/**
 * Iterates through a user's submissions, downloads any pending task attachments,
 * uploads them to Backblaze B2, and updates the database records.
 */
async function processUserSubmissions(userId, cookieString) {
    const userIdStr = userId.toString();
    console.log(`[SUBMISSION_PROC] 🚀 Starting for user ${userIdStr}`);

    try {
        const submissions = await Submission.find({ userId: userIdStr });
        if (!submissions || submissions.length === 0) {
            console.log(`[SUBMISSION_PROC] No submissions found for ${userIdStr}`);
            return;
        }

        let sessionExpired = false;

        for (const subDoc of submissions) {
            if (sessionExpired) return;

            let updated = false;

            for (const task of subDoc.tasks) {
                if (sessionExpired) return;
                if (!task.attachmentUrl || task.b2Key) continue;

                console.log(`[SUBMISSION_PROC] Found task attachment to process: "${task.title}" -> ${task.attachmentUrl}`);

                try {
                    const { buffer, filename } = await downloadSubmissionFile(task.attachmentUrl, cookieString);
                    
                    const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const b2Key = `submissions/${userIdStr}/${task._id}_${cleanName}`;
                    
                    console.log(`[SUBMISSION_PROC] Uploading to B2: ${b2Key}`);
                    await uploadToB2(b2Key, buffer, getMimeType(cleanName));

                    task.b2Key = b2Key;
                    task.fileSize = buffer.length;
                    task.fileType = cleanName.split('.').pop() || '';
                    updated = true;
                    
                    console.log(`[SUBMISSION_PROC] Successfully uploaded and updated task: "${task.title}"`);
                } catch (err) {
                    if (err.message === 'SESSION_EXPIRED') {
                        console.warn(`[SUBMISSION_PROC] ⚠️ Session expired. Stopping.`);
                        sessionExpired = true;
                        return;
                    }
                    console.error(`[SUBMISSION_PROC] Failed to process attachment for "${task.title}":`, err.message);
                }
            }

            if (updated) {
                await subDoc.save();
                console.log(`[SUBMISSION_PROC] Saved submission document for course: ${subDoc.courseName}`);
            }
        }
    } catch (err) {
        console.error('[SUBMISSION_PROC] Error in processor:', err.message);
    }
}

/**
 * Maps common file extensions to MIME types (fallback to application/octet-stream)
 */
function getMimeType(filename) {
    const ext = ('.' + (filename.split('.').pop() || '')).toLowerCase();
    const mimes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.zip': 'application/zip',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    return mimes[ext] || 'application/octet-stream';
}

module.exports = { processUserSubmissions };
