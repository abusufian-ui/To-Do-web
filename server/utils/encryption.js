// server/utils/encryption.js
const crypto = require('crypto');

// usage: const { encrypt, decrypt } = require('./utils/encryption');

const ALGORITHM = 'aes-256-ctr';
// IMPORTANT: In production, put this in a .env file (e.g. ENCRYPTION_KEY=...)
// It must be exactly 32 characters long.
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'; 
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text) return null;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

module.exports = { encrypt, decrypt };