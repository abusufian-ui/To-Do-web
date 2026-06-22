const mongoose = require('mongoose');

const CourseVaultFileSchema = new mongoose.Schema({
    courseCode:         { type: String, required: true },
    courseName:         { type: String, required: true },
    teacherName:        { type: String, required: true },
    section:            { type: String, default: '' },
    uploadedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    
    status:             { type: String, enum: ['pending', 'published'], default: 'pending' },
    bucketId:           { type: mongoose.Schema.Types.ObjectId, ref: 'CourseVaultBucket' },

    
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


CourseVaultFileSchema.index(
    { courseCode: 1, teacherName: 1, normalizedFileName: 1 },
    { unique: true }
);


CourseVaultFileSchema.index({ courseCode: 1, teacherName: 1 });

module.exports = mongoose.model('CourseVaultFile', CourseVaultFileSchema);
