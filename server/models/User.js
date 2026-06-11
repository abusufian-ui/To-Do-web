// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  webPassword: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  adminPin: { type: String, default: '0000' },
  isPortalConnected: { type: Boolean, default: false, index: true },
  portalId: { type: String, default: null },
  ucpCookie: { type: String, default: null },
  portalProfilePic: { type: String, default: null }, // Scrapped from portal
  originalPortalProfilePic: { type: String, default: null }, // First scrapped pic (for records)
  customProfilePic: { type: String, default: null }, // User uploaded
  profilePic: { type: String, default: null }, // Computed/Current display pic
  showProfilePicToCommunity: { type: Boolean, default: null }, // Privacy preference
  securitySettings: {
    autoLockEnabled: { type: Boolean, default: false },
    autoLockTimer: { type: Number, default: 900000 } // 15 minutes in ms
  },
  // Crowdsourced sync: which sections this student is enrolled in
  enrolledSections: [{ type: String }], // e.g., ["CSAL3243-S26-BS-CS-F23-F4", "EE212-S26-BS-EE-F23-G11"]
  lastScrapedAt: { type: Date, default: null }, // When this user last ran a full foreground scrape
  isBlocked: { type: Boolean, default: false },
  isLeaderboardEnabled: { type: Boolean, default: true },
  pushTokens: [{ type: String }],
  prayerNotifs: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null },
  coursePreferences: { type: Map, of: Boolean, default: {} } // true = visible, false = hidden
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);