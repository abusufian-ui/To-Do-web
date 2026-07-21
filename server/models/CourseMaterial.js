const mongoose = require('mongoose');

const CourseMaterialSchema = new mongoose.Schema({
    
    userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },

    
    courseCode:         { type: String, required: true },   
    courseName:         { type: String, default: '' },
    sectionCode:        { type: String, required: true },   
    teacherName:        { type: String, default: '' },

    
    fileName:           { type: String, required: true },   
    normalizedFileName: { type: String, required: true },   

    
    b2Key:              { type: String, default: '' },      
    fileType:           { type: String, default: '' },      
    fileSize:           { type: Number, default: 0 },       

    
    originalPortalUrl:  { type: String, default: '' },      

    
    isArchiveExtracted: { type: Boolean, default: false },  
    parentArchive:      { type: String, default: '' },      

    semester:           { type: String, required: true },   
    sequenceNumber:     { type: Number },

    createdAt:          { type: Date, default: Date.now }
});


CourseMaterialSchema.index({ courseCode: 1, sectionCode: 1, normalizedFileName: 1, semester: 1 }, { unique: true });


CourseMaterialSchema.index({ courseCode: 1, sectionCode: 1, semester: 1 });
CourseMaterialSchema.index({ userId: 1, courseCode: 1 });
CourseMaterialSchema.index({ courseCode: 1, b2Key: 1 });
CourseMaterialSchema.index({ courseName: 1 });
CourseMaterialSchema.index({ b2Key: 1 });



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

