const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// BackBlaze B2 is S3-compatible — we use the AWS SDK v3
const B2_KEY_ID = process.env.B2_KEY_ID || 'cdfb0a4cfaaf';
const B2_APP_KEY = process.env.B2_APP_KEY || '003f60a1064fbbe459faebfe0d94199bfd056fb7d2';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'eu-central-003';
const B2_BUCKET = process.env.B2_BUCKET_NAME || 'myportal-large-data';

const b2 = new S3Client({
    endpoint: B2_ENDPOINT,
    region: B2_REGION,
    credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APP_KEY
    },
    // Force path-style since B2 doesn't support virtual-hosted-style URLs
    forcePathStyle: true
});

/**
 * Upload a Buffer to BackBlaze B2.
 * Uses multipart upload for large files automatically.
 * @param {string} key - The B2 object key (path inside bucket)
 * @param {Buffer} buffer - File content
 * @param {string} contentType - MIME type
 * @param {Object} metadata - Optional metadata key-value pairs
 * @returns {{ url: string, key: string }}
 */
async function uploadToB2(key, buffer, contentType = 'application/octet-stream', metadata = {}) {
    const upload = new Upload({
        client: b2,
        params: {
            Bucket: B2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata
        },
        // Multipart threshold: 5MB
        partSize: 5 * 1024 * 1024,
        queueSize: 2
    });

    await upload.done();

    // Return a reference — use getSignedDownloadUrl() for actual access
    return {
        key,
        bucket: B2_BUCKET
    };
}

/**
 * Generate a pre-signed download URL for a B2 object.
 * Valid for `expiresIn` seconds (default 3600 = 1 hour).
 */
async function getSignedDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: B2_BUCKET,
        Key: key
    });
    return getSignedUrl(b2, command, { expiresIn });
}

/**
 * Get MIME type from file extension.
 */
function getMimeType(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const types = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ppt: 'application/vnd.ms-powerpoint',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        xls: 'application/vnd.ms-excel',
        zip: 'application/zip',
        rar: 'application/x-rar-compressed',
        txt: 'text/plain',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        mp4: 'video/mp4',
        mp3: 'audio/mpeg'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Normalize a filename for deduplication checks.
 * Removes special chars, lowercases, preserves extension.
 */
function normalizeFileName(filename) {
    if (!filename) return '';
    return filename.toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/\s+/g, '');
}

/**
 * Download a file from BackBlaze B2 and return a Buffer.
 */
async function downloadFileFromB2(key) {
    const command = new GetObjectCommand({
        Bucket: B2_BUCKET,
        Key: key
    });
    const response = await b2.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = { b2, uploadToB2, getSignedDownloadUrl, getMimeType, normalizeFileName, downloadFileFromB2, B2_BUCKET };
