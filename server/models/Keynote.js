const mongoose = require('mongoose');

const KeynoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, default: 'General' },
  title: { type: String, default: 'Quick Note' },
  type: { type: String, enum: ['text', 'image', 'audio', 'mixed'], required: true }, 
  content: { type: String }, 
  mediaUrls: { type: [String], default: [] }, 
  isRead: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },     
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Keynote', KeynoteSchema);