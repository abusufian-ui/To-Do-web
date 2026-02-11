const mongoose = require('mongoose');

const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(dbLink)
  .then(async () => {
    console.log("🚀 Connected to MongoDB...");
    try {
        // Drop the studentstats collection to remove the bad 'studentId' index
        await mongoose.connection.collection('studentstats').drop();
        console.log("✅ 'studentstats' collection cleared successfully.");
    } catch (e) {
        console.log("⚠️ Collection already empty or doesn't exist.");
    }
    process.exit(0);
  })
  .catch(err => console.error(err));