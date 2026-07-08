const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

require('dotenv').config({ path: './.env' });

const email = 'l1f23bscs0000@ucp.edu.pk';
const portalId = 'L1F23BSCS0000';

async function run() {
  await mongoose.connect(process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo');
  console.log('Connected to MongoDB.');

  // Clean old data
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('Found existing test user, cleaning up related records...');
    const userId = existingUser._id;
    await Course.deleteMany({ userId });
    await Grade.deleteMany({ userId });
    await Timetable.deleteMany({ userId });
    await Announcement.deleteMany({ userId });
    await Attendance.deleteMany({ userId });
    await Submission.deleteMany({ userId });
    await Task.deleteMany({ userId });
    await Note.deleteMany({ user: userId });
    await Keynote.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('test123', 10);

  // Create User
  const user = new User({
    name: 'Test Student',
    email: email,
    password: hashedPassword,
    webPassword: hashedPassword,
    portalId: portalId,
    isPortalConnected: true,
    currentSemester: 'Fall 2025',
    isSemesterCompleted: false,
    lastCompletedSemester: ''
  });
  await user.save();
  console.log('Created User L1F23BSCS0000 / test123');

  const userId = user._id;

  // Create courses for Fall 2025
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
  console.log('Created Mock Courses.');

  // Create timetable entries
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
  console.log('Created Mock Timetable.');

  // Create grades
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
  console.log('Created Mock Grades.');

  // Create announcements
  const announce1 = new Announcement({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    news: [
      { subject: 'Midterm Syllabus', date: '01 Oct 2025', description: 'Chapters 1 to 4 are included.' }
    ]
  });
  await announce1.save();
  console.log('Created Mock Announcements.');

  // Create attendance
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
  console.log('Created Mock Attendance.');

  // Create submissions
  const sub1 = new Submission({
    userId,
    courseUrl: 'mock_url_ai',
    courseName: 'Artificial Intelligence',
    tasks: [
      { title: 'Project Proposal', description: 'Submit AI project draft', startDate: '2025-09-10', dueDate: '2025-09-20', status: 'Submitted' }
    ]
  });
  await sub1.save();
  console.log('Created Mock Submissions.');

  // Create tasks (academic and non-academic)
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
  console.log('Created Mock Tasks.');

  // Create notes & keynotes
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
  console.log('Created Mock Notes/Keynotes.');

  console.log('Test case user setup complete!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
