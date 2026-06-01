const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB.');
  const users = await User.find({});
  console.log(`Found ${users.length} users.`);
  users.forEach(u => {
    console.log({
      id: u._id,
      name: u.name,
      email: u.email,
      portalId: u.portalId,
      rollNo: u.rollNo,
      isLeaderboardEnabled: u.isLeaderboardEnabled,
      isAdmin: u.isAdmin
    });
  });
  process.exit(0);
}).catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
