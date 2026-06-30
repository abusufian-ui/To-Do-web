const mongoose = require('mongoose');

const ScraperHealthSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scraperName: { type: String, required: true },
  error: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScraperHealth', ScraperHealthSchema);
