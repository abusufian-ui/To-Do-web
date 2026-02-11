const mongoose = require('mongoose');

// Paste your Atlas connection string here
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(dbLink)
  .then(async () => {
    console.log("🔥 Connected! Cleaning up bad indexes...");
    
    try {
        // Drop the ResultHistory collection entirely to remove the bad index
        await mongoose.connection.collection('resulthistories').drop();
        console.log("✅ 'resulthistories' collection dropped. It will be recreated correctly on next sync.");
    } catch (e) {
        console.log("⚠️ Collection might not exist yet, skipping drop.");
    }

    console.log("👋 Done. You can restart your server now.");
    process.exit(0);
  })
  .catch(err => console.error(err));