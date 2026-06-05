const mongoose = require('mongoose');

const CourseMaterialSchema = new mongoose.Schema({
    // Attribution — which user's scrape seeded this file
    userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },

    // Classification
    courseCode:         { type: String, required: true },   // full code e.g. CSAL-3253-B1
    courseName:         { type: String, default: '' },
    sectionCode:        { type: String, required: true },   // e.g. B1
    teacherName:        { type: String, default: '' },

    // File identity
    fileName:           { type: String, required: true },   // original name shown on portal
    normalizedFileName: { type: String, required: true },   // lowercased, stripped special chars

    // Storage — BackBlaze B2
    b2Key:              { type: String, default: '' },      // full B2 object key
    fileType:           { type: String, default: '' },      // pdf, docx, pptx, zip, rar, etc.
    fileSize:           { type: Number, default: 0 },       // bytes

    // Portal origin
    originalPortalUrl:  { type: String, default: '' },      // portal download URL at scrape time

    // Archive handling
    isArchiveExtracted: { type: Boolean, default: false },  // true = extracted from zip/rar
    parentArchive:      { type: String, default: '' },      // parent zip/rar filename

    createdAt:          { type: Date, default: Date.now }
});

// PRIMARY dedup guard: only one record per file per section (across all users)
CourseMaterialSchema.index({ sectionCode: 1, normalizedFileName: 1 }, { unique: true });

// Quick lookup by section+course
CourseMaterialSchema.index({ courseCode: 1, sectionCode: 1 });
CourseMaterialSchema.index({ userId: 1, courseCode: 1 });

module.exports = mongoose.model('CourseMaterial', CourseMaterialSchema);
