const mongoose = require('mongoose');
const User = require('../server/models/User');
const Course = require('../server/models/Course');
const Grade = require('../server/models/Grade');

const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/my_portal_db?ssl=true&authSource=admin&retryWrites=true&w=majority";

async function run() {
  await mongoose.connect(dbLink);
  console.log("Connected to DB!");

  // Search user by roll number or name
  console.log("Searching user by name/rollNo...");
  const user = await User.findOne({ 
    $or: [
      { portalId: /l1f23bscs0023/i },
      { name: /Hashir/i },
      { email: /l1f23bscs0023/i }
    ]
  });

  if (!user) {
    console.log("❌ User Hashir Farooq (l1f23bscs0023) NOT found in DB!");
    mongoose.disconnect();
    return;
  }

  console.log("✅ User Found:", {
    id: user._id,
    name: user.name,
    email: user.email,
    portalId: user.portalId,
    isLeaderboardEnabled: user.isLeaderboardEnabled,
    isBlocked: user.isBlocked,
    isAdmin: user.isAdmin
  });

  // Search for his courses
  const courses = await Course.find({ userId: user._id });
  console.log(`\n📚 Courses registered for ${user.name} (${courses.length}):`);
  courses.forEach(c => {
    console.log(`- [${c.code}] ${c.name} (Section: ${c.section}, URL: ${c.url})`);
  });

  // Search for his grades
  const grades = await Grade.find({ userId: user._id });
  console.log(`\n📊 Grades synchronized for ${user.name} (${grades.length}):`);
  grades.forEach(g => {
    console.log(`- ${g.courseName} (${g.totalPercentage}%, Assessments Count: ${g.assessments?.length})`);
  });

  mongoose.disconnect();
}

run().catch(console.error);
