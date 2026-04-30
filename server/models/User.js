// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isPortalConnected: { type: Boolean, default: false },
  portalId: { type: String, default: null },
  ucpCookie: { type: String, default: null },
  // 📸 NEW: Add this line to store the Base64 image
  profilePic: { type: String, default: null }, 
  pushTokens: [{ type: String }],
  prayerNotifs: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);