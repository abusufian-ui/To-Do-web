
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
  phone: { type: String, default: null },
  emergencyContact: { type: String, default: null },
  presentAddress: { type: String, default: null },
  permanentAddress: { type: String, default: null },
  dob: { type: String, default: null },
  gender: { type: String, default: null },
  cnic: { type: String, default: null },
  domicile: { type: String, default: null },
  nationality: { type: String, default: null },
  religion: { type: String, default: null },
  bloodGroup: { type: String, default: null },
  fatherName: { type: String, default: null },
  fatherCnic: { type: String, default: null },
  guardianName: { type: String, default: null },
  guardianCnic: { type: String, default: null },
  maritalStatus: { type: String, default: null },
  faculty: { type: String, default: null },
  careerType: { type: String, default: null },
  program: { type: String, default: null },
  currentSemester: { type: String, default: null },
  
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
  tempSyncId: { type: String, default: null, index: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);