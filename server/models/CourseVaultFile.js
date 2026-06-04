const mongoose = require('mongoose');

const CourseVaultFileSchema = new mongoose.Schema({
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  teacherName: { type: String, required: true },
  section: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileName: { type: String, required: true },
  normalizedFileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Cloudinary URL
  fileType: { type: String }, // e.g. pdf, docx, pptx
  createdAt: { type: Date, default: Date.now }
});

// Compound index to speed up checks and keep entries clean
CourseVaultFileSchema.index({ courseCode: 1, teacherName: 1, normalizedFileName: 1 }, { unique: true });

module.exports = mongoose.model('CourseVaultFile', CourseVaultFileSchema);
