const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  code: { type: String, default: '' },
  color: { type: String, default: '#3498db' },
  type: { type: String, default: 'general' } // <--- ADDED THIS FIELD
});

module.exports = mongoose.model('Course', CourseSchema);