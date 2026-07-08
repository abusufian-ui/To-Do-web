const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const Timetable = require('./models/TimetableModel');
const Task = require('./models/Task');

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

  // 1. Reset isSemesterCompleted (simulates acknowledgement or transition)
  user.isSemesterCompleted = false;
  user.currentSemester = 'Spring 2026';
  await user.save();
  console.log('Updated user currentSemester to Spring 2026 and isSemesterCompleted = false');

  // 2. Create new semester courses
  const newCourses = [
    new Course({
      userId,
      name: 'Theory of Automata',
      type: 'university',
      code: 'CS-3043',
      section: 'A',
      creditHours: 3,
      instructors: ['Dr. Alan Turing'],
      rooms: ['C-1'],
      semester: 'Spring 2026',
      color: '#9b59b6'
    }),
    new Course({
      userId,
      name: 'Differential Equations',
      type: 'university',
      code: 'MT-3013',
      section: 'A',
      creditHours: 3,
      instructors: ['Prof. Newton'],
      rooms: ['C-2', 'C-3'],
      semester: 'Spring 2026',
      color: '#e67e22'
    })
  ];

  for (const c of newCourses) {
    await c.save();
  }
  console.log('Created new mock courses for Spring 2026.');

  // 3. Clear new semester timetable entries only (verifying deleteMany {userId, semester: "Spring 2026"})
  await Timetable.deleteMany({ userId, semester: 'Spring 2026' });

  // 4. Insert new timetable entries
  const newTimetables = [
    new Timetable({
      userId,
      day: 'Tuesday',
      startTime: '09:00',
      endTime: '10:30',
      courseName: 'Theory of Automata',
      instructor: 'Dr. Alan Turing',
      room: 'C-1',
      semester: 'Spring 2026',
      color: 'bg-purple-500'
    }),
    new Timetable({
      userId,
      day: 'Thursday',
      startTime: '10:30',
      endTime: '12:00',
      courseName: 'Differential Equations',
      instructor: 'Prof. Newton',
      room: 'C-2',
      semester: 'Spring 2026',
      color: 'bg-orange-500'
    })
  ];

  for (const t of newTimetables) {
    await t.save();
  }
  console.log('Updated timetable with Spring 2026 entries. Fall 2025 entries remain untouched.');

  // 5. Add a new task for Spring 2026 to see both current and archived tasks side-by-side
  const task3 = new Task({
    userId,
    name: 'Read Automata Chapter 1',
    description: 'Introduction to finite state machine',
    course: 'Theory of Automata',
    date: '2026-03-10',
    time: '12:00',
    priority: 'Medium',
    status: 'New task'
  });
  await task3.save();
  console.log('Created a new current task for Theory of Automata.');

  console.log('New semester sync simulation complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
