const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Portal Identity (Password removed for security!)
  portalId: { type: String, default: null },
  isPortalConnected: { type: Boolean, default: false },
  
  // Extension Tracking
  lastSyncAt: { type: Date, default: null },
  
  // Admin Flag
  isAdmin: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);