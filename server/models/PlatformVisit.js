const mongoose = require('mongoose');

const platformVisitSchema = new mongoose.Schema({
  platform: { 
    type: String, 
    enum: ['web', 'mobile', 'extension', 'info'], 
    required: true,
    index: true 
  },
  date: { 
    type: String, 
    required: true, 
    index: true // Format: YYYY-MM-DD
  },
  visits: { type: Number, default: 0 },
  uniqueUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  uniqueUserCount: { type: Number, default: 0 }
}, { timestamps: true });

platformVisitSchema.index({ platform: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PlatformVisit', platformVisitSchema);
