const mongoose = require('mongoose');
const User = require('./models/User');

const dbLink = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/todo-web" || "mongodb://localhost:27017/todo";

mongoose.connect("mongodb://127.0.0.1:27017/todo-web").then(async () => {
  console.log("Connected to MongoDB");
  const users = await User.find({}, 'name email portalId').limit(50).lean();
  console.log("Users in DB:");
  users.forEach(u => {
    console.log(`Name: ${u.name} | Email: ${u.email} | PortalId: ${u.portalId}`);
  });
  process.exit(0);
}).catch(err => {
  console.error("Failed to connect:", err);
  // Try another DB link if needed
  mongoose.connect("mongodb://127.0.0.1:27017/todo").then(async () => {
     const users = await User.find({}, 'name email portalId').limit(50).lean();
     users.forEach(u => {
       console.log(`Name: ${u.name} | Email: ${u.email} | PortalId: ${u.portalId}`);
     });
     process.exit(0);
  }).catch(e => {
     console.error("Failed again:", e);
     process.exit(1);
  });
});
