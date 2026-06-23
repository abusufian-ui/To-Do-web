const mongoose = require('mongoose');

const DeviceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenSignature: { type: String, required: true, index: true },
  deviceType: { type: String, default: 'Desktop' }, 
  browser: { type: String, default: 'Unknown' },
  os: { type: String, default: 'Unknown' },
  ipAddress: { type: String, default: '' },
  location: { type: String, default: 'Unknown' },
  userAgent: { type: String, default: '' },
  lastActiveAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('DeviceSession', DeviceSessionSchema);
