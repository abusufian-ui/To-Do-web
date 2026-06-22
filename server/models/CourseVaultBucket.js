const mongoose = require('mongoose');

const CourseVaultBucketSchema = new mongoose.Schema({
    name: { type: String, required: true },           
    courseCode: { type: String, required: true },     
    teacherName: { type: String, default: '' },       
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    createdAt: { type: Date, default: Date.now }
});


CourseVaultBucketSchema.index({ courseCode: 1 });

module.exports = mongoose.model('CourseVaultBucket', CourseVaultBucketSchema);
