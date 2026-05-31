const mongoose = require('mongoose');
const Course = require('./models/Course');
const Grade = require('./models/Grade');
const User = require('./models/User');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const users = await User.find();
  console.log("USERS:", users.map(u => ({ id: u._id, name: u.name, portalId: u.portalId, email: u.email })));
  
  const courses = await Course.find();
  console.log("COURSES COUNT:", courses.length);
  
  const grades = await Grade.find();
  console.log("GRADES COUNT:", grades.length);
  
  // Let's print out all 'Advanced Web Programming' courses
  const awpCourses = await Course.find({ name: /Advanced Web Programming/i });
  console.log("Advanced Web Programming courses:");
  awpCourses.forEach(c => {
    console.log(`- Course: ${c.name}, ID: ${c._id}, Code: ${c.code}, Section: ${c.section}, UserID: ${c.userId}`);
  });
  
  process.exit(0);
});
