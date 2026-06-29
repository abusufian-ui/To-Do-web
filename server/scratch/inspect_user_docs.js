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
      console.log("❌ User not found!");
      mongoose.disconnect();
      return;
    }

    const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }), 'courses');
    const courses = await Course.find({ userId: user._id }).lean();
    console.log("--- Courses for this user ---");
    console.log(courses);

    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');
    const notifications = await Notification.find({ userId: user._id }).lean();
    console.log("--- Notifications for this user ---");
    console.log(notifications);

    const Habit = mongoose.model('Habit', new mongoose.Schema({}, { strict: false }), 'habits');
    const habits = await Habit.find({ userId: user._id }).lean();
    console.log("--- Habits for this user ---");
    console.log(habits);

    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error:", err);
  });
