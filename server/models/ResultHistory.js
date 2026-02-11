const mongoose = require('mongoose');

const resultHistorySchema = new mongoose.Schema({
  term: { type: String, required: true, unique: true }, // e.g. "Fall 2023"
  gradePoints: String,
  cumulativeGP: String,
  attemptedCH: String,
  earnedCH: String,
  cumulativeCH: String,
  sgpa: String,
  cgpa: String,
  courses: [{
    name: String,
    creditHours: String,
    gradePoints: String,
    finalGrade: String
  }],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResultHistory', resultHistorySchema);