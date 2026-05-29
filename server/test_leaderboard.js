const mongoose = require('mongoose');
const Course = require('./models/Course');
const Grade = require('./models/Grade');
const User = require('./models/User');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const myCourse = await Course.findOne({ name: 'Artificial Intelligence - Lab', userId: '698d82ecfd7fe29835c9a7e8' }); // Sufian's course
  console.log("My course code:", myCourse.code);
  
  let query = {};
  if (myCourse.code) {
    query.code = myCourse.code;
  } else {
    query.name = myCourse.name;
  }
  if (myCourse.section) query.section = myCourse.section;

  console.log("Query:", query);
  
  const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic');
  console.log("Matching courses:", matchingCourses.length);

  const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
  const grades = await Grade.find({ userId: { $in: userIds } });

  let leaderboard = matchingCourses.map(course => {
    const userGrade = grades.find(g =>
      g.userId.toString() === course.userId?._id.toString() &&
      (g.courseName === course.name || (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase())))
    );

    let score = 0;
    if (userGrade && Array.isArray(userGrade.assessments)) {
      let totalMarkedWeight = 0;
      let totalEarnedWeight = 0;
      userGrade.assessments.forEach(cat => {
        const wNum = parseFloat(cat.weight) || 0;
        const pNum = parseFloat(cat.percentage) || 0;
        totalMarkedWeight += wNum;
        totalEarnedWeight += (pNum / 100) * wNum;
      });
      score = totalMarkedWeight > 0 ? (totalEarnedWeight / totalMarkedWeight) * 100 : 0;
    }

    return {
      id: course.userId?.portalId || 'Unknown ID',
      name: course.userId?.name || 'Unknown Student',
      score: score || 0
    };
  });

  leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
  leaderboard.sort((a, b) => b.score - a.score);

  console.log("Final Leaderboard:");
  console.log(leaderboard);
  
  process.exit(0);
});
