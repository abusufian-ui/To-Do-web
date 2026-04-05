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

// 🚨 NEW: IMPORT HTTP AND SOCKET.IO
const http = require('http');
const { Server } = require('socket.io');

// --- PUSH NOTIFICATIONS & CRON ---
const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const axios = require('axios'); 

// --- MODELS ---
const User = require('./models/User');
const Task = require('./models/Task');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const Timetable = require('./models/TimetableModel');
const Habit = require('./models/Habit');
const Course = require('./models/Course');
const Note = require('./models/Note');
const Keynote = require('./models/Keynote');
const NamazRecord = require('./models/NamazRecord');
const { Transaction, Budget, Debt } = require('./models/Transaction');
const Attendance = require('./models/Attendance');
const Submission = require('./models/Submission');
const Announcement = require('./models/Announcement');
const Feedback = require('./models/Feedback'); 

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = "ranasuffyan9@gmail.com";
const resend = new Resend(process.env.RESEND_API_KEY);
let expo = new Expo(); 

// ==========================================
// 🕌 ALADHAN API HELPER (Bulletproof caching)
// ==========================================
let cachedPrayerTimes = null;
let lastFetchDate = null;

async function getLahorePrayerTimes(todayStr) {
    if (lastFetchDate !== todayStr || !cachedPrayerTimes) {
        try {
            const response = await axios.get('https://api.aladhan.com/v1/timingsByCity?city=Lahore&country=Pakistan&method=1');
            const timings = response.data.data.timings;
            cachedPrayerTimes = { 
                fajr: timings.Fajr, 
                zuhr: timings.Dhuhr, 
                asr: timings.Asr, 
                maghrib: timings.Maghrib, 
                isha: timings.Isha 
            };
            lastFetchDate = todayStr;
        } catch (err) {
            console.error("Failed to fetch Aladhan API:", err.message);
            return null;
        }
    }
    return cachedPrayerTimes;
}

// ==========================================
// 🎨 PREMIUM EMAIL HTML TEMPLATE
// ==========================================
const generateEmailTemplate = (title, code, message) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; padding: 40px 20px; text-align: center;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #f3f4f6;">
      <h2 style="color: #111827; margin-bottom: 10px; font-size: 24px; font-weight: 800;">${title}</h2>
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 30px; line-height: 1.5;">${message}</p>
      
      <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px dashed #bfdbfe;">
        <span style="font-size: 36px; font-weight: 900; color: #2563eb; letter-spacing: 8px;">${code}</span>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">If you didn't request this code, you can safely ignore this email. This verification code expires in 5 minutes.</p>
    </div>
  </div>
`;

// ==========================================
// 🚀 MULTI-DEVICE PUSH NOTIFICATION HELPER
// ==========================================
async function sendPush(user, title, body, data = {}, categoryId = "smart-alert", channelId = "default") {
    let tokens = [];
    if (user.pushTokens && user.pushTokens.length > 0) {
        tokens = user.pushTokens.filter(t => Expo.isExpoPushToken(t));
    } else if (user.pushToken && Expo.isExpoPushToken(user.pushToken)) {
        tokens = [user.pushToken]; 
    }

    if (tokens.length === 0) return;

    let messages = [];
    for (let pushToken of tokens) {
        messages.push({
            to: pushToken,
            sound: channelId === "prayer-channel-live" ? 'azan.wav' : 'default',
            categoryId: categoryId, 
            channelId: channelId,   
            title,
            body,
            data
        });
    }

    try {
        let chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
        console.log(`📲 Sent push: "${title}" to ${user.email} (Category: ${categoryId})`);
    } catch(e) { 
        console.error("Push Error:", e.message); 
    }
}

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});
const OTP = mongoose.model('OTP', otpSchema);

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  durationMinutes: { type: Number, required: true }, 
  type: { type: String, enum: ['focus', 'short_break', 'long_break'], required: true },
  relatedCourse: { type: String }, 
  completedAt: { type: Date, default: Date.now }
});
const FocusSession = mongoose.model('FocusSession', focusSessionSchema);

const app = express();

// 🚨 NEW: WRAP APP IN HTTP SERVER & ATTACH WEBSOCKETS
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow mobile & web portal to connect
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

io.on('connection', (socket) => {
    // Silently handle connections
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000', 
  'http://localhost:3001',
  'http://192.168.0.104:8081',
  'https://to-do-web-01.onrender.com/api',
  'http://127.0.0.1:3001', 
  'http://localhost:8081', 
  'http://localhost:5000/',
  'https://myportalucp.online',
  'http://4.188.99.151',
  'https://horizon.ucp.edu.pk',
  'chrome-extension://fgipkgekakeenpklgdgeibndjmmcgaof'
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// ==========================================
// 🚀 ROUTES: FEEDBACK & SUPPORT
// ==========================================
app.post('/api/feedback', auth, async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) return res.status(400).json({ message: "Subject and description are required." });
    
    const newFeedback = new Feedback({ 
      userId: req.user.id, 
      subject: subject, 
      description: description 
    });
    
    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) { 
    console.error("Feedback Error:", error);
    res.status(500).json({ message: "Server Error processing feedback" }); 
  }
});

app.get('/api/admin/feedback', auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

// ==========================================
// ROUTES: UCP DATA & SYNC ENGINE
// ==========================================
app.post('/api/session/keep-alive', express.json(), auth, async (req, res) => {
    const { ucpCookie } = req.body;
    if (!ucpCookie) return res.status(400).json({ error: "No cookie provided" });
    try {
        await User.findByIdAndUpdate(req.user.id, { $set: { ucpCookie: ucpCookie, isPortalConnected: true, lastSyncAt: new Date() } }, { strict: false });
        res.status(200).json({ message: "Cookies saved to vault." });
    } catch (err) {
        res.status(500).json({ error: "Failed to secure cookie in vault" });
    }
});

app.get('/api/attendance', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(attendance);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/submissions', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(submissions);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/announcements', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/course-records/:courseName', auth, async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);
    const userId = req.user.id;
    const [announcements, attendance, submissions] = await Promise.all([
      Announcement.findOne({ userId, courseName }),
      Attendance.findOne({ userId, courseName }),
      Submission.findOne({ userId, courseName })
    ]);
    res.json({
      announcements: announcements?.news || [],
      attendance: attendance || { summary: { conducted: 0, attended: 0 }, records: [] },
      submissions: submissions?.tasks || []
    });
  } catch (error) { res.status(500).json({ message: "Error fetching course records" }); }
});

// --- THE SMART EXTENSION SYNC ---
app.post('/api/extension-sync', express.json(), auth, async (req, res) => {
  try {
    const { gradesData, historyData, statsData, timetableData, attendanceData, announcementsData, submissionsData, portalId, ucpCookie } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    // --- SMART ID BYPASS FOR BACKGROUND ENGINE ---
    let activePortalId = portalId;
    if (activePortalId === "BACKGROUND_SYNC" && user.portalId) {
        activePortalId = user.portalId; 
    }

    if (!activePortalId) throw new Error("Student ID not detected.");
    if (user.portalId && user.portalId.toUpperCase() !== activePortalId.toUpperCase()) {
      throw new Error(`Mismatch! Linked to ${user.portalId}, but found ${activePortalId}.`);
    }
    if (!user.portalId) user.portalId = activePortalId.toUpperCase();

    // 1. SMART DIFFING & SAFE SAVING: ATTENDANCE
    if (attendanceData && attendanceData.length > 0) {
        for (const att of attendanceData) {
            if (!att.courseUrl || !att.courseName || att.courseName.includes("Unknown")) continue;

            if (att.records) {
                const oldAtt = await Attendance.findOne({ userId, courseUrl: att.courseUrl });
                
                if (oldAtt && oldAtt.summary && att.summary) {
                    const oldAbsents = oldAtt.summary.conducted - oldAtt.summary.attended;
                    const newAbsents = att.summary.conducted - att.summary.attended;
                    
                    if (newAbsents > oldAbsents) {
                        sendPush(user, `Attendance Alert: ${att.courseName} ⚠️`, `You have been marked absent! Total absents: ${newAbsents}`);
                        if (newAbsents >= 10 && oldAbsents < 10) {
                            sendPush(user, `CRITICAL: ${att.courseName} 🚨`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
                        }
                    }
                }
                await Attendance.findOneAndUpdate({ userId, courseUrl: att.courseUrl }, { ...att, lastUpdated: new Date() }, { upsert: true });
            }
        }
    }

    // 2. SMART DIFFING & SAFE SAVING: ANNOUNCEMENTS
    if (announcementsData && announcementsData.length > 0) {
        for (const ann of announcementsData) {
            if (!ann.courseUrl || !ann.courseName || ann.courseName.includes("Unknown")) continue;

            if (ann.news) {
                const oldAnn = await Announcement.findOne({ userId, courseUrl: ann.courseUrl });
                if (oldAnn && oldAnn.news) {
                    if (ann.news.length > oldAnn.news.length) {
                        sendPush(user, `New Announcement: ${ann.courseName} 📢`, ann.news[0].subject || "Tap to view details.");
                    }
                }
                await Announcement.findOneAndUpdate({ userId, courseUrl: ann.courseUrl }, { ...ann, lastUpdated: new Date() }, { upsert: true });
            }
        }
    }

    // 3. SAFE SAVING: SUBMISSIONS
    if (submissionsData && submissionsData.length > 0) {
        for (const sub of submissionsData) {
            if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;
            
            if (sub.tasks) {
                await Submission.findOneAndUpdate({ userId, courseUrl: sub.courseUrl }, { ...sub, lastUpdated: new Date() }, { upsert: true });
            }
        }
    }

    // --- STANDARD ACADEMIC DATA ---
    if (gradesData && gradesData.length > 0) {
      await Grade.deleteMany({ userId });
      for (const grade of gradesData) {
        if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
        await Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...grade, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    if (historyData && historyData.length > 0) {
      await ResultHistory.deleteMany({ userId });
      for (const sem of historyData) {
        await ResultHistory.findOneAndUpdate({ term: sem.term, userId }, { ...sem, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    if (statsData && statsData.cgpa) {
      await StudentStats.findOneAndUpdate({ userId }, { ...statsData, userId, lastUpdated: new Date() }, { upsert: true });
    }

    if (timetableData && timetableData.length > 0) {
      await Timetable.deleteMany({ userId });
      const courseMap = new Map();
      
      for (const classItem of timetableData) {
        const { id, ...classData } = classItem;
        if (!classData.courseName || classData.courseName.includes("Unknown")) continue;

        await new Timetable({ ...classData, userId, lastUpdated: new Date() }).save();
        
        if (!courseMap.has(classItem.courseName)) courseMap.set(classItem.courseName, { name: classItem.courseName, code: classItem.courseCode || '', color: classItem.color || '#3498db', instructors: new Set(), rooms: new Set() });
        const course = courseMap.get(classItem.courseName);
        if (classItem.instructor && !classItem.instructor.includes('Unknown')) course.instructors.add(classItem.instructor);
        if (classItem.room && !classItem.room.includes('Unknown')) course.rooms.add(classItem.room);
      }

      for (const [courseName, data] of courseMap.entries()) {
        await Course.findOneAndUpdate(
          { userId, name: courseName },
          { $set: { userId, name: data.name, type: 'university', code: data.code || '', color: data.color || '#3498db', instructors: Array.from(data.instructors), rooms: Array.from(data.rooms) } },
          { upsert: true }
        );
      }
    }

    await User.updateOne({ _id: userId }, { $set: { isPortalConnected: true, lastSyncAt: new Date(), portalId: user.portalId, ucpCookie: ucpCookie || user.ucpCookie } });
    
    res.json({ message: "Sync & Diffing complete securely!" });

  } catch (error) {
    const statusCode = error.message.includes('Mismatch') || error.message.includes('not detected') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
});


// ==========================================
// 🚀 LOCAL MEDIA STORAGE CONFIGURATION 🚀
// (Replacing Cloudinary)
// ==========================================

const uploadDir = '/var/www/student_portal/media/';

// Ensure the directory exists when the server starts
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); 
  },
  filename: function (req, file, cb) {
    // Generate a unique file name to prevent overwriting
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit to protect 1GB RAM
});

// ==========================================
// REST OF THE ROUTES
// ==========================================

const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("🔗 Connecting to MyPortal Database...");

// 🚨 NEW: CONNECT TO MONGODB AND ACTIVATE CHANGE STREAMS
mongoose.connect(dbLink).then(async () => { 
    console.log("✅ MongoDB Connected Successfully!"); 

    try {
        // These are the models that should trigger a frontend refresh when modified
        const modelsToWatch = [Task, Transaction, Debt, Habit, Keynote, NamazRecord, Attendance, Submission, Announcement, Timetable, Grade, Course];
        
        modelsToWatch.forEach(model => {
            if (model.watch) {
                const changeStream = model.watch();
                changeStream.on('change', (change) => {
                    // Blast the update signal to the frontend (Web & Mobile)
                    io.emit('live_db_update'); 
                });
            }
        });
        console.log("🟢 Database Live Sync Watchdogs Active!");
    } catch (err) {
        console.log("⚠️ MongoDB Change Streams require a Replica Set (Active by default on MongoDB Atlas).");
    }

}).catch(err => console.log(err));

// --- THE UPDATED UPLOAD ROUTE ---
app.post('/api/upload', auth, (req, res) => {
  upload.array('files', 10)(req, res, function (err) {
    if (err) return res.status(500).json({ error: "Upload failed", details: err.message });
    try {
      if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
      
      const urls = req.files.map(file => `https://api.myportalucp.online/media/${file.filename}`);
      
      res.status(200).json({ message: 'Upload successful', urls: urls });
    } catch (error) { 
      res.status(500).json({ error: 'Failed to process files after upload' }); 
    }
  });
});

app.get('/api/keynotes', auth, async (req, res) => {
  try { res.json(await Keynote.find({ userId: req.user.id, isDeleted: { $ne: true } }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.post('/api/keynotes', auth, async (req, res) => {
  try { res.json(await new Keynote({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/keynotes/:id/read', auth, async (req, res) => {
  try { res.json(await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true }, { new: true })); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/keynotes/:id', auth, async (req, res) => {
  try {
    const { title, content, courseName, mediaUrls, type } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
    const keynote = await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { title: title.trim(), content: content?.trim() || "", courseName: courseName || "General", mediaUrls: mediaUrls || [], type: type || 'mixed' }, { new: true, runValidators: true });
    if (!keynote) return res.status(404).json({ message: "Keynote not found" });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/keynotes/:id/unread', auth, async (req, res) => {
  try { res.json(await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: false }, { new: true })); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/keynotes/:id/delete', auth, async (req, res) => {
  try { res.json(await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true })); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/keynotes/:id/restore', auth, async (req, res) => {
  try { res.json(await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true })); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.delete('/api/keynotes/:id', auth, async (req, res) => {
  try { await Keynote.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/admin/system-stats', async (req, res) => {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();
    
    // 🚨 NEW: Fetch Azure VM Hard Drive Space
    const disks = await si.fsSize();
    // Usually the primary partition is mounted at '/' on Linux/Ubuntu VMs
    const rootDisk = disks.find(d => d.mount === '/') || disks[0] || { size: 30 * 1024 * 1024 * 1024, used: 0 }; 
    
    let dbSize = 0;
    if (mongoose.connection.readyState === 1) dbSize = (await mongoose.connection.db.stats()).dataSize; 
    
    res.json({ 
      cpu: Math.round(cpuLoad.currentLoad), 
      memory: { active: mem.active, total: mem.total }, 
      dbSize: dbSize,
      disk: { total: rootDisk.size, used: rootDisk.used } // Added to response
    });
  } catch (error) { res.status(500).json({ message: "Failed" }); }
});
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    // 🚨 NEW: Calculate Per-User Storage Footprint
    const usersWithStorage = await Promise.all(users.map(async (user) => {
        let storageBytes = 15360; // 15KB base estimate for MongoDB text records

        // Scan local media vault for this user's Keynote uploads
        const keynotes = await Keynote.find({ userId: user._id });
        for(let kn of keynotes) {
            if (kn.mediaUrls && kn.mediaUrls.length > 0) {
                for(let url of kn.mediaUrls) {
                    try {
                        const filename = url.split('/').pop();
                        const filepath = path.join('/var/www/student_portal/media/', filename);
                        if (fs.existsSync(filepath)) {
                            storageBytes += fs.statSync(filepath).size; // Add file size to their total
                        }
                    } catch (e) { /* Safely ignore missing files */ }
                }
            }
        }

        return { 
            _id: user._id, 
            name: user.name, 
            email: user.email, 
            isAdmin: user.isAdmin, 
            isPortalConnected: user.isPortalConnected, 
            portalId: user.portalId, 
            lastSyncAt: user.lastSyncAt, 
            createdAt: user.createdAt,
            storageUsed: storageBytes // Added to response
        };
    }));

    res.json(usersWithStorage);
  } catch (error) { res.status(500).json({ message: error.message }); }
});
app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return res.status(400).json({ message: "Cannot delete yourself!" });
    await Promise.all([User.findByIdAndDelete(userId), Grade.deleteMany({ userId }), ResultHistory.deleteMany({ userId }), StudentStats.deleteMany({ userId }), Task.deleteMany({ userId }), Transaction.deleteMany({ userId }), Budget.deleteMany({ userId }), Timetable.deleteMany({ userId }), Habit.deleteMany({ userId }), Course.deleteMany({ userId }), Note.deleteMany({ user: userId }), Keynote.deleteMany({ userId }), FocusSession.deleteMany({ userId }), Attendance.deleteMany({ userId }), Submission.deleteMany({ userId }), Announcement.deleteMany({ userId })]);
    res.json({ message: "User deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/debts', auth, async (req, res) => { try { res.json(await Debt.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/debts', auth, async (req, res) => { try { res.json(await new Debt({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/debts/:id/status', auth, async (req, res) => { try { res.json(await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { status: req.body.status }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/debts/:id/delete', auth, async (req, res) => { try { res.json(await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/debts/:id/restore', auth, async (req, res) => { try { res.json(await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/debts/:id', auth, async (req, res) => { try { await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/debts/:id/pay', auth, async (req, res) => {
  try {
    const { amount, date, description, type, category } = req.body;
    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!debt) return res.status(404).json({ message: "Not found" });
    if (Number(amount) > debt.amount) return res.status(400).json({ message: "Exceeds debt" });
    debt.amount -= Number(amount);
    if (debt.amount === 0) debt.status = 'paid';
    await debt.save();
    const newTransaction = await new Transaction({ userId: req.user.id, type, amount: Number(amount), category, description: description || `Payment: ${debt.person}`, date: date || new Date().toISOString() }).save();
    res.json({ success: true, debt, transaction: newTransaction });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/notes', auth, async (req, res) => {
  try {
    const { _id, title, courseId, content, referenceFiles } = req.body;
    if (_id) return res.json(await Note.findByIdAndUpdate(_id, { title, courseId, content, referenceFiles }, { new: true }));
    res.json(await new Note({ user: req.user.id, title, courseId, content: content || " ", referenceFiles }).save());
  } catch (error) { res.status(500).json({ error: "Error" }); }
});
app.get('/api/notes', auth, async (req, res) => { try { res.json(await Note.find({ user: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: "Error" }); } });
app.put('/api/notes/:id/delete', auth, async (req, res) => { try { await Note.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }); res.json({ message: 'Bin' }); } catch (error) { res.status(500).json({ error: "Error" }); } });
app.put('/api/notes/:id/restore', auth, async (req, res) => { try { await Note.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }); res.json({ message: 'Restored' }); } catch (error) { res.status(500).json({ error: "Error" }); } });
app.delete('/api/notes/:id', auth, async (req, res) => { try { await Note.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); } catch (error) { res.status(500).json({ error: "Error" }); } });

app.post('/api/admin/verify-pin', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (req.body.pin === (user.adminPin || '0000')) return res.json({ success: true });
    res.status(400).json({ message: "Invalid PIN" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.post('/api/admin/request-pin-otp', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); 
    await OTP.findOneAndUpdate({ email: user.email }, { code }, { upsert: true, new: true });
    await resend.emails.send({ 
      from: 'MyPortal <otp@myportalucp.online>', 
      to: user.email, 
      subject: 'Admin PIN OTP', 
      html: generateEmailTemplate('Security Alert: PIN Change', code, 'You requested to change your Admin Command Center PIN.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.put('/api/admin/change-pin', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!(await OTP.findOne({ email: user.email, code: req.body.otp }))) return res.status(400).json({ message: "Invalid OTP" });
    user.adminPin = req.body.newPin; await user.save(); await OTP.deleteOne({ email: user.email }); 
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/courses', auth, async (req, res) => {
  try {
    if (!(await Course.findOne({ userId: req.user.id, name: 'General Course' }))) await new Course({ userId: req.user.id, name: 'General Course', type: 'general' }).save();
    res.json(await Course.find({ userId: req.user.id }).sort({ createdAt: 1 }));
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.post('/api/courses', auth, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ message: "Name required" });
    if (await Course.findOne({ userId: req.user.id, name: req.body.name })) return res.status(400).json({ message: "Exists" });
    res.json(await new Course({ userId: req.user.id, name: req.body.name, type: 'general' }).save());
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.delete('/api/courses/:id', auth, async (req, res) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, userId: req.user.id });
    if (!course) return res.status(404).json({ message: "Not found" });
    if (['general', 'general course'].includes(course.name.toLowerCase().trim())) return res.status(403).json({ message: "Permanent course" });
    await Course.findByIdAndDelete(req.params.id);
    await Task.updateMany({ userId: req.user.id, course: course.name }, { $set: { course: "General" } });
    res.json({ message: "Removed safely" });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/send-otp', async (req, res) => {
  try {
    if (await User.findOne({ email: req.body.email })) return res.status(400).json({ message: "Registered" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email: req.body.email }, { code }, { upsert: true, new: true });
    await resend.emails.send({ 
      from: 'MyPortal <otp@myportalucp.online>', 
      to: req.body.email, 
      subject: 'Welcome to MyPortal', 
      html: generateEmailTemplate('Welcome to MyPortal', code, 'Please use the following verification code to complete your registration.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/register', async (req, res) => {
  try {
    if (!(await OTP.findOne({ email: req.body.email, code: req.body.otp }))) return res.status(400).json({ message: "Invalid OTP" });
    if (await User.findOne({ email: req.body.email })) return res.status(400).json({ message: 'Exists' });
    const user = new User({ name: req.body.name, email: req.body.email, password: await bcrypt.hash(req.body.password, await bcrypt.genSalt(10)), isAdmin: req.body.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() });
    await user.save(); await OTP.deleteOne({ email: req.body.email });
    res.json({ token: jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' }), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });
    res.json({ token: jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' }), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isPortalConnected: user.isPortalConnected } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => { try { res.json(await User.findById(req.user.id).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.post('/api/forgot-password', async (req, res) => {
  try {
    if (!(await User.findOne({ email: req.body.email }))) return res.status(400).json({ message: "No account found" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email: req.body.email }, { code }, { upsert: true, new: true });
    await resend.emails.send({ 
      from: 'MyPortal <otp@myportalucp.online>', 
      to: req.body.email, 
      subject: 'Password Reset', 
      html: generateEmailTemplate('Password Reset', code, 'You requested a password reset. Use the code below to securely change your password.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    if (!(await OTP.findOne({ email: req.body.email, code: req.body.otp }))) return res.status(400).json({ message: "Invalid OTP" });
    const user = await User.findOne({ email: req.body.email });
    user.password = await bcrypt.hash(req.body.newPassword, await bcrypt.genSalt(10));
    await user.save(); await OTP.deleteOne({ email: req.body.email }); 
    res.json({ message: "Password updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.put('/api/user/profile', auth, async (req, res) => { try { res.json(await User.findByIdAndUpdate(req.user.id, { name: req.body.name }, { new: true }).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/user/password', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) return res.status(400).json({ message: "Incorrect password" });
    user.password = await bcrypt.hash(req.body.newPassword, await bcrypt.genSalt(10)); await user.save();
    res.json({ message: "Password updated" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/user/push-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const token = req.body.token;
    if (token) {
        if (!user.pushTokens) user.pushTokens = [];
        if (!user.pushTokens.includes(token)) {
            user.pushTokens.push(token);
            await user.save();
        }
    }
    res.json({ success: true, message: "Push token registered" });
  } catch (error) { res.status(500).json({ message: "Failed to update token" }); }
});

app.put('/api/user/preferences', auth, async (req, res) => { try { await User.findByIdAndUpdate(req.user.id, { prayerNotifs: req.body.prayerNotifs }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.post('/api/user/link-portal', auth, async (req, res) => {
  try { await User.findByIdAndUpdate(req.user.id, { portalId: req.body.portalId, isPortalConnected: true }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { portalId: null, isPortalConnected: false, lastSyncAt: null, ucpCookie: null }, { strict: false });
    await Promise.all([ Grade.deleteMany({ userId: req.user.id }), ResultHistory.deleteMany({ userId: req.user.id }), StudentStats.deleteMany({ userId: req.user.id }), Timetable.deleteMany({ userId: req.user.id }), Course.deleteMany({ userId: req.user.id, type: 'university' }) ]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.get('/api/user/portal-status', auth, async (req, res) => { try { const user = await User.findById(req.user.id); res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/timetable', auth, async (req, res) => { try { res.json((await Timetable.find({ userId: req.user.id })).map(i => ({...i.toObject(), id: i._id}))); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/student-stats', auth, async (req, res) => { try { res.json(await StudentStats.findOne({ userId: req.user.id }) || { cgpa: "0.00", credits: "0", inprogressCr: "0" }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/grades', auth, async (req, res) => { try { res.json(await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/results-history', auth, async (req, res) => { try { res.json(await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/focus-sessions', auth, async (req, res) => { try { res.json(await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/focus-sessions', auth, async (req, res) => { try { res.json(await new FocusSession({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/tasks', auth, async (req, res) => { try { res.json(await Task.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.post('/api/tasks', auth, async (req, res) => { try { res.json(await new Task({ ...req.body, userId: req.user.id }).save()); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/tasks/:id', auth, async (req, res) => { try { res.json(await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: req.body }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/tasks/:id/acknowledge', auth, async (req, res) => { try { await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { acknowledged: true }); res.json({ success: true }); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/tasks/:id/delete', auth, async (req, res) => { try { res.json(await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/tasks/:id/restore', auth, async (req, res) => { try { res.json(await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/tasks/:id', auth, async (req, res) => { try { await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); res.json({ message: "Deleted" }); } catch (err) { res.status(500).json({ message: err.message }) } });

app.get('/api/transactions', auth, async (req, res) => { try { res.json(await Transaction.find({ userId: req.user.id, isDeleted: false }).sort({ date: -1, createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/transactions', auth, async (req, res) => { try { res.json(await new Transaction({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/transactions/:id/delete', auth, async (req, res) => { try { res.json(await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/transactions/:id/restore', auth, async (req, res) => { try { res.json(await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/transactions/:id', auth, async (req, res) => { try { await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/budgets', auth, async (req, res) => { try { res.json(await Budget.find({ userId: req.user.id })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/budgets', auth, async (req, res) => { try { res.json(await Budget.findOneAndUpdate({ category: req.body.category, userId: req.user.id }, { limit: req.body.limit, userId: req.user.id }, { upsert: true, new: true })); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/habits', auth, async (req, res) => { try { res.json(await Habit.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/habits', auth, async (req, res) => { try { res.json(await new Habit({ ...req.body, userId: req.user.id, startDate: new Date() }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id/delete', auth, async (req, res) => { try { res.json(await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/habits/:id/restore', auth, async (req, res) => { try { res.json(await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true })); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/habits/:id', auth, async (req, res) => { try { await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id/reset', auth, async (req, res) => { try { const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id }); habit.startDate = new Date(); habit.cheatDays = []; await habit.save(); res.json(habit); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id/cheat', auth, async (req, res) => { try { const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id }); habit.cheatDays.push(new Date()); await habit.save(); res.json(habit); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id/checkin', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.checkIns.push(new Date());
    const uniqueDays = new Set(habit.checkIns.map(d => new Date(d).setHours(0,0,0,0)));
    if (uniqueDays.size > habit.longestStreak) habit.longestStreak = uniqueDays.size;
    await habit.save(); res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

// ==========================================
// 🕌 THE SMART NAMAZ UNLOCK ROUTE
// ==========================================
app.get('/api/namaz/today', auth, async (req, res) => {
    try {
        const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
        let todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;
        
        // 1. Get times for today
        const times = await getLahorePrayerTimes(todayStr);
        if (!times) return res.status(500).json({ message: "API Error" });

        const currentMins = lahoreDateObj.getHours() * 60 + lahoreDateObj.getMinutes();
        const [fajrH, fajrM] = times.fajr.split(':').map(Number);
        const fajrMins = fajrH * 60 + fajrM;

        // 2. MIDNIGHT FIX: If it's before Fajr (e.g., 2 AM), the "current" Islamic day is yesterday.
        if (currentMins < fajrMins) {
            const yesterday = new Date(lahoreDateObj);
            yesterday.setDate(yesterday.getDate() - 1);
            todayStr = `${yesterday.getDate()}-${yesterday.getMonth() + 1}-${yesterday.getFullYear()}`;
        }

        let record = await NamazRecord.findOne({ userId: req.user.id, dateStr: todayStr });
        if (!record) record = new NamazRecord({ userId: req.user.id, dateStr: todayStr });

        let modified = false;
        const prayerOrder = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];

        for (let i = 0; i < prayerOrder.length; i++) {
            const pName = prayerOrder[i];
            const [h, m] = times[pName].split(':').map(Number);
            const pMins = h * 60 + m;

            // Is the prayer active? 
            // Active if current time is >= prayer time, OR if it's Isha and we are past midnight (currentMins < fajrMins)
            let isPastPrayerTime = currentMins >= pMins || (pName === 'isha' && currentMins < fajrMins);

            if (isPastPrayerTime) {
                if (record.prayers[pName] === 'locked') {
                    record.prayers[pName] = 'pending';
                    modified = true;
                }
                
                // Mark previous prayers as missed if we entered a new prayer time
                if (i > 0) {
                    const prevP = prayerOrder[i-1];
                    if (record.prayers[prevP] === 'pending') {
                        record.prayers[prevP] = 'missed';
                        modified = true;
                    }
                }
            }
        }

        if (modified || record.isNew) await record.save();
        res.json(record);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/namaz/offer', auth, async (req, res) => {
   try {
       const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
       let todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;
       
       const times = await getLahorePrayerTimes(todayStr);
       const currentMins = lahoreDateObj.getHours() * 60 + lahoreDateObj.getMinutes();
       const [fajrH, fajrM] = times.fajr.split(':').map(Number);
       
       if (currentMins < (fajrH * 60 + fajrM)) {
            const yesterday = new Date(lahoreDateObj);
            yesterday.setDate(yesterday.getDate() - 1);
            todayStr = `${yesterday.getDate()}-${yesterday.getMonth() + 1}-${yesterday.getFullYear()}`;
       }

       let record = await NamazRecord.findOne({ userId: req.user.id, dateStr: todayStr });
       if (!record) record = new NamazRecord({ userId: req.user.id, dateStr: todayStr });
       
       if (record.prayers[req.body.prayerName] === 'pending') record.prayers[req.body.prayerName] = 'offered';
       else if (record.prayers[req.body.prayerName] === 'missed' || record.prayers[req.body.prayerName] === 'locked') record.prayers[req.body.prayerName] = 'qazah'; 
       
       await record.save(); res.json(record);
   } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bin', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: true }).lean();
    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: true }).lean();
    const habits = await Habit.find({ userId: req.user.id, isDeleted: true }).lean();
    const notes = await Note.find({ user: req.user.id, isDeleted: true }).lean(); 
    const keynotes = await Keynote.find({ userId: req.user.id, isDeleted: true }).lean(); 
    res.json({ tasks, transactions, habits, notes, keynotes });
  } catch (err) { res.status(500).json({ message: err.message }) }
});
app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Transaction.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Habit.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Note.updateMany({ user: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null }); 
    await Keynote.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null }); 
    res.json({ message: "Restored" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});
app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    await Transaction.deleteMany({ userId: req.user.id, isDeleted: true });
    await Habit.deleteMany({ userId: req.user.id, isDeleted: true });
    await Note.deleteMany({ user: req.user.id, isDeleted: true }); 
    await Keynote.deleteMany({ userId: req.user.id, isDeleted: true }); 
    res.json({ message: "Emptied" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.get('/', (req, res) => { res.json({ message: "API is running 🚀" }); });


// ==========================================
// 🔔 THE 1-MINUTE CRON ENGINES 
// ==========================================

cron.schedule('* * * * *', async () => {

  // ---------------------------------------------------------
  // ENGINE 1: STANDARD TASK REMINDERS
  // ---------------------------------------------------------
  try {
    const now = new Date();
    
    const target15Start = new Date(now.getTime() + (15 * 60000));
    target15Start.setSeconds(0, 0); 
    const target15End = new Date(target15Start.getTime() + 59999); 

    const targetExactStart = new Date(now.getTime());
    targetExactStart.setSeconds(0, 0);
    const targetExactEnd = new Date(targetExactStart.getTime() + 59999);

    const orConditions = [
        { triggerAt: { $gte: target15Start, $lte: target15End } },
        { triggerAt: { $gte: targetExactStart, $lte: targetExactEnd } }
    ];

    const currentHour = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })).getHours();
    const currentMinute = now.getMinutes();
    if (currentMinute === 0 && [9, 12, 15, 19].includes(currentHour)) {
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        orConditions.push({ date: `${yyyy}-${mm}-${dd}`, time: null });
    }

    const upcomingTasks = await Task.find({ 
        completed: false, 
        isDeleted: false, 
        acknowledged: false, 
        $or: orConditions 
    }).populate('userId');

    if (upcomingTasks.length > 0) {
        console.log(`[CRON] Found ${upcomingTasks.length} tasks ready to fire!`);
    }

    for (let task of upcomingTasks) {
      if (!task.userId) continue;
      let bodyText = `Task: ${task.name}`;
      
      if (task.time && new Date(task.triggerAt) > now) bodyText = `Starts in 15 mins: ${task.name}`;
      else if (task.time && new Date(task.triggerAt) <= now) bodyText = `It is time for: ${task.name}`;
      else bodyText = `Daily Reminder: ${task.name}`;

      sendPush(task.userId, `Task Reminder: ${task.course || 'General'} 📌`, bodyText, { taskId: task._id, type: 'task' });
    }
  } catch (error) { console.error(`[TASK ENGINE] Error:`, error); }

  // ---------------------------------------------------------
  // 🕌 ENGINE 2: LIVE PRAYER ALERTS (Bulletproof HH:mm)
  // ---------------------------------------------------------
  try {
    const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;
    
    // Safely pad single digits so 2:05 PM becomes "14:05" to perfectly match Aladhan API
    const h = String(lahoreDateObj.getHours()).padStart(2, '0');
    const m = String(lahoreDateObj.getMinutes()).padStart(2, '0');
    const currentLahoreTime = `${h}:${m}`;

    const times = await getLahorePrayerTimes(todayStr);

    if (times) {
        let currentPrayer = null;
        for (const [prayer, time] of Object.entries(times)) {
          if (time === currentLahoreTime) { currentPrayer = prayer; break; }
        }

        if (currentPrayer) {
          console.log(`[PRAYER ENGINE] 🕌 Match found! Triggering ${currentPrayer}...`);
          const prayerUsers = await User.find({ prayerNotifs: true });
          const prayerOrder = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha']; 
          const pIndex = prayerOrder.indexOf(currentPrayer);

          for (let user of prayerUsers) {
            let record = await NamazRecord.findOne({ userId: user._id, dateStr: todayStr });
            if (!record) record = new NamazRecord({ userId: user._id, dateStr: todayStr });

            if (pIndex > 0) {
               const prevPrayer = prayerOrder[pIndex - 1];
               if (record.prayers[prevPrayer] === 'pending') record.prayers[prevPrayer] = 'missed';
            }
            
            record.prayers[currentPrayer] = 'pending';
            await record.save();
            
            sendPush(
                user, 
                `🕌 ${currentPrayer.charAt(0).toUpperCase() + currentPrayer.slice(1)} Prayer Time`, 
                `It is time for ${currentPrayer.charAt(0).toUpperCase() + currentPrayer.slice(1)} prayer. Please take a moment to pray.`, 
                { type: 'prayer', prayerName: currentPrayer },
                "prayer-alert",         
                "prayer-channel-live"   
            );
          }
        }
    }
  } catch (error) { console.error(`[PRAYER ENGINE] Error:`, error); }

  // ---------------------------------------------------------
  // ENGINE 3: CLASS REMINDERS
  // ---------------------------------------------------------
  try {
    const pktNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const targetTime = new Date(pktNow.getTime() + 5 * 60000);
    const targetDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][targetTime.getDay()];
    
    const targetHours = targetTime.getHours();
    const targetMins = targetTime.getMinutes();

    const todaysClasses = await Timetable.find({ day: targetDay }).populate('userId').catch(err => []);

    for (let cls of todaysClasses) {
      if (!cls || !cls.userId || !cls.startTime) continue;

      let classHours = -1, classMinutes = -1;
      const timeMatch = String(cls.startTime).trim().match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
      
      if (timeMatch) {
        classHours = parseInt(timeMatch[1], 10);
        classMinutes = parseInt(timeMatch[2], 10);
        const modifier = timeMatch[3];
        if (modifier) {
           const isPM = modifier.toLowerCase() === 'pm';
           if (isPM && classHours < 12) classHours += 12;
           if (!isPM && classHours === 12) classHours = 0;
        }
      }

      if (classHours === targetHours && classMinutes === targetMins) {
        console.log(`[CLASS ENGINE] 🏫 Match found! Alerting user for ${cls.courseName}`);
        
        const instructorName = (cls.instructor && !String(cls.instructor).includes('Unknown')) ? cls.instructor : "Your teacher";
        const roomInfo = (cls.room && !String(cls.room).includes('Unknown')) ? ` (Room: ${cls.room})` : "";
        
        sendPush(
            cls.userId, 
            `Upcoming Class: ${cls.courseName} 📚`, 
            `${instructorName} is starting the lecture in 5 mins${roomInfo}`, 
            { type: 'class', classId: cls._id }
        );
      }
    }
  } catch (error) { console.error(`[CLASS ENGINE] Error:`, error.message); }

  // ---------------------------------------------------------
  // ENGINE 4: SUBMISSION DEADLINE ALERTS
  // ---------------------------------------------------------
  try {
    const allSubmissions = await Submission.find({}).populate('userId');
    const now = new Date();

    for (let sub of allSubmissions) {
        if (!sub.userId || !sub.tasks || sub.tasks.length === 0) continue;

        for (let task of sub.tasks) {
            if (task.status.toLowerCase().includes('submitted')) continue;
            
            const dueDate = new Date(task.dueDate);
            if (isNaN(dueDate)) continue;

            const diffMinutes = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
            let alertMsg = null;
            
            if (diffMinutes === 24 * 60) alertMsg = "24 Hours Remaining!";
            else if (diffMinutes === 12 * 60) alertMsg = "12 Hours Remaining!";
            else if (diffMinutes === 6 * 60) alertMsg = "6 Hours Remaining!";
            else if (diffMinutes === 2 * 60) alertMsg = "2 Hours Remaining! Hurry!";
            else if (diffMinutes === 30) alertMsg = "FINAL WARNING: 30 Mins Left!";

            if (alertMsg) {
                sendPush(sub.userId, `Deadline Alert: ${sub.courseName} ⚠️`, `${alertMsg} for "${task.title}".`, { type: 'submission', url: task.submissionUrl });
            }
        }
    }
  } catch (error) { console.error(`[DEADLINE ENGINE] Error:`, error.message); }
});

// 🚨 NEW: LAUNCH THE COMBINED HTTP/WEBSOCKET SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`));