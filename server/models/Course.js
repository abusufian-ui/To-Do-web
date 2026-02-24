const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Base Attributes
  name: { type: String, required: true },
  type: { type: String, enum: ['general', 'university'], default: 'general', required: true },
  color: { type: String, default: '#3498db' },

  // --- UNIVERSITY COURSE CLASSIFICATION ---
  code: { type: String, default: '' }, // Course Code (if available)
  instructors: [{ type: String }],     // Array: Can hold both Lecture & Lab teachers
  rooms: [{ type: String }],           // Array: Can hold both Lecture & Lab rooms

  createdAt: { type: Date, default: Date.now }
});

// Create a composite Primary Key: A user cannot have two courses with the exact same name.
CourseSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Course', CourseSchema);