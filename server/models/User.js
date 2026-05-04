// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  webPassword: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  isPortalConnected: { type: Boolean, default: false },
  portalId: { type: String, default: null },
  ucpCookie: { type: String, default: null },
  portalProfilePic: { type: String, default: null }, // Scrapped from portal
  originalPortalProfilePic: { type: String, default: null }, // First scrapped pic (for records)
  customProfilePic: { type: String, default: null }, // User uploaded
  profilePic: { type: String, default: null }, // Computed/Current display pic
  securitySettings: {
    autoLockEnabled: { type: Boolean, default: false },
    autoLockTimer: { type: Number, default: 900000 } // 15 minutes in ms
  },
  pushTokens: [{ type: String }],
  prayerNotifs: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);