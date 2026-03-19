const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseUrl: { type: String, required: true }, 
  courseName: { type: String, default: "Unknown Course" },
  
  news: [
    {
      subject: String,
      date: String,
      description: String
    }
  ],
  
  lastUpdated: { type: Date, default: Date.now }
});

// COMPOUND INDEX: Ensures a courseUrl is unique ONLY per user
announcementSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });

module.exports = mongoose.model('Announcement', announcementSchema);