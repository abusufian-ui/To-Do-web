require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { encrypt, decrypt } = require('./utils/encryption');
const { Resend } = require('resend');
const Note = require('./models/Note');

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = "ranasuffyan9@gmail.com";
const resend = new Resend(process.env.RESEND_API_KEY);

// --- MIDDLEWARE ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET || 'secret_key_123');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(400).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access Denied: Admins Only" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// --- MODELS ---
const User = require('./models/User');
const Task = require('./models/Task');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const { Transaction, Budget } = require('./models/Transaction');
const Timetable = require('./models/TimetableModel');
const Habit = require('./models/Habit');
const Course = require('./models/Course'); 

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});
const OTP = mongoose.model('OTP', otpSchema);

const app = express();

// --- SECURE CORS CONFIGURATION (BULLETPROOFED) ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081', 
  'http://192.168.0.100:8081', 
  'https://myportalucp.online',
  'https://horizon.ucp.edu.pk',
  'chrome-extension://fgipkgekakeenpklgdgeibndjmmcgaof' // Your exact dev extension ID
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'], 
  credentials: true,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.use(express.json());

// --- SERVE UPLOADED FILES STATICALLY ---
// This allows the frontend to download the files via the URL
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// --- MULTER CONFIGURATION (PRESERVES EXTENSIONS) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });


// --- DATABASE CONNECTION ---
const dbLink = process.env.REACT_APP_MONGODB_URI;

console.log("🔗 Connecting to MyPortal Database...");

mongoose.connect(dbLink)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully!");
  })
  .catch(err => console.log(err));

// --- ADMIN ROUTES ---

// 1. SYSTEM STATS (REAL-TIME DATA)
app.get('/api/admin/system-stats', async (req, res) => {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();

    let dbSize = 0;
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      dbSize = stats.dataSize; 
    }

    res.json({
      cpu: Math.round(cpuLoad.currentLoad),
      memory: {
        active: mem.active,
        total: mem.total
      },
      dbSize: dbSize
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// 2. GET USERS 
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const cleanUsers = users.map(user => {
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isPortalConnected: user.isPortalConnected,
        portalId: user.portalId,
        lastSyncAt: user.lastSyncAt, 
        createdAt: user.createdAt
      };
    });
    res.json(cleanUsers);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 3. DELETE USER
app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ message: "You cannot delete yourself!" });
    }
    await Promise.all([
      User.findByIdAndDelete(userId),
      Grade.deleteMany({ userId }),
      ResultHistory.deleteMany({ userId }),
      StudentStats.deleteMany({ userId }),
      Task.deleteMany({ userId }),
      Transaction.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      Timetable.deleteMany({ userId }),
      Habit.deleteMany({ userId }),
      Course.deleteMany({ userId }) 
    ]);
    res.json({ message: "User deleted permanently." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- NOTES MANAGEMENT ---
app.post('/api/notes', auth, async (req, res) => {
  try {
    const { _id, title, courseId, content, referenceFiles } = req.body;
    if (_id) { 
      const updatedNote = await Note.findByIdAndUpdate(_id, { title, courseId, content, referenceFiles }, { new: true });
      return res.json(updatedNote);
    }
    const newNote = new Note({ user: req.user.id, title, courseId, content, referenceFiles });
    await newNote.save();
    res.json(newNote);
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.put('/api/notes/:id/delete', auth, async (req, res) => {
  try {
    await Note.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
    res.json({ message: 'Moved to bin' });
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.put('/api/notes/:id/restore', auth, async (req, res) => {
  try {
    await Note.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
    res.json({ message: 'Restored from bin' });
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted permanently' });
  } catch (error) { res.status(500).json({ error: "Server Error" }); }
});

// --- FILE UPLOAD ROUTE ---
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate the local URL so the frontend can download it
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const originalName = req.file.originalname;

    res.status(200).json({ 
      message: 'Upload successful', 
      url: fileUrl,
      fileName: originalName
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// --- ADMIN SECURITY (PIN) ROUTES ---
app.post('/api/admin/verify-pin', auth, adminAuth, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user.id);
    const actualPin = user.adminPin || '0000'; 
    
    if (pin === actualPin) return res.json({ success: true });
    res.status(400).json({ message: "Invalid Security PIN" });
  } catch (error) { res.status(500).json({ message: "Server error" }); }
});

app.post('/api/admin/request-pin-otp', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    await OTP.findOneAndUpdate({ email: user.email }, { code }, { upsert: true, new: true });
    
    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: user.email,
      subject: 'Admin Security Alert: PIN Change OTP',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Security Action Required</h2>
          <p>You requested to change your Admin Command Center PIN.</p>
          <p>Your verification code is: <strong style="font-size: 24px; color: #dc2626;">${code}</strong></p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });
    res.json({ message: "OTP sent to admin email" });
  } catch (error) { res.status(500).json({ message: "Server error" }); }
});

app.put('/api/admin/change-pin', auth, adminAuth, async (req, res) => {
  try {
    const { otp, newPin } = req.body;
    const user = await User.findById(req.user.id);
    
    const validOTP = await OTP.findOne({ email: user.email, code: otp });
    if (!validOTP) return res.status(400).json({ message: "Invalid or expired OTP." });
    
    user.adminPin = newPin;
    await user.save();
    await OTP.deleteOne({ email: user.email }); 
    
    res.json({ success: true, message: "Security PIN successfully updated." });
  } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// --- COURSES MANAGEMENT ---
app.get('/api/courses', auth, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(courses);
  } catch (error) { res.status(500).json({ message: "Error fetching courses" }); }
});

app.post('/api/courses', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const exists = await Course.findOne({ userId: req.user.id, name });
    if (exists) return res.status(400).json({ message: "Course already exists" });

    const newCourse = new Course({ userId: req.user.id, name, type: 'general' });
    const savedCourse = await newCourse.save();
    res.json(savedCourse);
  } catch (error) { res.status(500).json({ message: "Error adding course" }); }
});

app.delete('/api/courses/:id', auth, async (req, res) => {
  try {
    await Course.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Course deleted" });
  } catch (error) { res.status(500).json({ message: "Error deleting course" }); }
});


// --- AUTH & USER ROUTES ---
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already registered" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email }, { code }, { upsert: true, new: true });
    
    const { data, error } = await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>', 
      to: email,
      subject: 'MyPortal Verification Code',
      html: `<p>Your verification code is: <strong>${code}</strong></p>`
    });

    if (error) return res.status(500).json({ message: "Failed to send email" });
    res.json({ message: "OTP sent successfully" });

  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, otp } = req.body;
  try {
    const validOTP = await OTP.findOne({ email, code: otp });
    if (!validOTP) return res.status(400).json({ message: "Invalid or expired OTP" });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const isAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    user = new User({ name, email, password: hashedPassword, isAdmin });
    await user.save();
    await OTP.deleteOne({ email });

    const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && !user.isAdmin) {
      user.isAdmin = true;
      await user.save();
    }
    const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(400).json({ message: "No account found with that email." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email }, { code }, { upsert: true, new: true });
    
    const { error } = await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>', 
      to: email,
      subject: 'MyPortal Password Reset',
      html: `<p>Your password reset code is: <strong>${code}</strong></p>`
    });

    if (error) return res.status(500).json({ message: "Failed to send email" });
    res.json({ message: "OTP sent successfully" });
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const validOTP = await OTP.findOne({ email, code: otp });
    if (!validOTP) return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    
    await OTP.deleteOne({ email }); 

    res.json({ message: "Password updated successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/user/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true }).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

app.put('/api/user/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect current password" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

app.post('/api/user/link-portal', auth, async (req, res) => {
  const { portalId } = req.body; 
  try {
    await User.findByIdAndUpdate(req.user.id, { portalId: portalId, isPortalConnected: true });
    res.json({ success: true, message: "Account linked. Please use the Chrome Extension to sync data." });
  } catch (error) { res.status(500).json({ message: "Failed to link account." }); }
});

app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { portalId: null, portalPassword: null, isPortalConnected: false, lastSyncAt: null });
    await Promise.all([
      Grade.deleteMany({ userId: req.user.id }),
      ResultHistory.deleteMany({ userId: req.user.id }),
      StudentStats.deleteMany({ userId: req.user.id }),
      Timetable.deleteMany({ userId: req.user.id }),
      Course.deleteMany({ userId: req.user.id, type: 'university' }) 
    ]);
    res.json({ success: true, message: "Portal account removed." });
  } catch (error) { res.status(500).json({ message: "Failed to unlink account." }); }
});

app.get('/api/user/portal-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId });
  } catch (error) { res.status(500).json({ message: "Error checking status" }); }
});

app.post('/api/sync-grades', auth, async (req, res) => {
  try { res.json({ message: 'Sync is now handled via the Chrome Extension.' }); } 
  catch (error) { res.status(500).json({ message: error.message || 'Internal Server Error' }); }
});

// --- EXTENSION SYNC ROUTE ---
app.post('/api/extension-sync', auth, async (req, res) => {
  console.log("🚀 EXTENSION SYNC HIT");
console.log("BODY:", JSON.stringify(req.body, null, 2));
  try {
    const { gradesData, historyData, statsData, timetableData, portalId } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    console.log("========== EXTENSION SYNC START ==========");
    console.log("Grades:", gradesData?.length || 0);
    console.log("Timetable:", timetableData?.length || 0);

    if (!portalId) {
      return res.status(400).json({ message: "Student ID not detected." });
    }

    if (user.portalId && user.portalId.toUpperCase() !== portalId.toUpperCase()) {
      return res.status(403).json({
        message: `Mismatch! Linked to ${user.portalId}, but found ${portalId}.`
      });
    }

    if (!user.portalId) {
      user.portalId = portalId.toUpperCase();
    }

    // ==============================
    // SAVE GRADES
    // ==============================
    if (gradesData && gradesData.length > 0) {
      await Grade.deleteMany({ userId });

      for (const grade of gradesData) {
        await Grade.findOneAndUpdate(
          { courseUrl: grade.courseUrl, userId },
          { ...grade, userId, lastUpdated: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    // ==============================
    // SAVE HISTORY
    // ==============================
    if (historyData && historyData.length > 0) {
      await ResultHistory.deleteMany({ userId });

      for (const sem of historyData) {
        await ResultHistory.findOneAndUpdate(
          { term: sem.term, userId },
          { ...sem, userId, lastUpdated: new Date() },
          { upsert: true }
        );
      }
    }

    // ==============================
    // SAVE STATS
    // ==============================
    if (statsData && statsData.cgpa) {
      await StudentStats.findOneAndUpdate(
        { userId },
        { ...statsData, userId, lastUpdated: new Date() },
        { upsert: true }
      );
    }

    // ==============================
    // SAVE TIMETABLE
    // ==============================
    if (timetableData && timetableData.length > 0) {
      await Timetable.deleteMany({ userId });

      for (const classItem of timetableData) {
        const { id, ...classData } = classItem;
        await new Timetable({
          ...classData,
          userId,
          lastUpdated: new Date()
        }).save();
      }
    }

    // ==============================
    // 🔥 UNIVERSAL COURSE ENGINE
    // ==============================

    const courseMap = new Map();

    // ---- A. Extract from timetable
    if (timetableData && timetableData.length > 0) {
      timetableData.forEach(item => {
        if (!item.courseName) return;

        if (!courseMap.has(item.courseName)) {
          courseMap.set(item.courseName, {
            name: item.courseName,
            code: item.courseCode || '',
            color: item.color || '#3498db',
            instructors: new Set(),
            rooms: new Set()
          });
        }

        const course = courseMap.get(item.courseName);

        if (item.instructor && !item.instructor.includes('Unknown')) {
          course.instructors.add(item.instructor);
        }

        if (item.room && !item.room.includes('Unknown')) {
          course.rooms.add(item.room);
        }
      });
    }

    // ---- B. Extract from grades (FALLBACK FIX)
    if (gradesData && gradesData.length > 0) {
      gradesData.forEach(g => {
        if (!g.courseName) return;

        if (!courseMap.has(g.courseName)) {
          courseMap.set(g.courseName, {
            name: g.courseName,
            code: '',
            color: '#3498db',
            instructors: new Set(),
            rooms: new Set()
          });
        }
      });
    }

    // ---- C. SAVE COURSES (FORCE UPSERT)
    console.log("Saving Courses:", courseMap.size);

    for (const [courseName, data] of courseMap.entries()) {
      try {
        await Course.findOneAndUpdate(
          { userId, name: courseName },
          {
            $set: {
              userId,
              name: data.name,
              type: 'university',
              code: data.code || '',
              color: data.color || '#3498db',
              instructors: Array.from(data.instructors),
              rooms: Array.from(data.rooms)
            }
          },
          { upsert: true, new: true }
        );
        console.log(`✅ Upserted course: ${data.name}`);
      } catch (dbError) {
        console.error(`❌ DB Error saving course [${data.name}]:`, dbError.message);
      }
    }

    user.isPortalConnected = true;
    user.lastSyncAt = new Date();
    await user.save();

    console.log("========== EXTENSION SYNC COMPLETE ==========");

    res.json({ message: "Sync complete with Course persistence!" });

  } catch (error) {
    console.error("SYNC ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// --- STANDARD DATA GETTERS ---
app.get('/api/timetable', auth, async (req, res) => {
  try {
    const timetable = await Timetable.find({ userId: req.user.id });
    res.json(timetable.map(item => ({ ...item.toObject(), id: item._id })));
  } catch (error) { res.status(500).json({ message: error.message }); }
});


app.get('/api/student-stats', auth, async (req, res) => {
  try {
    const stats = await StudentStats.findOne({ userId: req.user.id });
    res.json(stats || { cgpa: "0.00", credits: "0", inprogressCr: "0" });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/grades', auth, async (req, res) => {
  try {
    const grades = await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(grades);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/results-history', auth, async (req, res) => {
  try {
    const history = await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 });
    res.json(history);
  } catch (error) { res.status(500).json({ message: error.message }); }
});


// ==========================================
// UNIVERSAL ENTITY ROUTES (Tasks, Transactions, Habits)
// ==========================================

// --- TASKS ---
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const savedTask = await new Task({ ...req.body, userId: req.user.id }).save();
    res.json(savedTask);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const updatedTask = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: req.body }, { new: true });
    res.json(updatedTask);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/tasks/:id/delete', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/tasks/:id/restore', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});


// --- TRANSACTIONS ---
app.get('/api/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: false }).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  try {
    const savedT = await new Transaction({ ...req.body, userId: req.user.id }).save();
    res.json(savedT);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/transactions/:id/delete', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(transaction);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/transactions/:id/restore', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(transaction);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});


// --- BUDGETS ---
app.get('/api/budgets', auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id });
    res.json(budgets);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/budgets', auth, async (req, res) => {
  try {
    const { category, limit } = req.body;
    const budget = await Budget.findOneAndUpdate({ category, userId: req.user.id }, { limit, userId: req.user.id }, { upsert: true, new: true });
    res.json(budget);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});


// --- HABITS ---
app.get('/api/habits', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (error) { res.status(500).json({ message: "Error fetching habits" }); }
});

app.post('/api/habits', auth, async (req, res) => {
  try {
    const savedHabit = await new Habit({ ...req.body, userId: req.user.id, startDate: new Date() }).save();
    res.json(savedHabit);
  } catch (error) { res.status(500).json({ message: "Error creating habit" }); }
});

app.put('/api/habits/:id/delete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/habits/:id/restore', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/habits/:id', auth, async (req, res) => {
  try {
    await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error deleting habit" }); }
});

app.put('/api/habits/:id/reset', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.startDate = new Date(); 
    await habit.save();
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error resetting habit" }); }
});

app.put('/api/habits/:id/cheat', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.cheatDays.push(new Date());
    await habit.save();
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error using allowance" }); }
});

app.put('/api/habits/:id/checkin', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    const today = new Date().setHours(0,0,0,0);
    if (!habit.checkIns.some(d => new Date(d).setHours(0,0,0,0) === today)) {
      habit.checkIns.push(new Date());
      if (habit.checkIns.length > habit.longestStreak) {
        habit.longestStreak = habit.checkIns.length;
      }
      await habit.save();
    }
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error checking in" }); }
});


// ==========================================
// UNIVERSAL BIN ROUTES
// ==========================================
app.get('/api/bin', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: true }).lean();
    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: true }).lean();
    const habits = await Habit.find({ userId: req.user.id, isDeleted: true }).lean();
    const notes = await Note.find({ user: req.user.id, isDeleted: true }).lean(); // Added notes to the bin payload
    
    res.json({ tasks, transactions, habits, notes });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Transaction.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Habit.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Note.updateMany({ user: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null }); // Added notes restore
    res.json({ message: "Restored" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    await Transaction.deleteMany({ userId: req.user.id, isDeleted: true });
    await Habit.deleteMany({ userId: req.user.id, isDeleted: true });
    await Note.deleteMany({ user: req.user.id, isDeleted: true }); // Added notes empty
    res.json({ message: "Emptied" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.get('/', (req, res) => {
  res.json({ message: "API is running 🚀" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT} at IP 192.168.0.100`));
module.exports = app;