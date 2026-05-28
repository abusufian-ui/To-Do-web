const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Announcement = require('./models/Announcement');
const Attendance = require('./models/Attendance');
const Submission = require('./models/Submission');
const Grade = require('./models/Grade');

require('dotenv').config({ path: './.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/to-do-app');
  const users = await User.find({});
  if (!users.length) return console.log("No users");
  const user = users[0];
  
  const courses = await Course.find({ userId: user._id });
  const announcements = await Announcement.find({ userId: user._id });
  const attendance = await Attendance.find({ userId: user._id });
  const submissions = await Submission.find({ userId: user._id });
  const grades = await Grade.find({ userId: user._id });
  
  console.log("=== COURSES ===");
  courses.forEach(c => console.log(c.name));
  
  console.log("\n=== ANNOUNCEMENTS ===");
  announcements.forEach(a => console.log(a.courseName, "->", a.news.length, "news"));
  
  console.log("\n=== ATTENDANCE ===");
  attendance.forEach(a => console.log(a.courseName, "->", a.records.length, "records"));
  
  console.log("\n=== SUBMISSIONS ===");
  submissions.forEach(a => console.log(a.courseName, "->", a.tasks.length, "tasks"));

  console.log("\n=== GRADES ===");
  grades.forEach(a => console.log(a.courseName));
  
  process.exit();
}

check();
