const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  
  // Security PIN for Admin Command Center
  adminPin: { type: String, default: '0000' }, 
  
// --- NOTIFICATION PREFERENCES ---
  pushToken: { type: String, default: null }, // You can keep this for legacy reasons if you want
  pushTokens: [{ type: String }],             // 👇 ADD THIS ARRAY
  prayerNotifs: { type: Boolean, default: false },
  
  portalId: { type: String, default: null },
  isPortalConnected: { type: Boolean, default: false },
  ucpCookie: { type: String, default: null },
  lastSyncAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);