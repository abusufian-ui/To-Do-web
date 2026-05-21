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

// 🚨 NEW: CLOUDINARY IMPORTS
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

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
const Assessment = require('./models/Assessment');
const Exam = require('./models/Exam'); // 🚨 NEW: DATESHEET EXAM MODEL
const Group = require('./models/Group');
const GroupInvitation = require('./models/GroupInvitation');
const { spawn } = require('child_process');

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "l1f23bscs1329@ucp.edu.pk";
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

// --- API URL CONFIG ---
const API_URL = process.env.NODE_ENV === 'production' ? 'https://api.myportalucp.online' : 'http://localhost:5000';

// ==========================================
// 📂 LOCAL MEDIA STORAGE CONFIGURATION (For general uploads)
// ==========================================
const uploadDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production'
  ? '/var/www/student_portal/media/'
  : path.join(__dirname, 'media'));

// Ensure the directory exists safely
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created media directory at: ${uploadDir}`);
  }
} catch (err) {
  console.error(`❌ Failed to create media directory at ${uploadDir}:`, err.message);
  const fallbackDir = path.join(__dirname, 'media');
  if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
}

// Keep local storage for things like general files or Keynote media
const localDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const identifier = req.user?.rollNumber || req.user?.id || 'user';
    const cleanIdentifier = identifier.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `file_${cleanIdentifier}_${uniqueSuffix}${ext}`);
  }
});

// ==========================================
// ☁️ NEW: CLOUDINARY CONFIGURATION (For Profile Pics)
// ==========================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryProfileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const identifier = req.user?.rollNumber || req.user?.id || 'user';
    const cleanIdentifier = identifier.toString().toLowerCase().replace(/[^a-z0-9]/g, '');

    return {
      folder: 'myportal/avatars', // Folder name in Cloudinary
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `profile_${cleanIdentifier}_${Date.now()}`,
      transformation: [{ width: 500, height: 500, crop: 'limit' }] // Compresses on the fly
    };
  },
});

// 🚨 NEW: Profile pic uses Cloudinary, general upload uses local disk
const profilePicUpload = multer({
  storage: cloudinaryProfileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit 
});

const cloudinaryGeneralStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const identifier = req.user?.rollNumber || req.user?.id || 'user';
    const cleanIdentifier = identifier.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      folder: 'myportal/general',
      resource_type: 'auto',
      public_id: `file_${cleanIdentifier}_${Date.now()}`
    };
  },
});

const generalUpload = multer({
  storage: cloudinaryGeneralStorage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

const upload = generalUpload;

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
// 🚀 SILENT PUSH NOTIFICATION HELPER
// ==========================================
async function sendSilentPush(user, data = {}) {
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
      data: data,
      _displayInForeground: false,
    });
  }

  try {
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`📲 Sent SILENT sync ping to ${user.email}`);
  } catch (e) {
    console.error("Silent Push Error:", e.message);
  }
}

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
      sound: channelId === "prayer-channel-live-v2" ? 'azan.wav' : 'default',
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
  } catch (e) {
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

const getBaseUrl = (req) => {
  const host = req.get('host') || '';
  if (host.includes('myportalucp.online') || host.includes('render.com')) {
    return `https://${host}`;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${host}`;
};

// 🚨 NEW: WRAP APP IN HTTP SERVER & ATTACH WEBSOCKETS
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});

// 🌍 ROOT PING (For quick testing)
app.get('/ping', (req, res) => res.json({ status: "alive", environment: process.env.NODE_ENV, time: new Date() }));
app.get('/api/ping', (req, res) => res.json({ status: "alive", prefix: "api", time: new Date() }));

io.on('connection', (socket) => {
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`👤 User ${userId} joined their personal data room.`);
    }
  });
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://192.168.0.107:8081',
  'http://10.14.100.54:8081',
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
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Serve static media files
app.use('/media', express.static(uploadDir));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🚨 NEW: Global WebSocket Notification Middleware
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.user && typeof io !== 'undefined') {
      const activeUserId = req.user.id;
      io.to(activeUserId.toString()).emit('live_db_update');
      
      Group.find({ members: activeUserId }).then(groups => {
        groups.forEach(group => {
          group.members.forEach(memberId => {
            if (memberId.toString() !== activeUserId.toString()) {
              io.to(memberId.toString()).emit('live_db_update');
            }
          });
        });
      }).catch(err => console.error("Broadcast error:", err));
    }
    return originalJson.call(this, data);
  };
  next();
});

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

// =================================================================
// 🌐 NEW PREMIUM WEB PORTAL AUTHENTICATION FLOW
// =================================================================

app.post('/api/web/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const formattedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: formattedEmail });

    if (!user) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      hasPassword: !!user.webPassword,
      name: user.name.split(' ')[0]
    });
  } catch (err) {
    res.status(500).json({ message: "Server error checking email." });
  }
});

app.post('/api/web/send-otp', async (req, res) => {
  try {
    const { email, type } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Account not found." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email }, { code }, { upsert: true, new: true });

    const subject = type === 'setup' ? 'Set up your Web Portal Password' : 'Reset your Web Portal Password';
    const msg = type === 'setup'
      ? 'Welcome to MyPortal Web! Use this code to verify your identity and create your web password.'
      : 'You requested a password reset for MyPortal Web. Use this code to proceed.';

    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: email,
      subject: subject,
      html: generateEmailTemplate(subject, code, msg)
    });

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error sending verification code." });
  }
});

app.post('/api/web/verify-otp', async (req, res) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const otpCode = String(req.body.otp).trim();

    const validOtp = await OTP.findOne({ email: email, code: otpCode });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP." });

    res.json({ success: true, message: "OTP verified." });
  } catch (err) {
    res.status(500).json({ message: "Error verifying OTP." });
  }
});

app.post('/api/web/set-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const validOtp = await OTP.findOne({ email, code: otp });
    if (!validOtp) return res.status(400).json({ message: "Invalid or expired OTP." });

    const user = await User.findOne({ email });
    user.webPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();
    await OTP.deleteOne({ email });

    const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, profilePic: user.profilePic }
    });
  } catch (err) {
    res.status(500).json({ message: "Error securing your new password." });
  }
});

app.post('/api/web/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.webPassword) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.webPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, profilePic: user.profilePic }
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in." });
  }
});

// ==========================================
// ROUTES: UCP DATA & SYNC ENGINE
// ==========================================

app.post('/api/session/keep-alive', auth, async (req, res) => {
  const { ucpCookie } = req.body;
  if (!ucpCookie) return res.status(400).json({ error: "No cookie provided" });
  try {
    await User.findByIdAndUpdate(req.user.id, { $set: { ucpCookie: ucpCookie, isPortalConnected: true, lastSyncAt: new Date() } }, { strict: false });
    res.status(200).json({ message: "Cookies saved to vault." });
  } catch (err) {
    res.status(500).json({ error: "Failed to secure cookie in vault" });
  }
});

app.post('/api/trigger-expired-push', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log(`[PUSH] Triggering Session Expired push for ${user.email}`);

    await sendPush(
      user,
      "UCP Session Expired ⚠️",
      "Your university portal session has expired. Tap here to log in.",
      { type: "session_expired" },
      "smart-alert",
      "default"
    );

    res.json({ success: true, message: "Push notification triggered." });
  } catch (err) {
    console.error("Error triggering expired push:", err);
    res.status(500).json({ message: "Server error triggering push." });
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

app.get('/api/datesheet', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(exams);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/assessments', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.id }).sort({ dueDate: 1 });
    res.json(assessments);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/assessments', auth, async (req, res) => {
  try {
    const newAssessment = new Assessment({ ...req.body, userId: req.user.id });
    await newAssessment.save();
    res.json(newAssessment);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/assessments/:id/status', auth, async (req, res) => {
  try {
    const updated = await Assessment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/assessments/:id', auth, async (req, res) => {
  try {
    const updated = await Assessment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/assessments/:id', auth, async (req, res) => {
  try {
    await Assessment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
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

app.post('/api/extension-sync', auth, async (req, res) => {
  try {
    const { gradesData, historyData, statsData, timetableData, attendanceData, announcementsData, submissionsData, datesheetData, portalId, ucpCookie, courseMap: clientCourseMap, syncMode } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Default mode is AUTO_SYNC if not explicitly provided
    const mode = syncMode || 'AUTO_SYNC';

    let activePortalId = portalId;
    if (activePortalId === "BACKGROUND_SYNC" && user.portalId) {
      activePortalId = user.portalId;
    }

    if (!activePortalId) throw new Error("Student ID not detected.");
    if (user.portalId && user.portalId.toUpperCase() !== activePortalId.toUpperCase()) {
      throw new Error(`Mismatch! Linked to ${user.portalId}, but found ${activePortalId}.`);
    }
    if (!user.portalId) user.portalId = activePortalId.toUpperCase();

    // ── Extract enrolled sections from courseMap and ensure Courses exist ──
    const enrolledSections = [];
    const sectionLookup = {}; 
    const baseCodeLookup = {}; 
    if (clientCourseMap && typeof clientCourseMap === 'object') {
      for (const [url, info] of Object.entries(clientCourseMap)) {
        const fullCode = (info.code || '').trim();
        const courseName = (info.name || '').trim();
        const creditHours = info.creditHours || 3; // 🚨 Capture credit hours

        let sectionCode = '';
        if (fullCode) {
          const parts = fullCode.split('-');
          sectionCode = parts.length > 1 ? parts[parts.length - 1] : fullCode;
          enrolledSections.push(sectionCode);
          sectionLookup[url] = sectionCode;
        }

        if (courseName) {
          if (sectionCode) {
            sectionLookup[courseName] = sectionCode;
            sectionLookup[`${courseName} - Lab`] = sectionCode; 
          }
          if (fullCode) {
            baseCodeLookup[courseName] = fullCode;
            baseCodeLookup[`${courseName} - Lab`] = fullCode; 
          }

          // 🚨 Save creditHours to DB
          const updatePayload = { userId, name: courseName, type: 'university', creditHours };
          if (fullCode) updatePayload.code = fullCode;
          if (sectionCode) updatePayload.section = sectionCode;

          await Course.findOneAndUpdate(
            { userId, name: courseName },
            { $set: updatePayload },
            { upsert: true }
          );
        }
      }
    }
    
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

    if (submissionsData && submissionsData.length > 0) {
      for (const sub of submissionsData) {
        if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;

        if (sub.tasks) {
          await Submission.findOneAndUpdate({ userId, courseUrl: sub.courseUrl }, { ...sub, lastUpdated: new Date() }, { upsert: true });

          const sectionCode = sectionLookup[sub.courseName] || sectionLookup[sub.courseUrl] || '';
          if (sectionCode) {
            const peerCourseDocs = await Course.find({ name: sub.courseName, section: sectionCode });
            const peerUserIds = peerCourseDocs.map(c => c.userId.toString()).filter(id => id !== userId.toString());
            const uniquePeerIds = [...new Set(peerUserIds)];

            for (const peerId of uniquePeerIds) {
              const peerSub = await Submission.findOne({ userId: peerId, courseName: sub.courseName });
              const existingTasks = peerSub && peerSub.tasks ? peerSub.tasks : [];
              const existingTaskMap = new Map(existingTasks.map(t => [`${(t.title || '').trim().toLowerCase()}_${(t.dueDate || '').trim()}`, t]));

              let merged = false;
              sub.tasks.forEach(incomingTask => {
                const fingerprint = `${(incomingTask.title || '').trim().toLowerCase()}_${(incomingTask.dueDate || '').trim()}`;
                if (!existingTaskMap.has(fingerprint)) {
                  existingTasks.push(incomingTask);
                  merged = true;
                }
              });

              if (merged) {
                await Submission.findOneAndUpdate(
                  { userId: peerId, courseName: sub.courseName },
                  { courseUrl: sub.courseUrl, courseName: sub.courseName, tasks: existingTasks, lastUpdated: new Date() },
                  { upsert: true }
                );
              }
            }
          }
        }
      }
    }

    if (mode === 'LOGIN_SYNC' || mode === 'FORCE_SYNC') {
      if (datesheetData && datesheetData.length > 0) {
        await Exam.deleteMany({ userId });
        for (const exam of datesheetData) {
          await new Exam({ ...exam, userId, lastUpdated: new Date() }).save();
        }
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
          const sectionCode = sectionLookup[courseName] || '';
          const fullCode = baseCodeLookup[courseName] || data.code || '';

          const courseUpdatePayload = {
            userId, name: data.name, type: 'university',
            color: data.color || '#3498db',
            instructors: Array.from(data.instructors),
            rooms: Array.from(data.rooms)
          };
          if (fullCode) courseUpdatePayload.code = fullCode;
          if (sectionCode) courseUpdatePayload.section = sectionCode;

          await Course.findOneAndUpdate(
            { userId, name: courseName },
            { $set: courseUpdatePayload },
            { upsert: true }
          );
        }
      }
    }

    if (gradesData && gradesData.length > 0) {
      if (mode === 'LOGIN_SYNC') await Grade.deleteMany({ userId });
      for (const grade of gradesData) {
        if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
        await Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...grade, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    if (historyData && historyData.length > 0) {
      if (mode === 'LOGIN_SYNC') await ResultHistory.deleteMany({ userId });
      for (const sem of historyData) {
        if (!sem.term) continue;

        // Safety: Don't overwrite valid data with garbage 0.00
        const existing = await ResultHistory.findOne({ userId, term: sem.term });
        if (existing && sem.cgpa === "0.00" && existing.cgpa !== "0.00") continue;

        await ResultHistory.findOneAndUpdate({ term: sem.term, userId }, { ...sem, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    if (statsData && Object.keys(statsData).length > 0) {
      const existingStats = await StudentStats.findOne({ userId });
      const updatePayload = { ...statsData, userId, lastUpdated: new Date() };

      // Safety: Don't overwrite valid CGPA with 0.00
      if (existingStats && statsData.cgpa === "0.00" && existingStats.cgpa !== "0.00") {
        delete updatePayload.cgpa;
      }

      await StudentStats.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { upsert: true }
      );
    }

    await User.updateOne({ _id: userId }, {
      $set: {
        isPortalConnected: true,
        lastSyncAt: new Date(),
        lastScrapedAt: new Date(),
        portalId: user.portalId,
        ucpCookie: ucpCookie || user.ucpCookie,
        ...(enrolledSections.length > 0 ? { enrolledSections } : {})
      }
    });

    res.json({ message: "Sync & Diffing complete securely!" });

  } catch (error) {
    const statusCode = error.message.includes('Mismatch') || error.message.includes('not detected') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
});

// ==========================================
// REST OF THE ROUTES
// ==========================================

const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("🔗 Connecting to MyPortal Database...");

mongoose.connect(dbLink).then(async () => {
  console.log("✅ MongoDB Connected Successfully!");

  try {
    // 🚨 FIX: Added `Note` to the watch array to allow WebSockets to trigger live updates on Notes
    const modelsToWatch = [Task, Transaction, Debt, Habit, Keynote, Note, NamazRecord, Attendance, Submission, Announcement, Timetable, Grade, Course, Assessment, Exam];

    modelsToWatch.forEach(model => {
      if (model.watch) {
        const changeStream = model.watch([], { fullDocument: 'updateLookup' });
        changeStream.on('change', (change) => {
          const doc = change.fullDocument;
          const targetUserId = doc?.userId || doc?.user;

          if (targetUserId) {
            const userIdStr = targetUserId.toString();
            io.to(userIdStr).emit('live_db_update');
          }
        });
      }
    });
    console.log("🟢 Database Live Sync Watchdogs Active!");
  } catch (err) {
    console.log("⚠️ MongoDB Change Streams require a Replica Set (Active by default on MongoDB Atlas).");
  }

}).catch(err => console.log(err));

app.post('/api/upload', auth, (req, res) => {
  upload.array('files', 10)(req, res, function (err) {
    if (err) return res.status(500).json({ error: "Upload failed", details: err.message });
    try {
      const baseUrl = getBaseUrl(req);
      const urls = req.files.map(file => file.path || file.secure_url || `${baseUrl}/media/${file.filename}`);
      res.json({ urls });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process files after upload' });
    }
  });
});

app.get('/api/download/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename);
  const originalName = req.query.name || req.params.filename;

  if (fs.existsSync(filepath)) {
    res.download(filepath, originalName);
  } else {
    res.status(404).json({ error: "File not found on server" });
  }
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
    const u = await User.findById(req.user.id);
    const q = u.isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };

    const { title, content, courseName, mediaUrls, type, isPrivate } = req.body;
    const updateObj = { title: title?.trim(), content: content?.trim() || "", courseName: courseName || "General", mediaUrls: mediaUrls || [], type: type || 'mixed' };
    if (isPrivate !== undefined) updateObj.isPrivate = isPrivate;

    const keynote = await Keynote.findOneAndUpdate(q, updateObj, { new: true, runValidators: true });
    if (!keynote) return res.status(404).json({ message: "Keynote not found" });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/keynotes/:id/unread', auth, async (req, res) => {
  try { res.json(await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: false }, { new: true })); } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/keynotes/:id/delete', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    const q = u.isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    // Transfer ownership to deleting admin
    res.json(await Keynote.findOneAndUpdate(q, { isDeleted: true, deletedAt: new Date(), userId: req.user.id }, { new: true }));
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/keynotes/:id/restore', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    const q = u.isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    res.json(await Keynote.findOneAndUpdate(q, { isDeleted: false, deletedAt: null }, { new: true }));
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.delete('/api/keynotes/:id', auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    const q = u.isAdmin ? { _id: req.params.id } : { _id: req.params.id, userId: req.user.id };
    await Keynote.findOneAndDelete(q);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/admin/system-stats', auth, adminAuth, async (req, res) => {
  try {
    const cpuLoad = await si.currentLoad();
    const mem = await si.mem();
    const disks = await si.fsSize();
    const rootDisk = disks.find(d => d.mount === '/' || d.mount === 'C:') || disks[0] || { size: 30 * 1024 * 1024 * 1024, used: 0 };

    let dbSize = 0;
    if (mongoose.connection.readyState === 1) dbSize = (await mongoose.connection.db.stats()).dataSize;

    res.json({
      cpu: Math.round(cpuLoad.currentLoad),
      memory: { active: mem.active, total: mem.total },
      dbSize: dbSize,
      disk: { total: rootDisk.size, used: rootDisk.used }
    });
  } catch (error) { res.status(500).json({ message: "Failed" }); }
});

// ==========================================
// 👥 MULTI-USER STUDY GROUP & COMMUNITY SYSTEM API
// ==========================================

// 1. Create a Study Group
app.post('/api/groups', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Group name is required" });

    const existingGroup = await Group.findOne({ members: req.user.id });
    if (existingGroup) {
      return res.status(400).json({ message: "You are already a member of a group." });
    }

    const group = new Group({
      name: name.trim(),
      creatorId: req.user.id,
      members: [req.user.id],
      admins: [req.user.id] // Creator is also added to structural admins array
    });
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// 🚀 REFACTORED ENDPOINT: TOGGLE MEMBER ROLE TO ADMIN/STUDENT (Creator Only)
app.put('/api/groups/toggle-admin', auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group not found." });

    // Only original group creator can shift member permissions/roles
    if (group.creatorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the group creator can manage admin assignments." });
    }

    if (memberId === req.user.id) return res.status(400).json({ message: "Cannot alter creator role." });

    const adminIds = group.admins.map(id => id.toString());
    if (adminIds.includes(memberId)) {
      group.admins = group.admins.filter(id => id.toString() !== memberId);
    } else {
      group.admins.push(memberId);
    }

    await group.save();
    const updated = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server Error matching roles" });
  }
});

// 🚀 REFACTORED ENDPOINT: UPDATE GROUP DETAILS/NAME (Creators & Admins)
app.put('/api/groups/update-name', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Valid group name required." });

    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group assignment absent." });

    const isAuthorizedAdmin = group.creatorId.toString() === req.user.id || group.admins.map(id => id.toString()).includes(req.user.id);
    if (!isAuthorizedAdmin) {
      return res.status(403).json({ message: "Access Denied: Only Group Admins can rename this workspace." });
    }

    group.name = name.trim();
    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error altering name." });
  }
});

// 🚀 REFACTORED ENDPOINT: ANY MEMBER CAN INVITE STUDENTS DIRECTLY NOW
app.post('/api/groups/invite', auth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ message: "Receiver ID is required" });

    // Validate that sender belongs to the target active group
    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(400).json({ message: "You must belong to a group to dispatch invites." });

    const existingInvite = await GroupInvitation.findOne({
      groupId: group._id,
      receiverId,
      status: 'pending'
    });
    if (existingInvite) return res.status(400).json({ message: "An invitation is already pending for this student." });

    const invite = new GroupInvitation({
      groupId: group._id,
      senderId: req.user.id,
      receiverId
    });
    await invite.save();
    res.status(201).json(invite);
  } catch (error) {
    res.status(500).json({ message: "Server Error dispatching invitation." });
  }
});

// 8. Update Group Profile Pic (Creators & Structural Promoted Admins)
app.put('/api/groups/:id/profile-pic', auth, profilePicUpload.single('profilePic'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAuthorizedAdmin = group.creatorId.toString() === req.user.id || group.admins.map(id => id.toString()).includes(req.user.id);
    if (!isAuthorizedAdmin) {
      return res.status(403).json({ message: "Only group creators or promoted admins can modify the profile picture." });
    }

    if (!req.file && !req.body.profilePic) {
      return res.status(400).json({ message: "No file or URL provided" });
    }

    const fileUrl = req.file ? req.file.path : req.body.profilePic;

    group.profilePic = fileUrl;
    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updatedGroup);
  } catch (error) {

    res.status(500).json({ message: "Server Error setting canvas portrait" });
  }
});

// 2. Fetch User's Active Group
app.get('/api/groups/my', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ members: req.user.id })
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(group);
  } catch (error) {
    console.error("Fetch My Group Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. Leave or Disband Group
app.post('/api/groups/leave', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(400).json({ message: "You are not a member of any group." });

    if (group.creatorId.toString() === req.user.id) {
      // Disband Group (Creator Exit)
      await Group.findByIdAndDelete(group._id);
      await GroupInvitation.deleteMany({ groupId: group._id });
      // Revert shared tasks back to private
      await Task.updateMany({ groupId: group._id }, { groupId: null, memberStatuses: [] });
      res.json({ message: "Group disbanded successfully." });
    } else {
      // Leave Group (Member Exit)
      group.members = group.members.filter(m => m.toString() !== req.user.id);
      await group.save();
      // Clean up member-specific states
      await Task.updateMany(
        { groupId: group._id },
        { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
      );
      res.json({ message: "Left group successfully." });
    }
  } catch (error) {
    console.error("Leave Group Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 4. Fetch Community Students
app.get('/api/users/community', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('name email profilePic portalId customProfilePic createdAt isAdmin')
      .sort({ name: 1 });

    const allGroups = await Group.find();
    const groupedUserIds = new Set();
    allGroups.forEach(g => g.members.forEach(m => groupedUserIds.add(m.toString())));

    const sentInvites = await GroupInvitation.find({ senderId: req.user.id, status: 'pending' });
    const invitedUserIds = new Set(sentInvites.map(i => i.receiverId.toString()));

    const formattedUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      profilePic: u.profilePic,
      portalId: u.portalId,
      customProfilePic: u.customProfilePic,
      createdAt: u.createdAt,
      isAdmin: u.isAdmin,
      isInGroup: groupedUserIds.has(u._id.toString()),
      isInvited: invitedUserIds.has(u._id.toString())
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Fetch Community Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 6. Fetch Received Pending Invitations
app.get('/api/groups/invitations', auth, async (req, res) => {
  try {
    const invites = await GroupInvitation.find({ receiverId: req.user.id, status: 'pending' })
      .populate('senderId', 'name email profilePic')
      .populate('groupId', 'name');
    res.json(invites);
  } catch (error) {
    console.error("Fetch Invites Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 7. Accept or Decline Invitation
app.put('/api/groups/invitations/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const invite = await GroupInvitation.findById(req.params.id);
    if (!invite) return res.status(404).json({ message: "Invitation not found" });

    if (invite.receiverId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (status === 'rejected') {
      invite.status = 'rejected';
      await invite.save();
      return res.json({ message: "Invitation declined successfully" });
    }

    // Accepting
    // If the user is already in a group, automatically exit (leave/disband) it since they confirmed the warning in the UI
    const userInGroup = await Group.findOne({ members: req.user.id });
    if (userInGroup) {
      if (userInGroup.creatorId.toString() === req.user.id) {
        // Disband Group
        await Group.findByIdAndDelete(userInGroup._id);
        await GroupInvitation.deleteMany({ groupId: userInGroup._id });
        await Task.updateMany({ groupId: userInGroup._id }, { groupId: null, memberStatuses: [] });
      } else {
        // Leave Group
        userInGroup.members = userInGroup.members.filter(m => m.toString() !== req.user.id);
        await userInGroup.save();
        await Task.updateMany(
          { groupId: userInGroup._id },
          { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
        );
      }
    }

    const group = await Group.findById(invite.groupId);
    if (!group) return res.status(404).json({ message: "Associated study group no longer exists." });

    // Add to group
    group.members.push(req.user.id);
    await group.save();

    // Mark as accepted
    invite.status = 'accepted';
    await invite.save();

    // Reject all other pending invitations for this user
    await GroupInvitation.updateMany(
      { receiverId: req.user.id, status: 'pending' },
      { status: 'rejected' }
    );

    res.json({ message: "Joined group successfully" });
  } catch (error) {
    console.error("Handle Invite Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 9. Add Member Directly (Admins only)
app.post('/api/groups/add-member', auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: "Member ID is required" });

    const group = await Group.findOne({ creatorId: req.user.id });
    if (!group) return res.status(403).json({ message: "Only the group creator can add members." });

    const memberInGroup = await Group.findOne({ members: memberId });
    if (memberInGroup) return res.status(400).json({ message: "This user is already in a study group." });

    group.members.push(memberId);
    await group.save();

    // delete any pending invitations for this user
    await GroupInvitation.deleteMany({ receiverId: memberId, status: 'pending' });

    const updatedGroup = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updatedGroup);
  } catch (error) {
    console.error("Group Add Member Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 10. Remove Member Directly (Admins only)
app.post('/api/groups/remove-member', auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ message: "Member ID is required" });

    const group = await Group.findOne({ creatorId: req.user.id });
    if (!group) return res.status(403).json({ message: "Only the group creator can remove members." });

    if (memberId === req.user.id) return res.status(400).json({ message: "Creator cannot be removed. You can disband the group instead." });

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    // Clean up member-specific states in tasks
    await Task.updateMany(
      { groupId: group._id },
      { $pull: { deletedByUsers: memberId, memberStatuses: { userId: memberId } } }
    );

    const updatedGroup = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updatedGroup);
  } catch (error) {
    console.error("Group Remove Member Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});
app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const usersWithStorage = await Promise.all(users.map(async (user) => {
      let storageBytes = 15360;

      const keynotes = await Keynote.find({ userId: user._id });
      for (let kn of keynotes) {
        if (kn.mediaUrls && kn.mediaUrls.length > 0) {
          for (let url of kn.mediaUrls) {
            try {
              const filename = url.split('/').pop();
              const filepath = path.join(uploadDir, filename);
              if (fs.existsSync(filepath)) {
                storageBytes += fs.statSync(filepath).size;
              }
            } catch (e) { }
          }
        }
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        isAdmin: user.isAdmin,
        isPortalConnected: user.isPortalConnected,
        portalId: user.portalId,
        lastSyncAt: user.lastSyncAt,
        createdAt: user.createdAt,
        storageUsed: storageBytes
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
    if (user.isAdmin) return res.status(400).json({ message: "Admin accounts cannot be deleted!" });

    await Promise.all([User.findByIdAndDelete(userId), Grade.deleteMany({ userId }), ResultHistory.deleteMany({ userId }), StudentStats.deleteMany({ userId }), Task.deleteMany({ userId }), Transaction.deleteMany({ userId }), Budget.deleteMany({ userId }), Timetable.deleteMany({ userId }), Habit.deleteMany({ userId }), Course.deleteMany({ userId }), Note.deleteMany({ user: userId }), Keynote.deleteMany({ userId }), FocusSession.deleteMany({ userId }), Attendance.deleteMany({ userId }), Submission.deleteMany({ userId }), Announcement.deleteMany({ userId }), Assessment.deleteMany({ userId }), Exam.deleteMany({ userId })]);

    io.to(userId.toString()).emit('account_deleted');

    res.json({ message: "User deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/admin/users/:id/role', auth, adminAuth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (requestingUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: "Only Super Admin can change roles" });
    }
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });
    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ message: "Cannot change Super Admin role" });
    }
    targetUser.isAdmin = !targetUser.isAdmin;
    await targetUser.save();
    res.json({ success: true, isAdmin: targetUser.isAdmin });
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

// ==========================================
// 🚨 FIX: FULLY SECURED AND CORRECTED NOTES ROUTES 
// ==========================================
app.post('/api/notes', auth, async (req, res) => {
  try {
    const { _id, title, courseId, content, referenceFiles, source, isPrivate } = req.body;

    let finalGroupId = null;
    let finalIsPrivate = isPrivate !== undefined ? isPrivate : true;

    if (finalIsPrivate === false) {
      const userGroup = await Group.findOne({ members: req.user.id });
      if (userGroup) {
        finalGroupId = userGroup._id;
      } else {
        finalIsPrivate = true; // Fallback to private if user is not in a group
      }
    }

    if (_id) {
      const note = await Note.findById(_id);
      if (!note) return res.status(404).json({ error: "Note not found." });

      const isCreator = note.user.toString() === req.user.id;
      if (!isCreator) return res.status(403).json({ error: "Access Denied: Only creators can modify this note." });

      note.title = title;
      note.courseId = courseId;
      note.content = content;
      note.referenceFiles = referenceFiles;
      note.source = source;
      note.isPrivate = finalIsPrivate;
      note.groupId = finalGroupId;
      
      if (finalIsPrivate) note.deletedByUsers = [];

      await note.save();
      await broadcastLiveUpdate(note.groupId, req.user.id);
      return res.json(await Note.findById(note._id).populate('user', 'name email profilePic'));
    }

    const newNote = new Note({ 
      user: req.user.id, title, courseId, content: content || " ", referenceFiles, source, 
      isPrivate: finalIsPrivate, groupId: finalGroupId 
    });
    
    await newNote.save();
    await broadcastLiveUpdate(newNote.groupId, req.user.id);
    res.json(await Note.findById(newNote._id).populate('user', 'name email profilePic'));
  } catch (error) {
    console.error("Note POST Error:", error);
    res.status(500).json({ error: error.message || "Failed to process note" });
  }
});

app.put('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });

    const isCreator = note.user.toString() === req.user.id;
    if (!isCreator) return res.status(403).json({ message: "Access Denied: Only creators can modify this note." });

    if (req.body.isPrivate !== undefined) {
      if (req.body.isPrivate === false) {
        const userGroup = await Group.findOne({ members: req.user.id });
        if (!userGroup) return res.status(400).json({ message: "No group found." });
        note.groupId = userGroup._id;
        note.isPrivate = false;
      } else {
        note.groupId = null;
        note.isPrivate = true;
        note.deletedByUsers = [];
      }
    }

    if (req.body.title) note.title = req.body.title;
    if (req.body.courseId) note.courseId = req.body.courseId;
    if (req.body.content) note.content = req.body.content;
    if (req.body.referenceFiles) note.referenceFiles = req.body.referenceFiles;

    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json(note);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/notes', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    const notes = await Note.find({
      $or: [
        { user: req.user.id, groupId: null, isDeleted: false }, // Private Notes
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } // Active Group Notes
      ]
    }).populate('user', 'name email profilePic').sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notes" });
  }
});

app.put('/api/notes/:id/delete', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;
    const oldGroupId = note.groupId;

    if (isCreator) {
      // Owner Delete -> Global Bin Move
      note.isDeleted = true;
      note.deletedAt = new Date();
    } else if (note.groupId) {
      // Member Delete -> Isolated Local Array Only
      if (!note.deletedByUsers.map(id => id.toString()).includes(req.user.id)) {
        note.deletedByUsers.push(req.user.id);
      }
    } else {
      return res.status(403).json({ error: "Unauthorized delete action." });
    }

    await note.save();
    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: 'Moved to Bin safely' });
  } catch (error) { res.status(500).json({ error: "Error moving note to bin" }); }
});

app.put('/api/notes/:id/restore', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;

    if (isCreator) {
      note.isDeleted = false;
      note.deletedAt = null;
    }
    
    // Always clear from personal bin if member restores
    note.deletedByUsers = note.deletedByUsers.filter(id => id.toString() !== req.user.id);

    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json({ message: 'Restored cleanly' });
  } catch (error) { res.status(500).json({ error: "Error restoring note" }); }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;
    const oldGroupId = note.groupId;

    if (isCreator) {
      await Note.findByIdAndDelete(req.params.id);
    } else {
      note.deletedByUsers.push(req.user.id);
      await note.save();
    }

    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: 'Permanently Purged' });
  } catch (error) { res.status(500).json({ error: "Error deleting note" }); }
});


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

// =================================================================
// 🚀 UNIFIED MICROSOFT SSO LOGIN & FAST-LOGIN ENGINE
// =================================================================
app.post('/api/auth/microsoft-login', async (req, res) => {
  try {
    const { rollNumber, name, profilePic, ucpCookie } = req.body;

    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll number not detected from portal.' });
    }

    const formattedRoll = rollNumber.toLowerCase().trim();
    const email = `${formattedRoll}@ucp.edu.pk`;

    let user = await User.findOne({ email });

    let finalProfilePicUrl = user ? user.profilePic : null;

    if (profilePic && profilePic.includes('base64')) {
      try {
        const base64Data = profilePic; // Keep data URI prefix for Cloudinary

        // 🚨 NEW: Upload base64 directly to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(base64Data, {
          folder: 'myportal/avatars',
          public_id: `portal_profile_${formattedRoll}_${Date.now()}`,
          transformation: [{ width: 500, height: 500, crop: 'limit' }]
        });

        finalProfilePicUrl = uploadResponse.secure_url;
      } catch (imgErr) {
        console.error('[CLOUDINARY SAVE ERROR]:', imgErr.message);
      }
    }

    let isNewUser = false;

    if (user) {
      user.ucpCookie = ucpCookie;
      user.isPortalConnected = true;
      user.name = name && name !== 'UCP Student' ? name : user.name;
      if (finalProfilePicUrl) {
        user.portalProfilePic = finalProfilePicUrl;
        if (!user.originalPortalProfilePic) {
          user.originalPortalProfilePic = finalProfilePicUrl;
        }
        if (!user.customProfilePic) user.profilePic = finalProfilePicUrl;
      }
      await user.save();
    } else {
      isNewUser = true;
      user = new User({
        name: name || formattedRoll.toUpperCase(),
        email: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10),
        isPortalConnected: true,
        ucpCookie: ucpCookie,
        portalProfilePic: finalProfilePicUrl,
        originalPortalProfilePic: finalProfilePicUrl,
        profilePic: finalProfilePicUrl
      });
      await user.save();
    }

    const payload = { id: user.id };

    jwt.sign(payload, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '30d' }, (err, token) => {
      if (err) throw err;
      res.json({
        token,
        isNewUser,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          profilePic: user.profilePic
        }
      });
    });

  } catch (err) {
    console.error('[MICROSOFT LOGIN ERROR]:', err.message);
    res.status(500).send('Server Error');
  }
});
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
app.get('/api/ping', (req, res) => res.json({ status: "alive", time: new Date() }));


// 🚨 NEW: 📸 CLOUDINARY PROFILE PICTURE UPLOAD 
app.post(['/api/user/profile-pic', '/user/profile-pic', '/api/profile-pic'], auth, profilePicUpload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Cloudinary puts the final URL in req.file.path
    const fileUrl = req.file.path;

    console.log(`📸 [PROFILE] Successful Cloudinary upload for user ${req.user.id}. URL: ${fileUrl}`);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        customProfilePic: fileUrl,
        profilePic: fileUrl // Always use custom pic if uploaded
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error("Profile Pic Upload Error:", error);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
});


app.put('/api/user/profile', auth, async (req, res) => { try { res.json(await User.findByIdAndUpdate(req.user.id, { name: req.body.name }, { new: true }).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.put('/api/user/security-settings', auth, async (req, res) => {
  try {
    const { autoLockEnabled, autoLockTimer } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      'securitySettings.autoLockEnabled': autoLockEnabled,
      'securitySettings.autoLockTimer': autoLockTimer
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

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
    await Promise.all([Grade.deleteMany({ userId: req.user.id }), ResultHistory.deleteMany({ userId: req.user.id }), StudentStats.deleteMany({ userId: req.user.id }), Timetable.deleteMany({ userId: req.user.id }), Course.deleteMany({ userId: req.user.id, type: 'university' })]);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});
app.get('/api/user/portal-status', auth, async (req, res) => { try { const user = await User.findById(req.user.id); res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/timetable', auth, async (req, res) => { try { res.json((await Timetable.find({ userId: req.user.id })).map(i => ({ ...i.toObject(), id: i._id }))); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/student-stats', auth, async (req, res) => { try { res.json(await StudentStats.findOne({ userId: req.user.id }) || { cgpa: "0.00", credits: "0", inprogressCr: "0" }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/grades', auth, async (req, res) => { try { res.json(await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/results-history', auth, async (req, res) => { try { res.json(await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/focus-sessions', auth, async (req, res) => { try { res.json(await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/focus-sessions', auth, async (req, res) => { try { res.json(await new FocusSession({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });

// ==========================================
// 🚀 INSTANT WEBSOCKET BROADCAST HELPER
// ==========================================
const broadcastLiveUpdate = async (groupId, activeUserId) => {
  // Notify the action initiator instantly
  io.to(activeUserId.toString()).emit('live_db_update');
  
  // If it's a shared group task, instantly broadcast to all members in that group workspace
  if (groupId) {
    const group = await Group.findById(groupId);
    if (group) {
      group.members.forEach(memberId => {
        io.to(memberId.toString()).emit('live_db_update');
      });
    }
  }
};

// ==========================================
// 📝 STRICT TASK MANAGEMENT ROUTES
// ==========================================

// 1. Fetch Active Dashboard Tasks (with status masking per member)
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, groupId: null, isDeleted: false }, // Private tasks owned by user
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } // Active Group tasks
      ]
    })
    .populate('userId', 'name email profilePic')
    .sort({ createdAt: -1 });

    // Map status out dynamically so group members see their personal overrides seamlessly
    const localizedTasks = tasks.map(task => {
      const taskObj = task.toObject();
      if (taskObj.groupId) {
        const personalStatusOverride = taskObj.memberStatuses?.find(ms => ms.userId.toString() === req.user.id);
        if (personalStatusOverride) {
          taskObj.status = personalStatusOverride.status;
        }
      }
      return taskObj;
    });

    res.json(localizedTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, userId: req.user.id });
    await task.save();
    
    await broadcastLiveUpdate(task.groupId, req.user.id);
    res.json(await Task.findById(task._id).populate('userId', 'name email profilePic'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // STRICT RULE: Only the literal creator matches. Admin bypass completely removed.
    const isCreator = task.userId.toString() === req.user.id;

    let isMember = false;
    if (task.groupId) {
      const group = await Group.findById(task.groupId);
      if (group && group.members.map(m => m.toString()).includes(req.user.id)) {
        isMember = true;
      }
    }

    if (!isCreator && !isMember) {
      return res.status(403).json({ message: "Unauthorized interaction with workspace task." });
    }

    // SCENARIO A: TASK CREATOR - Full modifications & privacy changes allowed
    if (isCreator) {
      const targetPrivacy = req.body.isPrivate;

      if (targetPrivacy === true && task.groupId !== null) {
        task.groupId = null;
        task.memberStatuses = [];
        task.deletedByUsers = [];
      } else if (targetPrivacy === false && !task.groupId) {
        const userGroup = await Group.findOne({ members: req.user.id });
        if (!userGroup) return res.status(400).json({ message: "You must join a group before sharing this task." });
        task.groupId = userGroup._id;
      }

      Object.assign(task, req.body);

      if (req.body.status !== undefined) {
        const existingIdx = task.memberStatuses.findIndex(ms => ms.userId.toString() === req.user.id);
        if (existingIdx > -1) task.memberStatuses[existingIdx].status = req.body.status;
        else task.memberStatuses.push({ userId: req.user.id, status: req.body.status });
      }
    } 
    // SCENARIO B: GROUP MEMBER - Strict View-Only (Status exceptions)
    else {
      // Members can only modify their personal isolated status
      const allowedKeys = ['status', 'acknowledged']; // Safe keys for members
      const modifications = Object.keys(req.body);
      const isViolatingPermissions = modifications.some(key => !allowedKeys.includes(key));

      if (isViolatingPermissions) {
        return res.status(403).json({ message: "Permissions Denied: Group members are limited to changing status only." });
      }

      if (req.body.status !== undefined) {
        const existingIdx = task.memberStatuses.findIndex(ms => ms.userId.toString() === req.user.id);
        if (existingIdx > -1) {
          task.memberStatuses[existingIdx].status = req.body.status;
        } else {
          task.memberStatuses.push({ userId: req.user.id, status: req.body.status });
        }
      }
    }

    await task.save();
    await broadcastLiveUpdate(task.groupId, req.user.id);
    
    const populatedTask = await Task.findById(task._id).populate('userId', 'name email profilePic');
    const taskObj = populatedTask.toObject();
    
    if (taskObj.groupId) {
      const personalStatusOverride = taskObj.memberStatuses.find(ms => ms.userId.toString() === req.user.id);
      if (personalStatusOverride) {
        taskObj.status = personalStatusOverride.status;
      }
    }

    res.json(taskObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/tasks/:id/acknowledge', auth, async (req, res) => {
  try {
    await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { acknowledged: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 5. Delete Task (Creator vs Member isolation rules)
app.put('/api/tasks/:id/delete', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // STRICT RULE: Admin bypass removed.
    const isCreator = task.userId.toString() === req.user.id;
    const oldGroupId = task.groupId;

    if (isCreator) {
      // Creator deletes: Master deletion flag triggers (Disappears from everyone's hub)
      task.isDeleted = true;
      task.deletedAt = new Date();
    } else if (task.groupId) {
      // Member deletes: Stored purely in local deletion array on their side only
      if (!task.deletedByUsers.map(id => id.toString()).includes(req.user.id)) {
        task.deletedByUsers.push(req.user.id);
      }
    } else {
      return res.status(403).json({ message: "Unauthorized delete action." });
    }

    await task.save();
    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/tasks/:id/restore', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator = task.userId.toString() === req.user.id;

    if (isCreator) {
      task.isDeleted = false;
      task.deletedAt = null;
    } 
    
    task.deletedByUsers = task.deletedByUsers.filter(id => id.toString() !== req.user.id);

    await task.save();
    await broadcastLiveUpdate(task.groupId, req.user.id);
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isCreator = task.userId.toString() === req.user.id;
    const oldGroupId = task.groupId;

    if (isCreator) {
      await Task.findByIdAndDelete(req.params.id);
    } else {
      task.deletedByUsers.push(req.user.id);
      await task.save();
    }

    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: "Purge structural process completed cleanly." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

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
    const uniqueDays = new Set(habit.checkIns.map(d => new Date(d).setHours(0, 0, 0, 0)));
    if (uniqueDays.size > habit.longestStreak) habit.longestStreak = uniqueDays.size;
    await habit.save(); res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/namaz/today', auth, async (req, res) => {
  try {
    const lahoreDateObj = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    let todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;

    const times = await getLahorePrayerTimes(todayStr);
    if (!times) return res.status(500).json({ message: "API Error" });

    const currentMins = lahoreDateObj.getHours() * 60 + lahoreDateObj.getMinutes();
    const [fajrH, fajrM] = times.fajr.split(':').map(Number);
    const fajrMins = fajrH * 60 + fajrM;

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

      let isPastPrayerTime = currentMins >= pMins || (pName === 'isha' && currentMins < fajrMins);

      if (isPastPrayerTime) {
        if (record.prayers[pName] === 'locked') {
          record.prayers[pName] = 'pending';
          modified = true;
        }

        if (i > 0) {
          const prevP = prayerOrder[i - 1];
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
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    // Tasks are in bin if the user is the creator and it's marked master deleted,
    // OR if it's a shared group task and the member explicitly trashed it on their side.
    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, isDeleted: true },
        { groupId: { $in: groupIds }, deletedByUsers: req.user.id }
      ]
    }).populate('userId', 'name email profilePic').lean();

    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: true }).lean();
    const habits = await Habit.find({ userId: req.user.id, isDeleted: true }).lean();
    const notes = await Note.find({ user: req.user.id, isDeleted: true }).lean();
    const keynotes = await Keynote.find({ userId: req.user.id, isDeleted: true }).lean();
    
    res.json({ tasks, transactions, habits, notes, keynotes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});app.get('/api/bin', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, isDeleted: true },
        { groupId: { $in: groupIds }, deletedByUsers: req.user.id }
      ]
    }).populate('userId', 'name email profilePic').lean();

    const notes = await Note.find({
      $or: [
        { user: req.user.id, isDeleted: true },
        { groupId: { $in: groupIds }, deletedByUsers: req.user.id }
      ]
    }).populate('user', 'name email profilePic').lean();

    const transactions = await Transaction.find({ userId: req.user.id, isDeleted: true }).lean();
    const habits = await Habit.find({ userId: req.user.id, isDeleted: true }).lean();
    const keynotes = await Keynote.find({ userId: req.user.id, isDeleted: true }).lean();
    
    res.json({ tasks, transactions, habits, notes, keynotes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Task.updateMany({ groupId: { $in: groupIds }, deletedByUsers: req.user.id }, { $pull: { deletedByUsers: req.user.id } });

    await Note.updateMany({ user: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Note.updateMany({ groupId: { $in: groupIds }, deletedByUsers: req.user.id }, { $pull: { deletedByUsers: req.user.id } });

    await Transaction.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Habit.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    await Keynote.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json({ message: "Restored all items successfully." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    await Note.deleteMany({ user: req.user.id, isDeleted: true });
    await Transaction.deleteMany({ userId: req.user.id, isDeleted: true });
    await Habit.deleteMany({ userId: req.user.id, isDeleted: true });
    await Keynote.deleteMany({ userId: req.user.id, isDeleted: true });
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json({ message: "Recycle bin emptied safely." });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/', (req, res) => { res.json({ message: "API is running 🚀" }); });

// ==========================================
// 🚨 COMMUNITY NOTES & WORKSPACE ROUTES
// ==========================================

app.get('/api/community/users', auth, async (req, res) => {
  try {
    // Fetch everyone except the current user
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email profilePic');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notes/share', auth, async (req, res) => {
  try {
    const { noteIds, targetUserIds } = req.body;
    const notesToShare = await Note.find({ _id: { $in: noteIds } });
    
    const newNotes = [];
    for (let targetId of targetUserIds) {
      for (let note of notesToShare) {
        // Create a clone in the target user's Inbox
        const newNote = new Note({
          user: targetId,
          title: note.title,
          content: note.content,
          courseId: note.courseId,
          referenceFiles: note.referenceFiles,
          source: note.source,
          isPrivate: true, // Inherently private to the new user once accepted
          groupId: null,
          isInbox: true,   // Triggers the Inbox status
          sender: req.user.id
        });
        await newNote.save();
        newNotes.push(newNote);
        io.to(targetId.toString()).emit('live_db_update');
      }
    }
    res.json({ success: true, count: newNotes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/notes/:id/accept', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (note.user.toString() !== req.user.id) return res.status(403).json({ error: "Unauthorized" });
    
    note.isInbox = false; // Move from Inbox to active workspace
    await note.save();
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json(await Note.findById(note._id).populate('user', 'name email profilePic').populate('sender', 'name profilePic'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/notes', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id });
    const groupIds = userGroups.map(g => g._id);

    const notes = await Note.find({
      $or: [
        { user: req.user.id, groupId: null, isDeleted: false }, // Private Notes & Inbox Notes
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } // Active Group Notes
      ]
    })
    .populate('user', 'name email profilePic')
    .populate('sender', 'name profilePic') // Hydrate the sender details for Inbox
    .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Error fetching notes" });
  }
});

app.post('/api/notes', auth, async (req, res) => {
  try {
    const { _id, title, courseId, content, referenceFiles, source, isPrivate } = req.body;
    let finalGroupId = null;
    let finalIsPrivate = isPrivate !== undefined ? isPrivate : true;

    if (finalIsPrivate === false) {
      const userGroup = await Group.findOne({ members: req.user.id });
      if (userGroup) {
        finalGroupId = userGroup._id;
      } else {
        finalIsPrivate = true; 
      }
    }

    if (_id) {
      const note = await Note.findById(_id);
      if (!note) return res.status(404).json({ error: "Note not found." });
      if (note.user.toString() !== req.user.id) return res.status(403).json({ error: "Access Denied" });

      note.title = title;
      note.courseId = courseId;
      note.content = content;
      note.referenceFiles = referenceFiles;
      note.source = source;
      note.isPrivate = finalIsPrivate;
      note.groupId = finalGroupId;
      if (finalIsPrivate) note.deletedByUsers = [];

      await note.save();
      await broadcastLiveUpdate(note.groupId, req.user.id);
      return res.json(await Note.findById(note._id).populate('user', 'name email profilePic').populate('sender', 'name profilePic'));
    }

    const newNote = new Note({ user: req.user.id, title, courseId, content: content || " ", referenceFiles, source, isPrivate: finalIsPrivate, groupId: finalGroupId });
    await newNote.save();
    await broadcastLiveUpdate(newNote.groupId, req.user.id);
    res.json(await Note.findById(newNote._id).populate('user', 'name email profilePic').populate('sender', 'name profilePic'));
  } catch (error) { res.status(500).json({ error: error.message || "Failed to process note" }); }
});

app.put('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found." });
    if (note.user.toString() !== req.user.id) return res.status(403).json({ message: "Access Denied" });

    if (req.body.isPrivate !== undefined) {
      if (req.body.isPrivate === false) {
        const userGroup = await Group.findOne({ members: req.user.id });
        if (!userGroup) return res.status(400).json({ message: "No group found." });
        note.groupId = userGroup._id;
        note.isPrivate = false;
      } else {
        note.groupId = null;
        note.isPrivate = true;
        note.deletedByUsers = [];
      }
    }

    if (req.body.title) note.title = req.body.title;
    if (req.body.courseId) note.courseId = req.body.courseId;
    if (req.body.content) note.content = req.body.content;
    if (req.body.referenceFiles) note.referenceFiles = req.body.referenceFiles;

    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json(note);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/notes/:id/delete', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;
    const oldGroupId = note.groupId;

    if (isCreator) {
      note.isDeleted = true;
      note.deletedAt = new Date();
    } else if (note.groupId) {
      if (!note.deletedByUsers.map(id => id.toString()).includes(req.user.id)) {
        note.deletedByUsers.push(req.user.id);
      }
    } else { return res.status(403).json({ error: "Unauthorized delete action." }); }

    await note.save();
    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: 'Moved to Bin safely' });
  } catch (error) { res.status(500).json({ error: "Error moving note to bin" }); }
});

app.put('/api/notes/:id/restore', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    if (note.user.toString() === req.user.id) {
      note.isDeleted = false;
      note.deletedAt = null;
    }
    note.deletedByUsers = note.deletedByUsers.filter(id => id.toString() !== req.user.id);
    await note.save();
    await broadcastLiveUpdate(note.groupId, req.user.id);
    res.json({ message: 'Restored cleanly' });
  } catch (error) { res.status(500).json({ error: "Error restoring note" }); }
});

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    const isCreator = note.user.toString() === req.user.id;
    const oldGroupId = note.groupId;

    if (isCreator) await Note.findByIdAndDelete(req.params.id);
    else { note.deletedByUsers.push(req.user.id); await note.save(); }

    await broadcastLiveUpdate(oldGroupId, req.user.id);
    res.json({ message: 'Permanently Purged' });
  } catch (error) { res.status(500).json({ error: "Error deleting note" }); }
});

// ==========================================
// 🏆 RELATIVE GRADING & LEADERBOARD API (SECURED)
// ==========================================
app.get('/api/course/:courseCode/section/:section/leaderboard', async (req, res) => {
  try {
    const { courseCode, section } = req.params;

    const cleanCourseCode = courseCode.replace(/\s+/g, '');
    const courseRegex = new RegExp([...cleanCourseCode].join('\\s*'), 'i');

    // 🚨 PRIVACY FIX: Only populate customProfilePic, NEVER the primary profilePic
    const matchingCourses = await Course.find({
      code: courseRegex,
      section: new RegExp(`^${section}$`, 'i')
    }).populate('userId', 'name portalId customProfilePic'); 

    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

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
        score: score || 0,
        // 🚨 PRIVACY FIX: Strictly mapping the custom picture or safe fallback
        pic: course.userId?.customProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(course.userId?.name || 'Student')}&backgroundColor=4f46e5`
      };
    });

    leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
    leaderboard.sort((a, b) => b.score - a.score);

    const total = leaderboard.length;
    leaderboard = leaderboard.map((s, idx) => {
      const pctile = (idx / total) * 100;
      let grade = 'F';

      if (pctile < 10) grade = 'A';
      else if (pctile < 20) grade = 'A-';
      else if (pctile < 35) grade = 'B+';
      else if (pctile < 50) grade = 'B';
      else if (pctile < 65) grade = 'B-';
      else if (pctile < 80) grade = 'C';
      else if (pctile < 95) grade = 'D';

      return { ...s, rank: idx + 1, grade };
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});

// ==========================================
// 🔔 THE 1-MINUTE CRON ENGINES 
// ==========================================

cron.schedule('* * * * *', async () => {

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

// ==========================================
// 🔔 3x DAILY SYNC PROMPT NOTIFICATIONS
// 9:00 AM PKT (4:00 AM UTC), 1:00 PM PKT (8:00 AM UTC), 6:00 PM PKT (1:00 PM UTC)
// ==========================================
async function sendSyncPromptToAll(title, body) {
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      $or: [
        { pushTokens: { $exists: true, $not: { $size: 0 } } },
        { pushToken: { $exists: true, $ne: null } }
      ]
    });

    console.log(`[CRON] 📢 Sync Prompt (${title}) → ${activeUsers.length} users`);

    for (let user of activeUsers) {
      await sendPush(
        user,
        title,
        body,
        { type: 'sync_prompt', action: 'OPEN_APP' },
        'smart-alert',
        'default'
      );
    }
  } catch (error) {
    console.error(`[SYNC PROMPT] Error:`, error.message);
  }
}

// 9:00 AM PKT = 4:00 AM UTC
cron.schedule('0 4 * * *', () => sendSyncPromptToAll("🚀 Don't Fall Behind!", "Stay on top of your classes. Tap here to sync your latest attendance and grades now."));
// 1:00 PM PKT = 8:00 AM UTC
cron.schedule('0 8 * * *', () => sendSyncPromptToAll("⚠️ Pending Submissions?", "Make sure you haven't missed any new assignments. Sync your portal to check."));
// 6:00 PM PKT = 1:00 PM UTC
cron.schedule('0 13 * * *', () => sendSyncPromptToAll("📊 End of Day Sync", "Your portal data might have changed. Keep your dashboard up to date before tomorrow!"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`));
