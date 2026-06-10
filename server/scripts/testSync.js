const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const { runNightlyMaterialSync } = require('../services/materialProcessor');

const MONGO_URI = process.env.REACT_APP_MONGODB_URI;

if (!MONGO_URI) {
    console.error("REACT_APP_MONGODB_URI not found in env!");
    process.exit(1);
}

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to MongoDB. Starting test sync...");
    try {
        await runNightlyMaterialSync(User, Course);
        console.log("Sync script finished execution successfully!");
    } catch (e) {
        console.error("Sync script failed:", e);
    }
    process.exit(0);
});
