const mongoose = require('mongoose');

const CourseVaultBucketSchema = new mongoose.Schema({
    name: { type: String, required: true },           // e.g. "Midterm Prep", "Week 1"
    courseCode: { type: String, required: true },     // The course this bucket belongs to
    teacherName: { type: String, default: '' },       // Optional: Tie it to a specific teacher
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who created it
    createdAt: { type: Date, default: Date.now }
});

// Fast lookup by course
CourseVaultBucketSchema.index({ courseCode: 1 });

module.exports = mongoose.model('CourseVaultBucket', CourseVaultBucketSchema);
