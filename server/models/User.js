const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // 🚨 REMOVED 'required: true' to support seamless Microsoft SSO
  password: { type: String, required: false },
  
  isAdmin: { type: Boolean, default: false },
  
  // Security PIN for Admin Command Center
  adminPin: { type: String, default: '0000' }, 
  
  // --- NOTIFICATION PREFERENCES ---
  pushToken: { type: String, default: null },
  pushTokens: [{ type: String }],
  prayerNotifs: { type: Boolean, default: false },
  
  portalId: { type: String, default: null },
  isPortalConnected: { type: Boolean, default: false },
  ucpCookie: { type: String, default: null },
  lastSyncAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);