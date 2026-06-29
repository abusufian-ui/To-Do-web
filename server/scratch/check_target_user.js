const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbLink = process.env.REACT_APP_MONGODB_URI;

mongoose.connect(dbLink)
  .then(async () => {
    console.log("Connected to MongoDB.");

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const user = await User.findOne({ email: /l1f23bscs0023/i }).lean();
    
    if (!user) {
      console.log("❌ User l1f23bscs0023 not found in users collection!");
      mongoose.disconnect();
      return;
    }

    console.log("Found User:", {
      _id: user._id,
      email: user.email,
      name: user.name,
      portalId: user.portalId,
      syncStatus: user.syncStatus,
      accessedExtension: user.accessedExtension
    });

    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      const Model = mongoose.model(col.name, new mongoose.Schema({}, { strict: false }), col.name);
      const matchCount = await Model.countDocuments({
        $or: [
          { userId: user._id },
          { userId: user._id.toString() },
          { user: user._id },
          { user: user._id.toString() }
        ]
      });
      console.log(`Collection '${col.name}': ${matchCount} documents for this user`);
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error:", err);
  });
