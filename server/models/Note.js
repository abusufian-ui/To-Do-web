const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true }, // <-- CHANGED TO STRING
  title: { type: String, required: true },
  content: { type: String, required: true },
  referenceFiles: [{ fileName: String, fileUrl: String }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);