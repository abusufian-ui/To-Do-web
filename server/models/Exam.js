// models/Exam.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  courseName: { 
    type: String, 
    required: true 
  },
  instructor: { 
    type: String 
  },
  date: { 
    type: String, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  venue: { 
    type: String, 
    default: 'TBA' 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Exam', examSchema);