const mongoose = require('mongoose');

const resultHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  term: { type: String, required: true }, // REMOVED "unique: true" from here
  sgpa: { type: String, default: "0.00" },
  cgpa: { type: String, default: "0.00" },
  earnedCH: { type: String, default: "0" },
  courses: [
    {
      name: String,
      creditHours: String,
      gradePoints: String,
      finalGrade: String
    }
  ],
  lastUpdated: { type: Date, default: Date.now }
});

// COMPOUND INDEX: This is the magic fix.
// It ensures 'term' is unique ONLY within the same 'userId'.
resultHistorySchema.index({ userId: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('ResultHistory', resultHistorySchema);