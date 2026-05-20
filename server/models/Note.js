const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true }, 
  title: { type: String, required: true },
  content: { type: String, required: true },
  referenceFiles: [{ fileName: String, fileUrl: String }],
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isPrivate: { type: Boolean, default: false },
  
  // 👥 Multi-user Group Workspace Fields
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  deletedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // 🌍 Community Sharing / Inbox Fields
  isInbox: { type: Boolean, default: false },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);