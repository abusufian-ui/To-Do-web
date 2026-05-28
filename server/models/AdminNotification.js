const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentByName: { type: String },
  targetType: { type: String, enum: ['all', 'specific'], default: 'all' },
  targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  targetCount: { type: Number, default: 0 },
  deliveredCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
