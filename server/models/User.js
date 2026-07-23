
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  webPassword: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  adminPin: { type: String, default: '0000' },
  adminSecurityQuestion: { type: String, default: null },
  adminSecurityAnswer: { type: String, default: null },
  adminSessionToken: { type: String, default: null },
  adminSecuritySetupDone: { type: Boolean, default: false },
  adminResetOTP: { type: String, default: null },
  adminResetOTPExpires: { type: Date, default: null },
  isPortalConnected: { type: Boolean, default: false, index: true },
  portalId: { type: String, default: null },
  ucpCookie: { type: String, default: null },          
  ucpCookieEncrypted: { type: String, default: null, select: false }, 
  ucpCookieUpdatedAt: { type: Date, default: null },   
  portalProfilePic: { type: String, default: null }, 
  originalPortalProfilePic: { type: String, default: null }, 
  customProfilePic: { type: String, default: null }, 
  profilePic: { type: String, default: null }, 
  showProfilePicToCommunity: { type: Boolean, default: null }, 
  securitySettings: {
    autoLockEnabled: { type: Boolean, default: false },
    autoLockTimer: { type: Number, default: 900000 } 
  },
  
  secondaryEmail: { type: String, default: null },
  dob: { type: String, default: null },
  gender: { type: String, default: null },
  faculty: { type: String, default: null },
  careerType: { type: String, default: null },
  program: { type: String, default: null },
  currentSemester: { type: String, default: null },
  academicOrdinalSemester: { type: String, default: null },
  
  enrolledSections: [{ type: String }], 
  lastScrapedAt: { type: Date, default: null }, 
  isBlocked: { type: Boolean, default: false },
  isLeaderboardEnabled: { type: Boolean, default: true },
  pushTokens: [{ type: String }],
  prayerNotifs: { type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null },
  coursePreferences: { type: Map, of: Boolean, default: {} }, 
  accessedWeb: { type: Boolean, default: false },
  accessedMobile: { type: Boolean, default: false },
  accessedExtension: { type: Boolean, default: false },
  tempSyncId: { type: String, default: null, index: true },
  // Onboarding sync lifecycle: null (none) | 'scraping' (extension connected, importing) |
  // 'complete' (first full scrape pushed). Drives the web onboarding progress UI.
  syncStatus: { type: String, default: null },
  syncProgress: { type: Number, default: 0 },
  syncActivity: { type: String, default: 'Importing your data...' },
  isSemesterCompleted: { type: Boolean, default: false },
  lastCompletedSemester: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);