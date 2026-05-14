const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true }, // Fixed: Now expects a single string
  title: { type: String, required: true },
  content: { type: String, required: true },
  referenceFiles: [{ fileName: String, fileUrl: String }],
  source: { type: String, enum: ['web', 'mobile'], default: 'web' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isPrivate: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);