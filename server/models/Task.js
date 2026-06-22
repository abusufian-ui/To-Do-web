const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, 
  name: { type: String, required: true },
  description: { type: String, default: '' },
  course: { type: String, default: 'General' },
  date: { type: String, default: '' },
  time: { type: String, default: null }, 
  triggerAt: { type: Date, default: null }, 
  priority: { type: String, default: 'Medium' },
  status: { type: String, default: 'New task' }, 
  completed: { type: Boolean, default: false },
  acknowledged: { type: Boolean, default: false }, 
  subTasks: [{
    text: String,
    completed: { type: Boolean, default: false }
  }],
  isDeleted: { type: Boolean, default: false, index: true }, 
  deletedAt: { type: Date, default: null },
  isPrivate: { type: Boolean, default: false },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null, index: true },
  deletedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  memberStatuses: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);