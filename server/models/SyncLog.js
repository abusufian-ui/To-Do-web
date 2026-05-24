const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portalId: { type: String, required: true },
  mode: { type: String, required: true }, // e.g. FULL, BACKGROUND, CRON_ATTENDANCE
  status: { type: String, required: true, enum: ['PENDING', 'SUCCESS', 'FAILED'] },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationMs: { type: Number },
  error: { type: String },
  changesSummary: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('SyncLog', syncLogSchema);
