const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseName: { type: String, required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Quiz', 'Assignment', 'Class Participation', 'Project', 'Presentation', 'Other'], 
    default: 'Quiz' 
  },
  dueDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Submitted', 'Graded', 'Missed'], 
    default: 'Pending' 
  },
  isManual: { type: Boolean, default: true }
}, { timestamps: true });

assessmentSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);