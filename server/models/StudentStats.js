const mongoose = require('mongoose');

const studentStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cgpa: { type: String, default: "0.00" },
  credits: { type: String, default: "0" },
  inprogressCr: { type: String, default: "0" },
  lastUpdated: { type: Date, default: Date.now }
});

// Ensures each user has exactly one stats record
studentStatsSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('StudentStats', studentStatsSchema);