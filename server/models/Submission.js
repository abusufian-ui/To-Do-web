const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseUrl: { type: String, required: true },
    courseName: { type: String, required: true },
    tasks: [{
    title: String,
    description: String,
    startDate: String,
    dueDate: String,
    status: { type: String, default: 'Pending' },
    attachmentUrl: String,  // <-- ADD THIS
    submissionUrl: String   // <-- ADD THIS
}],
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);