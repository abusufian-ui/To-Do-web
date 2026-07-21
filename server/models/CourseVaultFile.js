const mongoose = require('mongoose');

const CourseVaultFileSchema = new mongoose.Schema({
    courseCode:         { type: String, required: true },
    courseName:         { type: String, required: true },
    abbreviation:       { type: String, default: '' },
    displayName:        { type: String, default: '' },
    teacherName:        { type: String, default: '' },
    section:            { type: String, default: '' },
    uploadedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status:             { type: String, enum: ['pending', 'published'], default: 'published' },
    bucketId:           { type: mongoose.Schema.Types.ObjectId, ref: 'CourseVaultBucket' },

    category:           { type: String, enum: ['past_paper', 'lecture_note'], default: 'past_paper' },
    paperType:          { type: String, enum: ['mid_term', 'final_term', 'quiz', 'assignment', 'graded_lab', 'class_participation', 'other'], default: 'other' },
    contentHash:        { type: String, default: '', index: true },
    source:             { type: String, enum: ['local_seed', 'admin_upload', 'course_material', 'submission'], default: 'local_seed' },

    fileName:           { type: String, required: true },           
    normalizedFileName: { type: String, required: true },           
    originalFileName:   { type: String, default: '' },              

    b2Key:              { type: String, required: true },           
    fileType:           { type: String, default: 'pdf' },           
    fileSize:           { type: Number, default: 0 },               

    isConverted:        { type: Boolean, default: false },          
    isArchiveExtracted: { type: Boolean, default: false },          
    parentArchive:      { type: String, default: '' },              

    createdAt:          { type: Date, default: Date.now }
});

CourseVaultFileSchema.index({ courseName: 1, category: 1 });
CourseVaultFileSchema.index({ courseCode: 1, teacherName: 1 });

module.exports = mongoose.model('CourseVaultFile', CourseVaultFileSchema);

