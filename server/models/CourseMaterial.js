const mongoose = require('mongoose');

const CourseMaterialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String }, // e.g. pdf, docx, pptx, etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CourseMaterial', CourseMaterialSchema);
