const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // <--- ADD THIS
  name: { type: String, required: true },
  description: { type: String, default: '' },
  course: { type: String, default: 'General' },
  date: { type: String, default: '' },
  
  // --- ADDED THIS FIELD ---
  time: { type: String, default: null }, 
  
  priority: { type: String, default: 'Medium' },
  status: { type: String, default: 'New task' },
  completed: { type: Boolean, default: false },
  subTasks: [{
    text: String,
    completed: { type: Boolean, default: false }
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);