const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Grade = require('./models/Grade');
const Timetable = require('./models/TimetableModel');
const Announcement = require('./models/Announcement');
const Attendance = require('./models/Attendance');
const Submission = require('./models/Submission');
const Task = require('./models/Task');
const Note = require('./models/Note');
const Keynote = require('./models/Keynote');
const ResultHistory = require('./models/ResultHistory');

require('dotenv').config({ path: './.env' });

const email = 'l1f23bscs0000@ucp.edu.pk';

async function run() {
  await mongoose.connect(process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo');
  console.log('Connected to MongoDB.');

  const user = await User.findOne({ email });
  if (!user) {
    console.error('Test user not found! Please run test_1_create_user.js once to initialize the database.');
    process.exit(1);
  }

  const userId = user._id;

  // 1. Reset user state back to Test 1 baseline
  user.isSemesterCompleted = false;
  user.currentSemester = 'Fall 2025';
  user.lastCompletedSemester = '';
  await user.save();
  console.log('Reset user document properties (currentSemester: Fall 2025, isSemesterCompleted: false).');

  // 2. Clean all dependent mock data and results history
  await Course.deleteMany({ userId });
  await Grade.deleteMany({ userId });
  await Timetable.deleteMany({ userId });
  await Announcement.deleteMany({ userId });
  await Attendance.deleteMany({ userId });
  await Submission.deleteMany({ userId });
  await Task.deleteMany({ userId });
  await Note.deleteMany({ user: userId });
  await Keynote.deleteMany({ userId });
  await ResultHistory.deleteMany({ userId });
  console.log('Cleared all active and archived academic data related to the test user.');

  // 3. Re-seed Fall 2025 initial data (matching test_1_create_user.js)
  
  // Re-seed Courses
  const courses = [
    new Course({
      userId,
      name: 'Artificial Intelligence',
      type: 'university',
      code: 'CS-3013',
      section: 'A',
      creditHours: 3,
      instructors: ['Dr. John Doe'],
      rooms: ['B-10'],
      semester: 'Fall 2025',
      color: '#e74c3c'
    }),
    new Course({
      userId,
      name: 'Computer Networks',
      type: 'university',
      code: 'CS-3023',
      section: 'A',
      creditHours: 3,
      instructors: ['Dr. Sarah Smith'],
      rooms: ['B-12'],
      semester: 'Fall 2025',
      color: '#3498db'
    }),
    new Course({
      userId,
      name: 'Software Engineering',
      type: 'university',
      code: 'CS-3033',
      section: 'A',
      creditHours: 3,
      instructors: ['Prof. David Jones'],
      rooms: ['B-15'],
      semester: 'Fall 2025',
      color: '#2ecc71'
    }),
    new Course({
      userId,
      name: 'General',
      type: 'general',
      color: '#95a5a6'
    })
  ];
  for (const c of courses) {
    await c.save();
  }
  console.log('Re-seeded initial Fall 2025 Courses.');

  // Re-seed Timetable
  const timetables = [
    new Timetable({
      userId,
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      courseName: 'Artificial Intelligence',
      instructor: 'Dr. John Doe',
      room: 'B-10',
      semester: 'Fall 2025',
      color: 'bg-red-500'
    }),
    new Timetable({
      userId,
      day: 'Monday',
      startTime: '10:30',
      endTime: '12:00',
      courseName: 'Computer Networks',
      instructor: 'Dr. Sarah Smith',
      room: 'B-12',
      semester: 'Fall 2025',
      color: 'bg-blue-500'
    }),
    new Timetable({
      userId,
      day: 'Wednesday',
      startTime: '09:00',
      endTime: '10:30',
      courseName: 'Software Engineering',
      instructor: 'Prof. David Jones',
      room: 'B-15',
      semester: 'Fall 2025',
      color: 'bg-green-500'
    })
  ];
  for (const t of timetables) {
    await t.save();
  }
  console.log('Re-seeded initial Fall 2025 Timetables.');

  // Re-seed Grades
  const grade1 = new Grade({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    totalPercentage: '85.5',
    assessments: [
      {
        name: 'Quizzes',
        weight: '10',
        percentage: '90',
        details: [
          { name: 'Quiz 1', maxMarks: '10', obtainedMarks: '9', classAverage: '7', percentage: '90' }
        ]
      },
      {
        name: 'Midterm',
        weight: '30',
        percentage: '82',
        details: [
          { name: 'Mid Exam', maxMarks: '100', obtainedMarks: '82', classAverage: '72', percentage: '82' }
        ]
      }
    ]
  });
  await grade1.save();

  const grade2 = new Grade({
    userId,
    courseUrl: 'mock_url_cn',
    courseName: 'Computer Networks',
    totalPercentage: '78.0',
    assessments: [
      {
        name: 'Assignments',
        weight: '15',
        percentage: '80',
        details: [
          { name: 'Assignment 1', maxMarks: '20', obtainedMarks: '16', classAverage: '14', percentage: '80' }
        ]
      }
    ]
  });
  await grade2.save();
  console.log('Re-seeded initial Fall 2025 Grades.');

  // Re-seed Announcements
  const announce1 = new Announcement({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    news: [
      { subject: 'Midterm Syllabus', date: '01 Oct 2025', description: 'Chapters 1 to 4 are included.' }
    ]
  });
  await announce1.save();

  // Re-seed Attendance
  const att1 = new Attendance({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    summary: { conducted: 10, attended: 9 },
    records: [
      { date: '2025-09-01', status: 'Present' },
      { date: '2025-09-08', status: 'Absent' }
    ]
  });
  await att1.save();

  // Re-seed Submissions
  const sub1 = new Submission({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    tasks: [
      { title: 'Project Proposal', description: 'Submit AI project draft', startDate: '2025-09-10', dueDate: '2025-09-20', status: 'Submitted' }
    ]
  });
  await sub1.save();
  console.log('Re-seeded initial academic feeds (Announcements, Attendance, Submissions).');

  // Re-seed Tasks
  const task1 = new Task({
    userId,
    name: 'Solve AI Assignment 2',
    description: 'Neural networks tasks',
    course: 'Artificial Intelligence',
    date: '2025-10-15',
    time: '23:59',
    priority: 'High',
    status: 'In Progress'
  });
  await task1.save();

  const task2 = new Task({
    userId,
    name: 'Buy Groceries',
    description: 'Milk, bread, and fruits',
    course: 'General',
    date: '2025-10-16',
    time: '18:00',
    priority: 'Low',
    status: 'New task'
  });
  await task2.save();
  console.log('Re-seeded initial Tasks.');

  // Re-seed Notes & Keynotes
  const note1 = new Note({
    user: userId,
    courseId: 'mock_url_ai',
    title: 'Lec 1: Intro to Neurons',
    content: 'Neurons take weighted inputs and pass them through activation functions.',
    source: 'web'
  });
  await note1.save();

  const keynote1 = new Keynote({
    userId,
    courseName: 'Artificial Intelligence',
    title: 'Formula reminder',
    type: 'text',
    content: 'Sigmoid: 1 / (1 + e^-x)'
  });
  await keynote1.save();
  console.log('Re-seeded initial Notes & Keynotes.');

  console.log('Reset back to Test 1 state complete! You can now run test_2_result_announced.js directly.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
