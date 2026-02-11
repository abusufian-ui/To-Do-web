const mongoose = require('mongoose');

const studentStatsSchema = new mongoose.Schema({
  cgpa: { type: String, default: "0.00" },
  credits: { type: String, default: "0" }, // Earned Cr
  inprogressCr: { type: String, default: "0" }, // <--- NEW FIELD
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentStats', studentStatsSchema);