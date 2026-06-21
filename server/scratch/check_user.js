const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

async function check() {
  try {
    await mongoose.connect(process.env.REACT_APP_MONGODB_URI);
    const user = await User.findOne({ email: 'l1f23bscs1329@ucp.edu.pk' });
    if (user) {
      console.log('--- USER DATA ---');
      console.log('faculty:', JSON.stringify(user.faculty));
    } else {
      console.log('User not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
check();
