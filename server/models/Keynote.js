const mongoose = require('mongoose');

const KeynoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, default: 'General' },
  title: { type: String, default: 'Quick Note' },
  type: { type: String, enum: ['text', 'image', 'audio'], required: true },
  content: { type: String, required: true }, // Text content OR file URL
  isRead: { type: Boolean, default: false }, // For the Inbox badge
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Keynote', KeynoteSchema);