require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected to database.');
    const users = await User.find({}, { name: 1, email: 1, showProfilePicToCommunity: 1, webPassword: 1 });
    console.log(`Total users in DB: ${users.length}`);
    users.forEach(u => {
      console.log(`Roll/Email: ${u.email} | Name: ${u.name} | HasPassword: ${!!u.webPassword} | Onboarded: ${u.showProfilePicToCommunity !== null && u.showProfilePicToCommunity !== undefined}`);
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
