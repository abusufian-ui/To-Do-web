const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['good', 'bad'], required: true },
  
<<<<<<< HEAD
  // --- CATEGORIZATION (NEW) ---
  category: { 
    type: String, 
    enum: ['academic', 'health', 'spiritual', 'social', 'financial', 'productivity', 'custom'],
    default: 'custom' 
  },
  icon: { type: String, default: '🎯' },
  color: { type: String, default: '#3B82F6' },
  
  // --- SCHEDULING (NEW) ---
  scheduleDays: {
    type: [Number], 
    default: [0, 1, 2, 3, 4, 5, 6]
  },
  
  // --- GOOD HABIT CONFIG ---
  frequency: { type: String, default: 'daily' }, 
  targetPerDay: { type: Number, default: 1 },
=======
  // --- GOOD HABIT CONFIG ---
  frequency: { type: String, default: 'daily' }, 
  targetPerDay: { type: Number, default: 1 }, // <-- ADD THIS LINE
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  targetPerWeek: { type: Number, default: 7 }, 
  checkIns: [{ type: Date }],
  
  // --- BAD HABIT CONFIG ---
  strategy: { type: String, default: 'cold_turkey' }, 
  allowancePerWeek: { type: Number, default: 0 }, 
  cheatDays: [{ type: Date }], 
<<<<<<< HEAD
  startDate: { type: Date, default: Date.now },
  replacement: { type: String, default: '' },
  
  // --- JOURNAL / RELAPSE LOG (NEW) ---
  journal: [{
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['note', 'relapse', 'milestone'] },
    content: { type: String },
    trigger: { type: String }
  }],
  
  // --- MILESTONES (NEW) ---
  milestones: [{
    days: Number,
    achievedAt: Date,
    celebrated: { type: Boolean, default: false }
  }],
  
  longestStreak: { type: Number, default: 0 },
  totalRelapses: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  archivedAt: { type: Date, default: null },
=======
  startDate: { type: Date, default: Date.now }, 
  
  longestStreak: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  
  // --- SOFT DELETE FIELDS ---
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Habit', habitSchema);