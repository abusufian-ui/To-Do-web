const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbLink = process.env.REACT_APP_MONGODB_URI;
if (!dbLink) {
  console.error("REACT_APP_MONGODB_URI is not defined.");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  accessedExtension: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function run() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(dbLink);
    console.log("Connected. Cleaning up accessedExtension flags...");
    
    // Update all users: set accessedExtension to false
    const res = await User.updateMany({}, { $set: { accessedExtension: false } });
    console.log(`Success! Updated ${res.modifiedCount} users.`);
  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
