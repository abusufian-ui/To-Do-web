const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Portal Credentials
  portalId: { type: String, default: null },
  portalPassword: { type: String, default: null },
  isPortalConnected: { type: Boolean, default: false },

  // Admin Flag (Default is false for everyone except you)
  isAdmin: { type: Boolean, default: false }, 
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);