const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  subject: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'resolved'], 
    default: 'open' 
  },
  adminResponse: {
    type: String,
    default: null
  },
  screenshots: [String]
}, { 
  // This single line magically creates and updates 'createdAt' and 'updatedAt' automatically!
  timestamps: true 
});

module.exports = mongoose.model('Feedback', feedbackSchema);