
const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  durationMinutes: { type: Number, required: true }, 
  type: { type: String, enum: ['focus', 'short_break', 'long_break'], required: true },
  relatedCourse: { type: String }, 
  completedAt: { type: Date, default: Date.now }
});

focusSessionSchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);