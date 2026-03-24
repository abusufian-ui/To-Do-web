const mongoose = require('mongoose');

const namazSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateStr: { type: String, required: true },
  prayers: {
    fajr: { type: String, enum: ['locked', 'pending', 'offered', 'missed', 'qazah'], default: 'locked' },
    zuhr: { type: String, enum: ['locked', 'pending', 'offered', 'missed', 'qazah'], default: 'locked' },
    asr: { type: String, enum: ['locked', 'pending', 'offered', 'missed', 'qazah'], default: 'locked' },
    maghrib: { type: String, enum: ['locked', 'pending', 'offered', 'missed', 'qazah'], default: 'locked' },
    isha: { type: String, enum: ['locked', 'pending', 'offered', 'missed', 'qazah'], default: 'locked' }
  }
});

// THIS PREVENTS THE OVERWRITE ERROR
const NamazRecord = mongoose.models.NamazRecord || mongoose.model('NamazRecord', namazSchema);

module.exports = NamazRecord;