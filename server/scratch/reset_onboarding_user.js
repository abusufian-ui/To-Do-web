require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected to database.');
    const res = await User.updateOne(
      { email: 'l1f23bscs1329@ucp.edu.pk' },
      { $set: { showProfilePicToCommunity: null } }
    );
    console.log(`Updated user onboarding status:`, res);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
