const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  
  // Security PIN for Admin Command Center
  adminPin: { type: String, default: '0000' }, 
  
  portalId: { type: String, default: null },
  isPortalConnected: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);