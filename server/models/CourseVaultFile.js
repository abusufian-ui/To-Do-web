const mongoose = require('mongoose');

const CourseVaultFileSchema = new mongoose.Schema({
    courseCode:         { type: String, required: true },
    courseName:         { type: String, required: true },
    teacherName:        { type: String, required: true },
    section:            { type: String, default: '' },
    uploadedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Moderation and Organization
    status:             { type: String, enum: ['pending', 'published'], default: 'pending' },
    bucketId:           { type: mongoose.Schema.Types.ObjectId, ref: 'CourseVaultBucket' },

    // File identity
    fileName:           { type: String, required: true },           // display name (may be .pdf even if converted)
    normalizedFileName: { type: String, required: true },           // normalized original name (pre-conversion)
    originalFileName:   { type: String, default: '' },              // pre-conversion original name

    // Storage — BackBlaze B2 (PDFs only in vault)
    b2Key:              { type: String, required: true },           // full B2 object key
    fileType:           { type: String, default: 'pdf' },           // always 'pdf' in vault
    fileSize:           { type: Number, default: 0 },               // bytes

    // Conversion tracking
    isConverted:        { type: Boolean, default: false },          // was DOCX/PPTX converted to PDF?
    isArchiveExtracted: { type: Boolean, default: false },          // came from inside a zip?
    parentArchive:      { type: String, default: '' },              // zip name if extracted

    createdAt:          { type: Date, default: Date.now }
});

// Compound dedup: one file per teacher per course (across all sections)
CourseVaultFileSchema.index(
    { courseCode: 1, teacherName: 1, normalizedFileName: 1 },
    { unique: true }
);

// Fast lookup by course code
CourseVaultFileSchema.index({ courseCode: 1, teacherName: 1 });

module.exports = mongoose.model('CourseVaultFile', CourseVaultFileSchema);
