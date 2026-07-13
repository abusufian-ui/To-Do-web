const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  
  name: { type: String, required: true },
  type: { type: String, enum: ['general', 'university'], default: 'general', required: true },
  color: { type: String, default: '#3498db' },

  
  code: { type: String, default: '' }, 
  section: { type: String, default: '' }, 
  creditHours: { type: Number, default: 3 }, 
  instructors: [{ type: String }],     
  rooms: [{ type: String }],           

  portalUrl: { type: String, default: '' }, 
  semester: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

CourseSchema.index({ userId: 1, name: 1 }, { unique: true });
CourseSchema.index({ code: 1, section: 1 });
CourseSchema.index({ name: 1, section: 1 });

module.exports = mongoose.model('Course', CourseSchema);