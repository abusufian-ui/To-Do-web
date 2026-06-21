require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

console.log('Connecting to database...');
mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected successfully!');
    
    // Set isPortalConnected to false for all users
    const result = await User.updateMany(
      {},
      { $set: { isPortalConnected: false } }
    );

    console.log(`Database updated successfully!`);
    console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // Print updated users
    const updatedUsers = await User.find({}, { name: 1, isPortalConnected: 1 });
    console.log('\nUpdated User Status:');
    updatedUsers.forEach(u => {
      console.log(`- ${u.name}: isPortalConnected = ${u.isPortalConnected}`);
    });

    mongoose.disconnect();
    console.log('\nDisconnected. You can now refresh/restart your mobile app to see the manual refresh red bar on the dashboard!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
