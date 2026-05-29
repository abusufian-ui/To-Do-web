const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['task', 'group', 'note', 'system', 'keynote', 'general', 'marks', 'attendance', 'submission', 'announcement', 'broadcast']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sender: {
    name: String,
    profilePic: String,
    id: mongoose.Schema.Types.ObjectId
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
