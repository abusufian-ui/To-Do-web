const mongoose = require('mongoose');
const User = require('./models/User');
const ResultHistory = require('./models/ResultHistory');

require('dotenv').config({ path: './.env' });

const email = 'l1f23bscs0000@ucp.edu.pk';

async function run() {
  await mongoose.connect(process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo');
  console.log('Connected to MongoDB.');

  const user = await User.findOne({ email });
  if (!user) {
    console.error('Test user not found! Run test_1_create_user.js first.');
    process.exit(1);
  }

  const userId = user._id;

  // Clean old result history entry for Fall 2025 if exists
  await ResultHistory.deleteOne({ userId, term: 'Fall 2025' });

  // Create ResultHistory
  const result = new ResultHistory({
    userId,
    term: 'Fall 2025',
    sgpa: '3.67',
    cgpa: '3.67',
    earnedCH: '9',
    courses: [
      {
        name: 'Artificial Intelligence',
        creditHours: '3',
        gradePoints: '4.00',
        finalGrade: 'A'
      },
      {
        name: 'Computer Networks',
        creditHours: '3',
        gradePoints: '3.33',
        finalGrade: 'B+'
      },
      {
        name: 'Software Engineering',
        creditHours: '3',
        gradePoints: '3.67',
        finalGrade: 'A-'
      }
    ]
  });
  await result.save();
  console.log('Created ResultHistory entry for Fall 2025.');

  // Update user completion flags
  user.isSemesterCompleted = true;
  user.lastCompletedSemester = 'Fall 2025';
  await user.save();
  console.log('Updated user flags: isSemesterCompleted = true, lastCompletedSemester = "Fall 2025"');

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
