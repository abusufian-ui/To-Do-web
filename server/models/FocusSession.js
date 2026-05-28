// --- models/FocusSession.js (New File Idea) ---
const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  durationMinutes: { type: Number, required: true }, // e.g., 25, 50
  type: { type: String, enum: ['focus', 'short_break', 'long_break'], required: true },
  relatedCourse: { type: String }, // Optional: link to a specific subject
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FocusSession', focusSessionSchema);