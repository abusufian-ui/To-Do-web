const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseUrl: { type: String, required: true }, 
  courseName: { type: String, default: "Unknown Course" },
  
  tasks: [
    {
      title: String,
      description: String,
      startDate: String,
      dueDate: String,
      status: { type: String, default: 'Pending' }
    }
  ],
  
  lastUpdated: { type: Date, default: Date.now }
});

// COMPOUND INDEX: Ensures a courseUrl is unique ONLY per user
submissionSchema.index({ userId: 1, courseUrl: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);