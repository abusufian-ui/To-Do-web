
const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  courseName: { type: String, required: true },
  instructor: { type: String, default: 'Unknown' },
  room: { type: String, default: 'Unknown' },
  color: { type: String, default: 'bg-blue-500' },
  isMakeup: { type: Boolean, default: false },
  expiresAt: { type: Date },
  lastUpdated: { type: Date, default: Date.now }
});


timetableSchema.index({ userId: 1, day: 1, startTime: 1, courseName: 1 }, { unique: true });


timetableSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TimetableModel', timetableSchema);  