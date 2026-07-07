const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  portalId: { type: String, required: true },
  mode: { type: String, required: true, enum: ['AUTO_SYNC', 'LOGIN_SYNC', 'FORCE_SYNC', 'SUBMISSIONS_SYNC', 'MANUAL_FULL', 'BACKGROUND_SYNC', 'HIGH', 'FULL', 'BACKGROUND'] }, 
  status: { type: String, required: true, enum: ['PENDING', 'SUCCESS', 'FAILED'] },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationMs: { type: Number },
  error: { type: String },
  changesSummary: { type: mongoose.Schema.Types.Mixed },
  syncSource: { type: String, default: 'unknown' }
});


syncLogSchema.post('save', async function(doc) {
  try {
    const SyncLog = mongoose.model('SyncLog');
    const logs = await SyncLog.find({ userId: doc.userId }).sort({ startTime: -1 }).select('_id');
    if (logs.length > 20) {
      const idsToDelete = logs.slice(20).map(log => log._id);
      await SyncLog.deleteMany({ _id: { $in: idsToDelete } });
    }
  } catch (err) {
    console.error('Error auto-pruning SyncLogs:', err.message);
  }
});

module.exports = mongoose.model('SyncLog', syncLogSchema);
