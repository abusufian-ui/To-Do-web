const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseUrl: { type: String, required: true }, 
  courseName: { type: String, default: "Unknown Course" },
  
  summary: {
    conducted: { type: Number, default: 0 },
    attended: { type: Number, default: 0 },
    percentage: { type: String, default: "0" }
  },
  
  records: [
    {
      date: String,
      status: String // Usually 'Present' or 'Absent'
    }
  ],
  
  lastUpdated: { type: Date, default: Date.now }
});

// COMPOUND INDEX: Ensures a courseUrl is unique ONLY per user
attendanceSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);