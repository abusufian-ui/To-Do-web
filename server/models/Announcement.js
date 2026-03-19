const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseUrl: { type: String, required: true },
    courseName: { type: String, required: true },
    news: [{
        subject: String,
        date: String,
        description: String
    }],
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);