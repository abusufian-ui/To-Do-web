require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const CourseVaultFile = require('../models/CourseVaultFile');

mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const results = await CourseVaultFile.aggregate([
    {
      $match: {
        category: 'past_paper',
        status: 'published'
      }
    },
    {
      $group: {
        _id: { courseCode: '$courseCode', courseName: '$courseName' },
        pastPaperCount: { $sum: 1 }
      }
    },
    {
      $sort: { pastPaperCount: 1 }
    }
  ]);

  const below5 = results.filter(r => r.pastPaperCount < 5);
  const above5 = results.filter(r => r.pastPaperCount >= 5);

  console.log('=== COURSE VAULT PAST PAPERS AUDIT ===');
  console.log('Total unique courses with past papers:', results.length);
  console.log('Courses WITH fewer than 5 past papers:', below5.length);
  console.log('Courses with 5+ past papers:', above5.length);
  console.log('');
  console.log('--- COURSES WITH < 5 PAST PAPERS ---');
  below5.forEach(r => {
    console.log(`[${r.pastPaperCount} papers] ${r._id.courseCode} | ${r._id.courseName}`);
  });

  mongoose.disconnect();
}).catch(console.error);
