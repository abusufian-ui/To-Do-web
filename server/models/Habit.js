const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['good', 'bad'], required: true },
  
  
  category: { 
    type: String, 
    enum: ['academic', 'health', 'spiritual', 'social', 'financial', 'productivity', 'custom'],
    default: 'custom' 
  },
  icon: { type: String, default: '🎯' },
  color: { type: String, default: '#3B82F6' },
  
  
  scheduleDays: {
    type: [Number], 
    default: [0, 1, 2, 3, 4, 5, 6]
  },
  
  
  frequency: { type: String, default: 'daily' }, 
  targetPerDay: { type: Number, default: 1 },
  targetPerWeek: { type: Number, default: 7 }, 
  checkIns: [{ type: Date }],
  
  
  strategy: { type: String, default: 'cold_turkey' }, 
  allowancePerWeek: { type: Number, default: 0 }, 
  cheatDays: [{ type: Date }], 
  startDate: { type: Date, default: Date.now },
  replacement: { type: String, default: '' },
  
  
  journal: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['note', 'relapse', 'milestone'] },
    content: { type: String },
    trigger: { type: String }
  }],
  
  
  milestones: [{
    days: Number,
    achievedAt: Date,
    celebrated: { type: Boolean, default: false }
  }],
  
  longestStreak: { type: Number, default: 0 },
  totalRelapses: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  archivedAt: { type: Date, default: null },
  
  
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Habit', habitSchema);