const mongoose = require('mongoose');

// Short-lived broker that links a web onboarding session (which knows the typed email) to the
// extension's first scrape when the URL fragment carrying the sync id is lost during the
// Horizon/Microsoft-SSO redirect. One row per email; auto-expires after 15 minutes via TTL index.
const pendingSyncSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  tempSyncId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 15 } // TTL: 15 minutes
});

module.exports = mongoose.model('PendingSync', pendingSyncSchema);
