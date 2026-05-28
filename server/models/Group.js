const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
<<<<<<< HEAD
  profilePic: { type: String, default: null },
  gradingPreference: { type: String, enum: ['relative', 'absolute'], default: 'relative' }
=======
  profilePic: { type: String, default: null }
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
