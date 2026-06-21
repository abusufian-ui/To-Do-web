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

    semester:           { type: String, required: true },   // e.g. fall 26, spring 26
    sequenceNumber:     { type: Number },

    createdAt:          { type: Date, default: Date.now }
});

// PRIMARY dedup guard: only one record per file per course per section per semester
CourseMaterialSchema.index({ courseCode: 1, sectionCode: 1, normalizedFileName: 1, semester: 1 }, { unique: true });

// Quick lookup indexes
CourseMaterialSchema.index({ courseCode: 1, sectionCode: 1, semester: 1 });
CourseMaterialSchema.index({ userId: 1, courseCode: 1 });

// DELETION HOOKS: Automate Backblaze B2 file cleanup
CourseMaterialSchema.pre('findOneAndDelete', async function() {
    try {
        const doc = await this.model.findOne(this.getQuery()).lean();
        if (doc && doc.b2Key) {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            const { b2, B2_BUCKET } = require('../utils/b2Client');
            const command = new DeleteObjectCommand({
                Bucket: B2_BUCKET,
                Key: doc.b2Key
            });
            await b2.send(command);
            console.log(`[B2_CLEANUP] findOneAndDelete pre-hook deleted B2 file: ${doc.b2Key}`);
        }
    } catch (err) {
        console.error('[B2_CLEANUP] findOneAndDelete pre-hook B2 deletion failed:', err.message);
    }
});

CourseMaterialSchema.pre('deleteOne', { document: true, query: false }, async function() {
    try {
        if (this.b2Key) {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            const { b2, B2_BUCKET } = require('../utils/b2Client');
            const command = new DeleteObjectCommand({
                Bucket: B2_BUCKET,
                Key: this.b2Key
            });
            await b2.send(command);
            console.log(`[B2_CLEANUP] deleteOne document pre-hook deleted B2 file: ${this.b2Key}`);
        }
    } catch (err) {
        console.error('[B2_CLEANUP] deleteOne document pre-hook B2 deletion failed:', err.message);
    }
});

module.exports = mongoose.model('CourseMaterial', CourseMaterialSchema);

