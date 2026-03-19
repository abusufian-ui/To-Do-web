const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseUrl: { type: String, required: true },
    courseName: { type: String, required: true },
    summary: {
        conducted: { type: Number, default: 0 },
        attended: { type: Number, default: 0 }
    },
    records: [{
        date: String,
        status: String
    }],
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);