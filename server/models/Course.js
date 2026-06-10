const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Base Attributes
  name: { type: String, required: true },
  type: { type: String, enum: ['general', 'university'], default: 'general', required: true },
  color: { type: String, default: '#3498db' },

  // --- UNIVERSITY COURSE CLASSIFICATION ---
  code: { type: String, default: '' }, 
  section: { type: String, default: '' }, 
  creditHours: { type: Number, default: 3 }, // 🚨 NEW: Store course credit hours
  instructors: [{ type: String }],     
  rooms: [{ type: String }],           

  portalUrl: { type: String, default: '' }, // e.g. https://horizon.ucp.edu.pk/student/course/12345
  semester: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

CourseSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Course', CourseSchema);