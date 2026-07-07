const crypto = require('crypto');

// Authenticated encryption (AES-256-GCM). Unlike the previous aes-256-ctr
// implementation, GCM detects tampering: decrypt() throws if the ciphertext or
// IV has been modified. A SHA-256 pass derives a fixed 32-byte key regardless
// of the raw ENCRYPTION_KEY length/encoding.
const RAW_KEY = process.env.ENCRYPTION_KEY;
if (!RAW_KEY || Buffer.from(RAW_KEY).length < 32) {
  throw new Error('FATAL: ENCRYPTION_KEY must be set in .env and be at least 32 characters long.');
}
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest(); // 32 bytes

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce size

const encrypt = (text) => {
  if (text === null || text === undefined) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Versioned format: v2:iv:tag:ciphertext (hex)
  return `v2:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

// Legacy aes-256-ctr decryption for values written before the GCM migration.
const decryptLegacyCtr = (text) => {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  // The old code used the raw key bytes directly (first 32 bytes).
  const legacyKey = Buffer.from(process.env.ENCRYPTION_KEY).subarray(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-ctr', legacyKey, iv);
  return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
};

const decrypt = (text) => {
  if (!text) return null;
  if (text.startsWith('v2:')) {
    const [, ivHex, tagHex, dataHex] = text.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex')); // throws on tamper
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  }
  // Backward compatibility: transparently read old aes-256-ctr blobs.
  return decryptLegacyCtr(text);
};

module.exports = { encrypt, decrypt };
