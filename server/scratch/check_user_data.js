const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbLink = process.env.REACT_APP_MONGODB_URI;

if (!dbLink) {
  console.error("No REACT_APP_MONGODB_URI found in .env");
  process.exit(1);
}

console.log("Connecting to:", dbLink);

mongoose.connect(dbLink)
  .then(async () => {
    console.log("Connected to MongoDB.");

    // Dynamic model loading/inspection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in DB:", collections.map(c => c.name));

    // Let's inspect users
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const users = await User.find({}).lean();
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`- ID: ${u._id}, Name: ${u.name}, Email: ${u.email}, syncStatus: ${u.syncStatus}, portalId: ${u.portalId}`);
    }

    if (users.length > 0) {
      // Let's check other collections for data belonging to the users
      for (const col of collections) {
        if (['users', 'pendingsyncs', 'sessions'].includes(col.name)) continue;
        const Model = mongoose.model(col.name, new mongoose.Schema({}, { strict: false }), col.name);
        const count = await Model.countDocuments({});
        console.log(`Collection '${col.name}': ${count} total documents`);
        
        // Let's see if any documents match the user IDs
        for (const u of users) {
          const matchCount = await Model.countDocuments({
            $or: [
              { userId: u._id },
              { userId: u._id.toString() },
              { user: u._id },
              { user: u._id.toString() }
            ]
          });
          if (matchCount > 0) {
            console.log(`  -> ${matchCount} documents for user ${u.email}`);
          }
        }
      }
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error("DB connection error:", err);
  });
