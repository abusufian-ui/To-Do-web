require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

console.log('Connecting to database...');
mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected successfully!');
    
    
    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} total users.`);

    
    const result = await User.updateMany(
      {},
      { $set: { showProfilePicToCommunity: null } }
    );

    console.log(`Database updated successfully!`);
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    
    const updatedUsers = await User.find({}, { name: 1, showProfilePicToCommunity: 1 });
    console.log('\nUpdated User Status:');
    updatedUsers.forEach(u => {
      console.log(`- ${u.name}: showProfilePicToCommunity = ${u.showProfilePicToCommunity}`);
    });

    mongoose.disconnect();
    console.log('\nDisconnected. You can now refresh/restart your mobile app to test onboarding again!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
