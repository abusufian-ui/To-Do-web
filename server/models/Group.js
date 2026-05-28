const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profilePic: { type: String, default: null },
  gradingPreference: { type: String, enum: ['relative', 'absolute'], default: 'relative' }
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
