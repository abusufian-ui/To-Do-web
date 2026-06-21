require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("Connecting to:", dbLink);

mongoose.connect(dbLink).then(async () => {
  console.log("Connected to MongoDB Atlas successfully");
  const users = await User.find({}, 'name email portalId').limit(50).lean();
  console.log("Users in DB:");
  users.forEach(u => {
    console.log(`Name: ${u.name} | Email: ${u.email} | PortalId: ${u.portalId}`);
  });
  process.exit(0);
}).catch(err => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});
