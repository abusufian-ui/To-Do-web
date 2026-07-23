require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const mongoUri = process.env.REACT_APP_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/todo';

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to MongoDB. Resetting admin security question status...');
  
  const result = await User.updateMany(
    { isAdmin: true },
    {
      $set: {
        adminSecuritySetupDone: false,
        adminSecurityQuestion: null,
        adminSecurityAnswer: null
      }
    }
  );

  console.log(`✅ Successfully reset ${result.modifiedCount} admin user(s) for first-time security question setup on next login.`);
  mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
