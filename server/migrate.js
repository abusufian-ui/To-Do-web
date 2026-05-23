require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo').then(async () => {
  const users = await User.find({ customProfilePic: null, profilePic: { $ne: null } });
  let count = 0;
  for (const user of users) {
    user.profilePic = null;
    await user.save();
    count++;
  }
  
  console.log(`Cleared profilePic for ${count} users without custom uploaded pictures.`);
  mongoose.disconnect();
}).catch(console.error);
