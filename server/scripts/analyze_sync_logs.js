const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbLink = process.env.REACT_APP_MONGODB_URI;

const SyncLogSchema = new mongoose.Schema({
  mode: String,
  userId: mongoose.Schema.Types.ObjectId
}, { collection: 'synclogs' });

const SyncLog = mongoose.model('SyncLog', SyncLogSchema);

const UserSchema = new mongoose.Schema({
  email: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function run() {
  try {
    await mongoose.connect(dbLink);
    console.log("Connected to DB.");
    
    const modes = await SyncLog.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 } } }
    ]);
    console.log("Sync Log Modes Distribution:", modes);

    // Let's count unique users who have AUTO_SYNC, LOGIN_SYNC, or FORCE_SYNC logs
    const extensionUsers = await SyncLog.distinct('userId', {
      mode: { $in: ['AUTO_SYNC', 'LOGIN_SYNC', 'FORCE_SYNC'] }
    });
    console.log(`Found ${extensionUsers.length} unique users who have user-initiated sync logs (AUTO_SYNC, LOGIN_SYNC, FORCE_SYNC).`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
