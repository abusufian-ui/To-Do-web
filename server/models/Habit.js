const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['good', 'bad'], required: true },
  
  // --- GOOD HABIT CONFIG ---
  frequency: { type: String, default: 'daily' }, 
  targetPerWeek: { type: Number, default: 7 }, 
  checkIns: [{ type: Date }],
  
  // --- BAD HABIT CONFIG ---
  strategy: { type: String, default: 'cold_turkey' }, 
  allowancePerWeek: { type: Number, default: 0 }, 
  cheatDays: [{ type: Date }], 
  startDate: { type: Date, default: Date.now }, 
  
  longestStreak: { type: Number, default: 0 },
  
  // Notice the comma on the line below!
  createdAt: { type: Date, default: Date.now },
  
  // --- SOFT DELETE FIELDS ---
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
});

module.exports = mongoose.model('Habit', habitSchema);