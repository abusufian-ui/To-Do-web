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

// 🚨 NEW: CHANGE DETECTOR IMPORTS
const { 
  detectAttendanceChanges, 
  detectAnnouncementChanges, 
  detectSubmissionChanges, 
  detectGradeChanges 
} = require('./services/changeDetector');

// 🚨 NEW: CLOUDINARY IMPORTS
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const { encrypt, decrypt } = require('./utils/encryption');
const { parseUCPDate } = require('./utils/dateParser');
const crypto = require('crypto');
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
const FocusSession = require('./models/FocusSession');
const Notification = require('./models/Notification');
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
const SystemSettings = require('./models/SystemSettings');
const AdminNotification = require('./models/AdminNotification');
const Assessment = require('./models/Assessment');
const Exam = require('./models/Exam'); // 🚨 NEW: DATESHEET EXAM MODEL
const Group = require('./models/Group');
const GroupInvitation = require('./models/GroupInvitation');
const SyncLog = require('./models/SyncLog'); // 🚨 NEW: SYNC DIAGNOSTICS LOG
const { spawn } = require('child_process');

// 🚨 NEW: COURSE MATERIAL & VAULT MODELS & CONVERTER
const CourseMaterial = require('./models/CourseMaterial');
const CourseVaultFile = require('./models/CourseVaultFile');
const MaterialLink   = require('./models/MaterialLink');
const { convertToPdf } = require('./utils/documentConverter');

// 🚨 NEW: BACKBLAZE B2 + MATERIAL PROCESSOR
const { getSignedDownloadUrl } = require('./utils/b2Client');
const { processUserMaterials, runNightlyMaterialSync } = require('./services/materialProcessor');


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

// Ensure the media directory exists safely
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

// ==========================================
// 📦 TEMP CHUNK STORAGE (for chunked APK uploads)
// ==========================================
const chunkDir = process.env.NODE_ENV === 'production'
  ? '/var/www/student_portal/apk_chunks/'
  : path.join(__dirname, 'apk_chunks');
try {
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
    console.log(`📦 Created chunk temp directory at: ${chunkDir}`);
  }
} catch (err) {
  console.error(`❌ Failed to create chunk temp directory:`, err.message);
}

// ==========================================
// 📂 TEMP MATERIALS UPLOAD DIRECTORY
// ==========================================
const tempDir = path.join(__dirname, 'uploads', 'temp');
try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`📁 Created temp uploads directory at: ${tempDir}`);
  }
} catch (err) {
  console.error(`❌ Failed to create temp uploads directory:`, err.message);
}

const tempUpload = multer({
  dest: tempDir,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});


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
  'http://192.168.0.117:8081',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-chunk-index', 'x-total-chunks'],
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
      
      const isSharedPath = req.originalUrl.includes('/groups') || 
                           req.originalUrl.includes('/tasks') || 
                           req.originalUrl.includes('/notes');
      
      if (isSharedPath) {
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
    }
    return originalJson.call(this, data);
  };
  next();
});

const auth = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET || 'secret_key_123');
    const userExists = await User.findById(decoded.id);
    if (!userExists) {
      return res.status(401).json({ message: 'User account has been deleted' });
    }
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Token is not valid' });
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
    const { subject, description, screenshots } = req.body;
    if (!subject || !description) return res.status(400).json({ message: "Subject and description are required." });

    const newFeedback = new Feedback({
      userId: req.user.id,
      subject: subject,
      description: description,
      screenshots: screenshots || []
    });

    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ message: "Server Error processing feedback" });
  }
});

// Fetch current user's submitted support tickets
app.get('/api/feedback/my', auth, async (req, res) => {
  try {
    const tickets = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Fetch User Tickets Error:", error);
    res.status(500).json({ message: "Server Error fetching tickets" });
  }
});

// Fetch all tickets for admin panel
app.get('/api/admin/feedback', auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});

// Resolve and close a support ticket
app.put('/api/admin/feedback/:id/resolve', auth, adminAuth, async (req, res) => {
  try {
    const { adminResponse } = req.body;
    if (!adminResponse) return res.status(400).json({ message: "Admin response is required." });

    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', adminResponse, disputeMessage: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    // Send push notification to the user
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Ticket Resolved ✅",
          `Your ticket "${ticket.subject}" has been resolved by support. Tap to view the details.`,
          { type: "ticket_resolved", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send ticket resolve push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Resolve Ticket Error:", error);
    res.status(500).json({ message: "Server Error resolving ticket" });
  }
});

// User disputes a resolved support ticket
app.put('/api/feedback/:id/dispute', auth, async (req, res) => {
  try {
    const { disputeMessage } = req.body;
    if (!disputeMessage) return res.status(400).json({ message: "Dispute reason is required." });

    const ticket = await Feedback.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    if (ticket.status !== 'resolved') return res.status(400).json({ message: "Only resolved tickets can be disputed." });

    ticket.status = 'disputed';
    ticket.disputeMessage = disputeMessage;
    await ticket.save();

    res.json(ticket);
  } catch (error) {
    console.error("Dispute Ticket Error:", error);
    res.status(500).json({ message: "Server Error disputing ticket" });
  }
});

// Admin deny dispute and mark ticket as invalid
app.put('/api/admin/feedback/:id/deny-dispute', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'invalid' },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    // Send push notification to the user
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Dispute Denied ❌",
          `Your dispute on ticket "${ticket.subject}" has been marked as invalid.`,
          { type: "dispute_denied", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send dispute denied push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Deny Dispute Error:", error);
    res.status(500).json({ message: "Server Error denying dispute" });
  }
});

// Bulk delete support tickets
app.post('/api/admin/feedback/bulk-delete', auth, adminAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No ticket IDs provided." });
    }

    await Feedback.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: "Selected tickets deleted successfully." });
  } catch (error) {
    console.error("Bulk Delete Tickets Error:", error);
    res.status(500).json({ message: "Server Error deleting tickets" });
  }
});

// Re-open a resolved support ticket
app.put('/api/admin/feedback/:id/reopen', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'open', adminResponse: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    // Send push notification to the user
    if (ticket.userId) {
      try {
        await sendPush(
          ticket.userId,
          "Support Ticket Re-opened 🔄",
          `Your ticket "${ticket.subject}" has been re-opened for further review.`,
          { type: "ticket_reopened", ticketId: ticket._id.toString() }
        );
      } catch (pushErr) {
        console.error("Failed to send ticket re-open push notification:", pushErr.message);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error("Re-open Ticket Error:", error);
    res.status(500).json({ message: "Server Error re-opening ticket" });
  }
});

// ==========================================
// 🚀 NEW: PUBLIC AND ADMIN WEBSITE SETTINGS & APK ENDPOINTS
// ==========================================

const apkDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'myportal.apk');
  }
});

const apkUpload = multer({
  storage: apkDiskStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.apk') {
      return cb(new Error('Only APK files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit
});

// Public: Get general website configuration
app.get('/api/public/settings', async (req, res) => {
  try {
    let webPortalLink = "https://myportalucp.online/";
    const linkSetting = await SystemSettings.findOne({ key: "web_portal_link" });
    if (linkSetting) {
      webPortalLink = linkSetting.value;
    }

    let apkInfo = { uploaded: false };
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    const baseUrl = getBaseUrl(req);

    if (dbSetting && dbSetting.value && dbSetting.value.uploaded) {
      apkInfo = {
        ...dbSetting.value,
        url: `${baseUrl}/api/public/download-apk`
      };
    } else {
      const apkPath = path.join(uploadDir, 'myportal.apk');
      if (fs.existsSync(apkPath)) {
        const stat = fs.statSync(apkPath);
        apkInfo = {
          uploaded: true,
          filename: 'myportal.apk',
          size: stat.size,
          uploadedAt: stat.mtime,
          url: `${baseUrl}/api/public/download-apk`
        };
      }
    }

    res.json({ webPortalLink, apkInfo });
  } catch (error) {
    console.error("Public Settings Error:", error);
    res.status(500).json({ message: "Server Error fetching settings" });
  }
});

// Public: Stream and download the active APK file with forced filename
app.get('/api/public/download-apk', async (req, res) => {
  try {
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    
    // Check if Cloudinary URL is stored and valid
    if (dbSetting && dbSetting.value && dbSetting.value.uploaded && dbSetting.value.url && !dbSetting.value.url.includes('/api/public/download-apk')) {
      const cloudinaryUrl = dbSetting.value.url;
      
      const streamRes = await axios({
        method: 'get',
        url: cloudinaryUrl,
        responseType: 'stream'
      });
      
      // Set forced download headers so browser always saves as myportal.apk
      res.setHeader('Content-Disposition', 'attachment; filename="myportal.apk"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      
      // Forward Content-Length so browsers/download managers show accurate file size
      // and don't stall waiting for an unknown-length stream on large 100-200MB files
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      
      return streamRes.data.pipe(res);
    }
    
    // Local storage fallback
    const apkPath = path.join(uploadDir, 'myportal.apk');
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ message: "APK release not found on server storage." });
    }
    res.download(apkPath, 'myportal.apk');
  } catch (error) {
    console.error("Download APK Error:", error);
    res.status(500).json({ message: "Server error processing file download." });
  }
});

// Public: Submit support feedback from general website
app.post('/api/feedback/public', async (req, res) => {
  try {
    const { name, email, subject, description } = req.body;
    if (!name || !email || !subject || !description) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const newFeedback = new Feedback({
      name,
      email,
      subject,
      description,
      status: 'open'
    });
    await newFeedback.save();
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (error) {
    console.error("Public Feedback Error:", error);
    res.status(500).json({ message: "Server Error processing feedback" });
  }
});

// Admin: Save web portal link configuration
app.post('/api/admin/settings/web-portal-link', auth, adminAuth, async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: "Link is required." });

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "web_portal_link" },
      { value: link },
      { upsert: true, new: true }
    );
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save Web Portal Link Error:", error);
    res.status(500).json({ message: "Server Error saving portal link" });
  }
});

// Admin: Upload APK release
app.post('/api/admin/settings/apk-upload', auth, adminAuth, (req, res) => {
  apkUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    try {
      const baseUrl = getBaseUrl(req);
      const apkInfo = {
        uploaded: true,
        filename: 'myportal.apk',
        size: req.file.size,
        uploadedAt: new Date(),
        url: `${baseUrl}/api/public/download-apk`
      };

      await SystemSettings.findOneAndUpdate(
        { key: "apk_info" },
        { value: apkInfo },
        { upsert: true, new: true }
      );

      res.json({ success: true, apkInfo });
    } catch (error) {
      console.error("APK Settings Save Error:", error);
      res.status(500).json({ message: "Server Error saving APK metadata" });
    }
  });
});

// Admin: Delete APK release from filesystem & database
app.delete('/api/admin/settings/apk-delete', auth, adminAuth, async (req, res) => {
  try {
    const apkPath = path.join(uploadDir, 'myportal.apk');
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }

    const apkInfo = {
      uploaded: false,
      filename: null,
      size: 0,
      uploadedAt: null,
      url: null
    };

    await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo });
  } catch (error) {
    console.error("Delete APK Error:", error);
    res.status(500).json({ message: "Server Error deleting APK" });
  }
});

// Admin: Receive a single binary chunk from a chunked APK upload.
// Each request is ~10MB so it safely passes through Nginx's client_max_body_size.
// Route uses express.raw() so the binary body is available as req.body (Buffer).
app.post(
  '/api/admin/apk-chunk',
  auth,
  adminAuth,
  express.raw({ type: 'application/octet-stream', limit: '12mb' }),
  (req, res) => {
    try {
      const chunkIndex = parseInt(req.headers['x-chunk-index'], 10);
      const totalChunks = parseInt(req.headers['x-total-chunks'], 10);

      if (isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ message: 'Missing x-chunk-index or x-total-chunks headers.' });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: 'Empty chunk body received.' });
      }

      const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
      fs.writeFileSync(chunkPath, req.body);

      console.log(`📦 APK chunk ${chunkIndex + 1}/${totalChunks} saved (${(req.body.length / 1024 / 1024).toFixed(2)} MB)`);
      res.json({ success: true, received: chunkIndex });
    } catch (err) {
      console.error('APK Chunk Upload Error:', err);
      res.status(500).json({ message: 'Server error saving chunk.' });
    }
  }
);

// Admin: Finalize a chunked APK upload — assemble all chunks into myportal.apk.
app.post('/api/admin/apk-finalize', auth, adminAuth, async (req, res) => {
  try {
    const { totalChunks, totalSize } = req.body;
    if (!totalChunks || totalChunks < 1) {
      return res.status(400).json({ message: 'totalChunks is required.' });
    }

    const finalApkPath = path.join(uploadDir, 'myportal.apk');

    // Remove old APK if it exists
    if (fs.existsSync(finalApkPath)) {
      fs.unlinkSync(finalApkPath);
      console.log('🗑️  Deleted old myportal.apk before assembly.');
    }

    // Verify all chunks exist before assembling
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(cp)) {
        return res.status(400).json({ message: `Missing chunk ${i}. Upload may be incomplete.` });
      }
    }

    // Assemble chunks in order into myportal.apk
    const writeStream = fs.createWriteStream(finalApkPath);
    for (let i = 0; i < totalChunks; i++) {
      const cp = path.join(chunkDir, `chunk_${i}`);
      const chunkData = fs.readFileSync(cp);
      writeStream.write(chunkData);
    }
    writeStream.end();

    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Clean up all chunk temp files
    for (let i = 0; i < totalChunks; i++) {
      try { fs.unlinkSync(path.join(chunkDir, `chunk_${i}`)); } catch {}
    }

    const assembledSize = fs.statSync(finalApkPath).size;
    console.log(`✅ APK assembled successfully: ${(assembledSize / 1024 / 1024).toFixed(2)} MB`);

    // Build the download URL using backend base URL
    const baseUrl = getBaseUrl(req);
    const apkInfo = {
      uploaded: true,
      filename: 'myportal.apk',
      size: assembledSize,
      uploadedAt: new Date(),
      url: `${baseUrl}/api/public/download-apk`
    };

    await SystemSettings.findOneAndUpdate(
      { key: 'apk_info' },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo });
  } catch (err) {
    console.error('APK Finalize Error:', err);
    res.status(500).json({ message: 'Server error assembling APK.' });
  }
});

// Admin: Save APK Cloudinary CDN URL and size metadata (KEPT for backwards compatibility)
app.post('/api/admin/settings/apk-url', auth, adminAuth, async (req, res) => {
  try {
    const { url, size, filename } = req.body;
    if (!url) return res.status(400).json({ message: "URL is required." });

    const apkInfo = {
      uploaded: true,
      filename: filename || 'myportal.apk',
      size: size || 0,
      uploadedAt: new Date(),
      url: url
    };

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );

    res.json({ success: true, apkInfo: setting.value });
  } catch (error) {
    console.error("Save APK URL Error:", error);
    res.status(500).json({ message: "Server Error saving APK URL" });
  }
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
    if (user && user.isBlocked) {
      return res.status(503).json({ message: "Network Error: Timeout communicating with identity provider." });
    }
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

    const title = "UCP Session Expired ⚠️";
    const message = "Your university portal session has expired. Tap here to log in.";

    await sendPush(
      user,
      title,
      message,
      { type: "session_expired" },
      "smart-alert",
      "default"
    );

    await createAcademicNotification(user._id, 'system', title, message);

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

// Helper to compute a consistent content hash for a submissions tasks list
const computeSubmissionsHash = (tasks) => {
  const hash = crypto.createHash('md5');
  const serialized = (tasks || []).map(t => {
    const normalizedDueDate = parseUCPDate(t.dueDate);
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const desc = (t.description || '').replace(/\s+/g, ' ').trim();
    const status = t.status || 'Pending';
    const attachmentUrl = t.attachmentUrl || '';
    const submissionUrl = t.submissionUrl || '';
    return `${title}|${desc}|${normalizedDueDate}|${status}|${attachmentUrl}|${submissionUrl}`;
  }).sort().join('||');
  hash.update(serialized);
  return hash.digest('hex');
};

// Helper to merge newly scraped tasks with existing DB tasks, preserving 'Submitted' statuses
const mergeUserTasks = (existingTasks, incomingTasks) => {
  const existingTasksList = existingTasks || [];
  const existingTaskMap = new Map();
  for (const t of existingTasksList) {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(t.dueDate);
    const fp = `${title}_${normDate}`;
    existingTaskMap.set(fp, t);
  }

  const mergedTasks = [];
  for (const incomingTask of incomingTasks) {
    const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(incomingTask.dueDate);
    const fp = `${title}_${normDate}`;

    if (existingTaskMap.has(fp)) {
      const existingTask = existingTaskMap.get(fp);
      const status = (existingTask.status === 'Submitted' || incomingTask.status === 'Submitted') ? 'Submitted' : 'Pending';
      mergedTasks.push({
        ...incomingTask,
        dueDate: normDate,
        startDate: parseUCPDate(incomingTask.startDate),
        status
      });
    } else {
      mergedTasks.push({
        ...incomingTask,
        dueDate: normDate,
        startDate: parseUCPDate(incomingTask.startDate)
      });
    }
  }

  const incomingFps = new Set(incomingTasks.map(t => {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(t.dueDate);
    return `${title}_${normDate}`;
  }));

  for (const existingTask of existingTasksList) {
    const title = (existingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(existingTask.dueDate);
    const fp = `${title}_${normDate}`;

    if (!incomingFps.has(fp)) {
      mergedTasks.push(existingTask);
    }
  }

  return mergedTasks;
};

app.post('/api/extension-sync', auth, async (req, res) => {
  try {
    const { gradesData, historyData, statsData, timetableData, attendanceData, announcementsData, submissionsData, datesheetData, portalId, ucpCookie, courseMap: clientCourseMap, syncMode, studentName, profilePic, syncLogId, materialLinksData } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Default mode is AUTO_SYNC if not explicitly provided
    const mode = syncMode || 'AUTO_SYNC';

    let activePortalId = portalId;
    if ((!activePortalId || activePortalId === "BACKGROUND_SYNC") && user.portalId) {
      activePortalId = user.portalId;
    }

    if (!activePortalId) {
      console.error(`[SYNC] Student ID not detected. portalId provided: ${portalId}, user.portalId: ${user.portalId}`);
      throw new Error("Student ID not detected.");
    }
    if (user.portalId && user.portalId.toUpperCase() !== activePortalId.toUpperCase()) {
      throw new Error(`Mismatch! Linked to ${user.portalId}, but found ${activePortalId}.`);
    }
    if (!user.portalId) user.portalId = activePortalId.toUpperCase();

    // ── Tracker for SyncLog ──
    let changesSummary = {};

    // ── Extract enrolled sections from courseMap and ensure Courses exist ──
    const enrolledSections = [];
    const sectionLookup = {}; 
    const baseCodeLookup = {}; 
    if (clientCourseMap && typeof clientCourseMap === 'object') {
      for (const [url, info] of Object.entries(clientCourseMap)) {
        const fullCode = (info.code || '').trim();
        const courseName = (info.name || '').trim();
        const creditHours = info.creditHours !== undefined ? info.creditHours : 3; 

        let sectionCode = '';
        if (fullCode) {
          const parts = fullCode.split('-');
          const candidate = parts.length > 1 ? parts[parts.length - 1] : fullCode;
          const isValidSection = candidate && 
            !candidate.includes(' ') && 
            !candidate.toLowerCase().includes('credit') && 
            !candidate.toLowerCase().includes('hour') && 
            candidate.length <= 15 &&
            /^[a-zA-Z0-9-]+$/.test(candidate);

          if (isValidSection) {
            sectionCode = candidate;
            enrolledSections.push(sectionCode);
            sectionLookup[url] = sectionCode;
          }
        }

        if (courseName) {
          if (sectionCode) {
            sectionLookup[courseName] = sectionCode;
            if (!sectionLookup[`${courseName} - Lab`]) {
              sectionLookup[`${courseName} - Lab`] = sectionCode;
            }
          }
          if (fullCode) {
            baseCodeLookup[courseName] = fullCode;
            if (!baseCodeLookup[`${courseName} - Lab`]) {
              baseCodeLookup[`${courseName} - Lab`] = fullCode;
            }
          }

          // ✅ Save creditHours + portalUrl to DB dynamically
          const updatePayload = { userId, name: courseName, type: 'university', creditHours };
          if (fullCode) updatePayload.code = fullCode;
          if (sectionCode) updatePayload.section = sectionCode;
          if (url) updatePayload.portalUrl = url; // Store the full portal URL for nightly scraper

          await Course.findOneAndUpdate(
            { userId, name: courseName },
            { $set: updatePayload },
            { upsert: true }
          );
        }
      }
    }
    
    // ── Attendance Sync & Push Notifications ──
    if (attendanceData && attendanceData.length > 0) {
      for (const att of attendanceData) {
        if (!att.courseUrl || !att.courseName || att.courseName.includes("Unknown")) continue;
        if (att.records) {
          const oldAtt = await Attendance.findOne({ userId, courseUrl: att.courseUrl });
          const changes = detectAttendanceChanges(oldAtt, att);
          
          if (changes) {
            if (changes.isNewAbsent) {
              sendPush(user, `Attendance Alert: ${att.courseName} ⚠️`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
              await createAcademicNotification(userId, 'attendance', `Attendance Alert: ${att.courseName}`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
            }
            if (changes.isCritical) {
              sendPush(user, `CRITICAL: ${att.courseName} 🚨`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
              await createAcademicNotification(userId, 'attendance', `CRITICAL: ${att.courseName}`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
            }
            // Emit granular WebSocket event
            io.to(userId.toString()).emit('attendance_update', changes);
            changesSummary.attendance = changesSummary.attendance || [];
            if (!changesSummary.attendance.includes(att.courseName)) changesSummary.attendance.push(att.courseName);
          }
          await Attendance.findOneAndUpdate({ userId, courseUrl: att.courseUrl }, { ...att, lastUpdated: new Date() }, { upsert: true });
        }
      }
    }

    // ── Announcements Sync ──
    if (announcementsData && announcementsData.length > 0) {
      for (const ann of announcementsData) {
        if (!ann.courseUrl || !ann.courseName || ann.courseName.includes("Unknown")) continue;
        if (ann.news) {
          const oldAnn = await Announcement.findOne({ userId, courseUrl: ann.courseUrl });
          const changes = detectAnnouncementChanges(oldAnn, ann);
          
          if (changes) {
            sendPush(user, `New Announcement: ${ann.courseName} 📢`, changes.latestSubject || "Tap to view details.");
            await createAcademicNotification(userId, 'announcement', `New Announcement: ${ann.courseName}`, changes.latestSubject || "Tap to view details.", ann.courseUrl);
            io.to(userId.toString()).emit('announcement_update', changes);
            changesSummary.announcements = changesSummary.announcements || [];
            if (!changesSummary.announcements.includes(ann.courseName)) changesSummary.announcements.push(ann.courseName);
          }
          await Announcement.findOneAndUpdate({ userId, courseUrl: ann.courseUrl }, { ...ann, lastUpdated: new Date() }, { upsert: true });
        }
      }
    }

    // ── Submissions & Peer Syncing ──
    if (submissionsData && submissionsData.length > 0) {
      for (const sub of submissionsData) {
        if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;

        if (sub.tasks) {
          const oldSub = await Submission.findOne({ userId, courseUrl: sub.courseUrl });
          const mergedTasks = mergeUserTasks(oldSub?.tasks, sub.tasks);
          const changes = detectSubmissionChanges(oldSub, sub);
          
          if (changes) {
            io.to(userId.toString()).emit('submission_update', changes);
            changesSummary.submissions = changesSummary.submissions || [];
            if (!changesSummary.submissions.includes(sub.courseName)) changesSummary.submissions.push(sub.courseName);
          }

          const newHash = computeSubmissionsHash(mergedTasks);
          if (oldSub && oldSub.lastSyncHash === newHash) {
            console.log(`[SYNC] Submissions for ${sub.courseName} unchanged (hash match), skipping save.`);
          } else {
            await Submission.findOneAndUpdate(
              { userId, courseUrl: sub.courseUrl },
              { $set: { courseName: sub.courseName, tasks: mergedTasks, lastSyncHash: newHash, lastUpdated: new Date() } },
              { upsert: true }
            );
          }

          const sectionCode = sectionLookup[sub.courseName] || sectionLookup[sub.courseUrl] || '';
          if (sectionCode) {
            const peerCourseDocs = await Course.find({ name: sub.courseName, section: sectionCode });
            const peerUserIds = peerCourseDocs.map(c => c.userId.toString()).filter(id => id !== userId.toString());
            const uniquePeerIds = [...new Set(peerUserIds)];

            for (const peerId of uniquePeerIds) {
              const peerSub = await Submission.findOne({ userId: peerId, courseName: sub.courseName });
              const existingTasks = peerSub && peerSub.tasks ? peerSub.tasks : [];
              const existingTaskMap = new Map(existingTasks.map(t => {
                const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const normDate = parseUCPDate(t.dueDate);
                return [`${title}_${normDate}`, t];
              }));

              let merged = false;
              let newPeerTasks = [];
              mergedTasks.forEach(incomingTask => {
                const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const normDate = parseUCPDate(incomingTask.dueDate);
                const fingerprint = `${title}_${normDate}`;
                if (!existingTaskMap.has(fingerprint)) {
                  // Force classmate tasks to default to Pending to prevent status contamination
                  const peerTask = { ...incomingTask, status: 'Pending', dueDate: normDate, startDate: parseUCPDate(incomingTask.startDate) };
                  existingTasks.push(peerTask);
                  newPeerTasks.push(peerTask);
                  merged = true;
                }
              });

              if (merged) {
                const peerNewHash = computeSubmissionsHash(existingTasks);
                await Submission.findOneAndUpdate(
                  { userId: peerId, courseName: sub.courseName },
                  { $set: { courseUrl: sub.courseUrl, courseName: sub.courseName, tasks: existingTasks, lastSyncHash: peerNewHash, lastUpdated: new Date() } },
                  { upsert: true }
                );
                // Broadcast to peer as well
                io.to(peerId.toString()).emit('submission_update', {
                  type: 'SUBMISSION_UPDATE',
                  courseName: sub.courseName,
                  newCount: newPeerTasks.length,
                  newTasks: newPeerTasks
                });
              }
            }
          }
        }
      }
    }

    // ── FIXED: Timetable Sync (Pulled OUT of LOGIN_SYNC to allow background updates) ──
    // By using deleteMany on EVERY sync where we have data, we completely wipe out 
    // old makeup classes, dropped courses, and garbage data, ensuring a 1:1 mirror.
    if (timetableData && timetableData.length > 0) {
      const courseMapLocal = new Map();
      const preparedClasses = [];

      for (const classItem of timetableData) {
        const { id, ...classData } = classItem;
        if (!classData.courseName || classData.courseName.includes("Unknown")) continue;

        const isMakeup = classData.isMakeup || (classData.instructor && classData.instructor.toLowerCase().includes('makeup'));
        let expiresAt = undefined;
        
        if (isMakeup) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const targetDayIndex = dayNames.indexOf(classData.day);
          if (targetDayIndex !== -1) {
            const now = new Date();
            const currentDayIndex = now.getDay();
            let daysDiff = targetDayIndex - currentDayIndex;
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + daysDiff);
            targetDate.setHours(23, 59, 59, 999);
            expiresAt = targetDate;
          }
        }

        preparedClasses.push({
          ...classData,
          isMakeup,
          expiresAt,
          userId,
          lastUpdated: new Date()
        });

        if (!courseMapLocal.has(classItem.courseName)) {
          courseMapLocal.set(classItem.courseName, { 
            name: classItem.courseName, 
            code: classItem.courseCode || '', 
            color: classItem.color || '#3498db', 
            instructors: new Set(), 
            rooms: new Set() 
          });
        }
        const course = courseMapLocal.get(classItem.courseName);
        if (classItem.instructor && !classItem.instructor.includes('Unknown')) course.instructors.add(classItem.instructor);
        if (classItem.room && !classItem.room.includes('Unknown') && !classItem.room.includes('TBA')) course.rooms.add(classItem.room);
      }

      await Timetable.deleteMany({ userId });
      if (preparedClasses.length > 0) {
        await Timetable.insertMany(preparedClasses);
      }

      for (const [courseName, data] of courseMapLocal.entries()) {
        const sectionCode = sectionLookup[courseName] || '';
        const fullCode = baseCodeLookup[courseName] || data.code || '';

        const courseUpdatePayload = {
  userId, 
  name: data.name, 
  type: 'university',
  color: data.color || '#3498db'
};

if (fullCode) courseUpdatePayload.code = fullCode;
if (sectionCode) courseUpdatePayload.section = sectionCode;

// 🚨 CRITICAL FIX: Only overwrite instructors/rooms if the scraper actually found them in the timetable
if (data.instructors && data.instructors.size > 0) {
  courseUpdatePayload.instructors = Array.from(data.instructors);
}
if (data.rooms && data.rooms.size > 0) {
  courseUpdatePayload.rooms = Array.from(data.rooms);
}

await Course.findOneAndUpdate(
  { userId, name: courseName },
  { $set: courseUpdatePayload },
  { upsert: true }
);
      }
    }

    // ── Datesheet Sync ──
    if (mode === 'LOGIN_SYNC' || mode === 'FORCE_SYNC') {
      if (datesheetData && datesheetData.length > 0) {
        await Exam.deleteMany({ userId });
        for (const exam of datesheetData) {
          await new Exam({ ...exam, userId, lastUpdated: new Date() }).save();
        }
      }
    }

    // ── Grades Sync ──
    if (gradesData && gradesData.length > 0) {
      if (mode === 'LOGIN_SYNC') await Grade.deleteMany({ userId });
      for (const grade of gradesData) {
        if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
        
        const oldGrade = await Grade.findOne({ userId, courseUrl: grade.courseUrl });
        const changes = detectGradeChanges(oldGrade, grade);
        if (changes) {
          sendPush(user, `Grade Update: ${grade.courseName} 📊`, `Your total weight is now ${changes.newPercentage}%`);
          await createAcademicNotification(userId, 'marks', `Grade Update: ${grade.courseName}`, `Your total weight is now ${changes.newPercentage}%`, grade.courseUrl);
          io.to(userId.toString()).emit('grade_update', changes);
          changesSummary.grades = changesSummary.grades || [];
          if (!changesSummary.grades.includes(grade.courseName)) changesSummary.grades.push(grade.courseName);
        }
        await Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...grade, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    // ── History Sync ──
    if (historyData && historyData.length > 0) {
      if (mode === 'LOGIN_SYNC') await ResultHistory.deleteMany({ userId });
      for (const sem of historyData) {
        if (!sem.term) continue;

        const existing = await ResultHistory.findOne({ userId, term: sem.term });
        if (existing) {
          const updateDoc = {};
          if (sem.cgpa && (sem.cgpa !== "0.00" || existing.cgpa === "0.00")) {
            updateDoc.cgpa = sem.cgpa;
          }
          if (sem.sgpa && (sem.sgpa !== "0.00" || existing.sgpa === "0.00")) {
            updateDoc.sgpa = sem.sgpa;
          }
          if (sem.earnedCH !== undefined && sem.earnedCH !== null) {
            updateDoc.earnedCH = sem.earnedCH;
          }
          if (sem.courses && sem.courses.length > 0) {
            updateDoc.courses = sem.courses;
          }
          updateDoc.lastUpdated = new Date();
          
          await ResultHistory.findOneAndUpdate(
            { term: sem.term, userId },
            { $set: updateDoc },
            { upsert: true }
          );
        } else {
          await ResultHistory.findOneAndUpdate(
            { term: sem.term, userId },
            { ...sem, userId, lastUpdated: new Date() },
            { upsert: true }
          );
        }
      }
    }

    // ── Stats Sync ──
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

    // ── User Profile Sync ──
    const updateFields = {
      isPortalConnected: true,
      lastSyncAt: new Date(),
      lastScrapedAt: new Date(),
      portalId: user.portalId,
      ucpCookie: ucpCookie || user.ucpCookie,
      ...(enrolledSections.length > 0 ? { enrolledSections } : {})
    };
    if (studentName && studentName !== 'UCP Student') updateFields.name = studentName;
    if (profilePic) updateFields.portalProfilePic = profilePic;

    await User.updateOne({ _id: userId }, {
      $set: updateFields
    });

    if (syncLogId) {
      // Clean up empty changesSummary
      if (Object.keys(changesSummary).length === 0) changesSummary = null;

      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: 'SUCCESS',
        endTime: new Date(),
        changesSummary: changesSummary
      });
    }


    // ── 🗂️ Material Links: Stage + Immediately Trigger Processing ──
    // Session-bound download URLs expire when cookie expires.
    // Process IMMEDIATELY while session is live. Even duplicate links trigger a re-run
    // so any newly added files by the teacher are picked up.
    if (materialLinksData && Array.isArray(materialLinksData) && materialLinksData.length > 0) {
      const liveCookie = ucpCookie || user.ucpCookie;
      if (liveCookie) {
        let stagedCount = 0;
        for (const item of materialLinksData) {
          if (!item.courseUrl || !item.links || item.links.length === 0) continue;

          // Derive section and teacher from context already parsed above
          const itemSectionCode = sectionLookup[item.courseUrl] || sectionLookup[item.courseName] || '';
          const courseDoc = await Course.findOne({ userId, name: item.courseName }).lean();
          const itemTeacherName = (courseDoc?.instructors || [])[0] || '';

          // Always upsert with fresh links + reset processed = false
          // so the processor always re-checks for new files
          await MaterialLink.findOneAndUpdate(
            { userId, courseUrl: item.courseUrl },
            {
              $set: {
                courseName: item.courseName || '',
                courseCode: item.courseCode || '',
                sectionCode: itemSectionCode,
                teacherName: itemTeacherName,
                links: item.links,
                lastScrapedAt: new Date(),
                processed: false
              }
            },
            { upsert: true }
          );
          stagedCount++;
        }

        if (stagedCount > 0) {
          console.log(`[SYNC] 📥 Staged ${stagedCount} material link sets. Firing processor immediately.`);
          // Fire immediately in background — session cookie is live right now
          setTimeout(() => processUserMaterials(userId.toString(), liveCookie), 200);
        }
      }
    }

    res.json({ message: "Sync & Diffing complete securely!" });

  } catch (error) {
    const { syncLogId } = req.body;
    if (syncLogId) {
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: 'FAILED',
        error: error.message,
        endTime: new Date()
      });
    }
    const statusCode = error.message.includes('Mismatch') || error.message.includes('not detected') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
});

app.post('/api/force-server-sync', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || !user.ucpCookie || !user.portalId) {
      return res.status(400).json({ message: "No cookie or portalId found. Please login again." });
    }

    // Create pending SyncLog
    const syncLog = new SyncLog({
      userId: user._id,
      portalId: user.portalId,
      mode: 'MANUAL_FULL',
      status: 'PENDING',
      startTime: new Date()
    });
    await syncLog.save();

    // Acknowledge immediately to prevent mobile app timeouts
    res.json({ message: "Server-side scraping triggered successfully." });

    // Run the scrape in the background
    setTimeout(async () => {
      const startTime = Date.now();
      try {
        const { scrapeServerSide } = require('./services/scraperEngine');
        const scrapedPayload = await scrapeServerSide(user.ucpCookie, 'FULL', user.portalId);

        // Append log ID to payload so extension-sync can mark it as success
        scrapedPayload.syncLogId = syncLog._id.toString();

        const jwt = require('jsonwebtoken');
        const axios = require('axios');
        const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error("[FORCE SYNC BACKGROUND ERROR]", error.message);
        syncLog.status = 'FAILED';
        syncLog.error = error.message;
        syncLog.endTime = new Date();
        syncLog.durationMs = Date.now() - startTime;
        await syncLog.save();
      }
    }, 100);

  } catch (error) {
    console.error("[FORCE SYNC ERROR]", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});

// ==========================================
// REST OF THE ROUTES
// ==========================================

const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("🔗 Connecting to MyPortal Database...");

mongoose.connect(dbLink, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}).then(async () => {
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

// --- NOTIFICATION ROUTES ---
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
    await broadcastLiveUpdate(group._id, req.user.id);
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
    const isPromoted = !adminIds.includes(memberId);
    if (isPromoted) {
      group.admins.push(memberId);
    } else {
      group.admins = group.admins.filter(id => id.toString() !== memberId);
    }

    await group.save();
    await broadcastLiveUpdate(group._id, req.user.id);
    
    if (isPromoted) {
      const memberUser = await User.findById(memberId);
      if (memberUser) {
        await createAcademicNotification(memberId, 'group', `Admin Promoted 👑`, `You are now an Admin of "${group.name}".`);
        if (typeof sendPush === 'function') sendPush(memberUser, `Admin Promoted 👑`, `You are now an Admin of "${group.name}".`);
        io.to(memberId.toString()).emit('live_db_update');
      }
    }
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

    const isMember = group.members.map(id => id.toString()).includes(req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: "Access Denied: Only Group Members can rename this workspace." });
    }

    group.name = name.trim();
    await group.save();
    await broadcastLiveUpdate(group._id, req.user.id);

    const updated = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error altering name." });
  }
});

// 🚀 NEW ENDPOINT: UPDATE GRADING PREFERENCE
app.put('/api/groups/grading-preference', auth, async (req, res) => {
  try {
    const { gradingPreference } = req.body;
    if (!['relative', 'absolute'].includes(gradingPreference)) {
      return res.status(400).json({ message: "Invalid grading preference." });
    }

    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group assignment absent." });

    const isAuthorizedAdmin = group.creatorId.toString() === req.user.id || group.admins.map(id => id.toString()).includes(req.user.id);
    if (!isAuthorizedAdmin) {
      return res.status(403).json({ message: "Access Denied: Only Group Admins can change grading preference." });
    }

    group.gradingPreference = gradingPreference;
    await group.save();
    await broadcastLiveUpdate(group._id, req.user.id);

    const updated = await Group.findById(group._id)
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error altering grading preference." });
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
    await broadcastLiveUpdate(group._id, req.user.id);
    
    // Notify receiver
    const sender = await User.findById(req.user.id);
    const receiver = await User.findById(receiverId);
    if (receiver && sender) {
      await createAcademicNotification(receiverId, 'group', `Group Invitation 🤝`, `${sender.name} invited you to join "${group.name}".`);
      if (typeof sendPush === 'function') sendPush(receiver, `Group Invitation 🤝`, `${sender.name} invited you to join "${group.name}".`);
    }

    io.to(receiverId.toString()).emit('live_db_update');
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

    const isMember = group.members.map(id => id.toString()).includes(req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: "Only group members can modify the profile picture." });
    }

    if (!req.file && !req.body.profilePic) {
      return res.status(400).json({ message: "No file or URL provided" });
    }

    const fileUrl = req.file ? req.file.path : req.body.profilePic;

    group.profilePic = fileUrl;
    await group.save();
    await broadcastLiveUpdate(group._id, req.user.id);

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

// 3. Leave or Disband Group (Robust Admin Leaving Protocol)
app.post('/api/groups/leave', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(400).json({ message: "You are not a member of any group." });

    const userIdStr = req.user.id.toString();
    const isGroupAdmin = group.admins.map(a => a.toString()).includes(userIdStr) || group.creatorId.toString() === userIdStr;

    const otherAdmins = group.admins.filter(a => a.toString() !== userIdStr);
    const otherMembers = group.members.filter(m => m.toString() !== userIdStr);

    if (isGroupAdmin) {
      if (otherAdmins.length > 0) {
        // Case 1: Group has another admin -> Do nothing, just exit current admin from admins and members list
        group.admins = otherAdmins;
        group.members = otherMembers;
        if (group.creatorId.toString() === userIdStr) {
          // If original creator is leaving, reassign creator status to the next active admin
          group.creatorId = otherAdmins[0];
        }
        await group.save();

        // Clean up tasks states for this leaving user
        await Task.updateMany(
          { groupId: group._id },
          { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
        );
        await broadcastLiveUpdate(group._id, req.user.id);
        res.json({ message: "Left group successfully. Workspace continues under other administrators." });
      }
      else if (otherMembers.length > 0) {
        // Case 2: Group has no other admin but has other members -> Must promote selected member to Admin next
        const { nextAdminId } = req.body;
        if (!nextAdminId) {
          return res.status(400).json({ message: "Please specify who should be promoted to Admin next." });
        }
        
        const nextAdminIdStr = nextAdminId.toString();
        const isValidMember = otherMembers.some(m => m.toString() === nextAdminIdStr);
        if (!isValidMember) {
          return res.status(400).json({ message: "Selected user is not a member of this group." });
        }

        // Re-assign admin and creator roles to the chosen member, then remove leaving admin
        group.admins = [nextAdminId];
        group.creatorId = nextAdminId;
        group.members = otherMembers;
        await group.save();

        // Notify promoted member
        const memberUser = await User.findById(nextAdminId);
        if (memberUser) {
          await createAcademicNotification(nextAdminId, 'group', `Admin Promoted 👑`, `You are now the Admin of "${group.name}".`);
          if (typeof sendPush === 'function') sendPush(memberUser, `Admin Promoted 👑`, `You are now the Admin of "${group.name}".`);
          io.to(nextAdminIdStr).emit('live_db_update');
        }

        // Clean up tasks states for this leaving user
        await Task.updateMany(
          { groupId: group._id },
          { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
        );
        await broadcastLiveUpdate(group._id, req.user.id);
        res.json({ message: "Left group successfully. Administrative role reassigned." });
      }
      else {
        // Case 3: Group has no one except admin -> Delete that group permanently
        const pendingInvites = await GroupInvitation.find({ groupId: group._id });
        for (const invite of pendingInvites) {
          io.to(invite.receiverId.toString()).emit('live_db_update');
        }
        await Group.findByIdAndDelete(group._id);
        await GroupInvitation.deleteMany({ groupId: group._id });
        await Task.updateMany({ groupId: group._id }, { groupId: null, memberStatuses: [] });
        await broadcastLiveUpdate(group._id, req.user.id);
        res.json({ message: "Group deleted permanently." });
      }
    } else {
      // Regular Member Exit: Leave Group
      group.members = otherMembers;
      group.admins = group.admins.filter(a => a.toString() !== userIdStr);
      await group.save();

      // Clean up member-specific states
      await Task.updateMany(
        { groupId: group._id },
        { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
      );
      await broadcastLiveUpdate(group._id, req.user.id);
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
    const { search } = req.query;
    const query = { _id: { $ne: req.user.id } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('name email profilePic portalId customProfilePic createdAt isAdmin')
      .sort({ name: 1 })
      .limit(100);

    const allGroups = await Group.find().select('members');
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
      await broadcastLiveUpdate(invite.groupId, req.user.id);
      return res.json({ message: "Invitation declined successfully" });
    }

    // Accepting
    // If the user is already in a group, automatically exit it and handle admin promotion
    const userInGroup = await Group.findOne({ members: req.user.id });
    if (userInGroup) {
      userInGroup.members = userInGroup.members.filter(m => m.toString() !== req.user.id);
      userInGroup.admins = userInGroup.admins.filter(a => a.toString() !== req.user.id);
      
      if (userInGroup.members.length === 0) {
        // Disband Group
        const pendingInvites = await GroupInvitation.find({ groupId: userInGroup._id });
        for (const invite of pendingInvites) {
          io.to(invite.receiverId.toString()).emit('live_db_update');
        }
        await Group.findByIdAndDelete(userInGroup._id);
        await GroupInvitation.deleteMany({ groupId: userInGroup._id });
        await Task.updateMany({ groupId: userInGroup._id }, { groupId: null, memberStatuses: [] });
      } else {
        // Leave Group and Auto-promote a member if no admins left
        const userIdStr = req.user.id.toString();
        const isOldGroupAdmin = userInGroup.admins.length === 0 || userInGroup.creatorId.toString() === userIdStr;

        if (isOldGroupAdmin && userInGroup.admins.length === 0) {
          // Promote first remaining member to admin and creator
          const nextAdmin = userInGroup.members[0];
          userInGroup.admins = [nextAdmin];
          userInGroup.creatorId = nextAdmin;
          
          // Notify the newly promoted admin
          const memberUser = await User.findById(nextAdmin);
          if (memberUser) {
            await createAcademicNotification(nextAdmin, 'group', `Admin Promoted 👑`, `You are now the Admin of "${userInGroup.name}".`);
            if (typeof sendPush === 'function') sendPush(memberUser, `Admin Promoted 👑`, `You are now the Admin of "${userInGroup.name}".`);
            io.to(nextAdmin.toString()).emit('live_db_update');
          }
        } else if (userInGroup.creatorId.toString() === userIdStr) {
          // If leaving user was creator but other admins exist, reassign creator to first remaining admin
          userInGroup.creatorId = userInGroup.admins[0];
        }

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

    const sender = await User.findById(req.user.id);
    await createGroupNotification(group._id, req.user.id, 'group', 'New Member Joined', `${sender?.name || 'A user'} accepted the invitation and joined the group.`);

    // Notify the inviter
    const inviter = await User.findById(invite.senderId);
    if (inviter) {
      await createAcademicNotification(invite.senderId, 'group', `Invitation Accepted ✅`, `${sender?.name || 'A user'} accepted your invite to "${group.name}".`);
      if (typeof sendPush === 'function') sendPush(inviter, `Invitation Accepted ✅`, `${sender?.name || 'A user'} accepted your invite to "${group.name}".`);
      io.to(invite.senderId.toString()).emit('live_db_update');
    }

    // Reject all other pending invitations for this user
    await GroupInvitation.updateMany(
      { receiverId: req.user.id, status: 'pending' },
      { status: 'rejected' }
    );
    await broadcastLiveUpdate(group._id, req.user.id);

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

    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isGroupAdmin = group.admins.includes(req.user.id) || group.creatorId.toString() === req.user.id;
    if (!isGroupAdmin) return res.status(403).json({ message: "Only group admins can add members." });

    const memberInGroup = await Group.findOne({ members: memberId });
    if (memberInGroup) return res.status(400).json({ message: "This user is already in a study group." });

    group.members.push(memberId);
    await group.save();

    // delete any pending invitations for this user
    await GroupInvitation.deleteMany({ receiverId: memberId, status: 'pending' });
    await broadcastLiveUpdate(group._id, req.user.id);
    io.to(memberId.toString()).emit('live_db_update');

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

    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group not found" });
    const isGroupAdmin = group.admins.includes(req.user.id) || group.creatorId.toString() === req.user.id;
    if (!isGroupAdmin) return res.status(403).json({ message: "Only group admins can remove members." });

    if (memberId === req.user.id) return res.status(400).json({ message: "Cannot remove yourself this way. Use Disband Workspace." });

    group.members = group.members.filter(m => m.toString() !== memberId);
    await group.save();

    // Clean up member-specific states in tasks
    await Task.updateMany(
      { groupId: group._id },
      { $pull: { deletedByUsers: memberId, memberStatuses: { userId: memberId } } }
    );
    await broadcastLiveUpdate(group._id, req.user.id);
    
    // Notify removed member
    const member = await User.findById(memberId);
    if (member) {
      await createAcademicNotification(memberId, 'group', `Removed from Group 🚪`, `You have been removed from "${group.name}".`);
      if (typeof sendPush === 'function') sendPush(member, `Removed from Group 🚪`, `You have been removed from "${group.name}".`);
    }

    io.to(memberId.toString()).emit('live_db_update');

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

    const modelsToMeasure = [
      { model: Task, field: 'userId' },
      { model: Note, field: 'user' },
      { model: Keynote, field: 'userId' },
      { model: Transaction, field: 'userId' },
      { model: Habit, field: 'userId' },
      { model: Timetable, field: 'userId' },
      { model: Grade, field: 'userId' }
    ];

    const usersWithStorage = await Promise.all(users.map(async (user) => {
      let storageBytes = 15360; // base footprint

      for (const { model, field } of modelsToMeasure) {
        try {
          const result = await model.aggregate([
            { $match: { [field]: user._id } },
            { $group: { _id: null, size: { $sum: { $bsonSize: "$$ROOT" } } } }
          ]);
          if (result && result.length > 0) storageBytes += result[0].size;
        } catch (e) {
          // Fallback if $bsonSize fails
        }
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        portalProfilePic: user.portalProfilePic,
        originalPortalProfilePic: user.originalPortalProfilePic,
        customProfilePic: user.customProfilePic,
        isAdmin: user.isAdmin,
        isBlocked: user.isBlocked || false,
        isLeaderboardEnabled: user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ? true
          : user.isAdmin
            ? (user.isLeaderboardEnabled !== false)
            : (user.isLeaderboardEnabled === true),
        isPortalConnected: user.isPortalConnected,
        portalId: user.portalId,
        lastSyncAt: user.lastSyncAt,
        ucpCookie: user.ucpCookie ? true : false,
        createdAt: user.createdAt,
        storageUsed: storageBytes
      };
    }));

    res.json(usersWithStorage);
  } catch (error) {
    console.error("Admin Fetch Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
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

app.put('/api/admin/users/leaderboard-toggle-all', auth, adminAuth, async (req, res) => {
  try {
    const { enable } = req.body;
    const requestingUser = await User.findById(req.user.id);
    const isReqSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Bulk toggle only affects regular students (non-admins)
    await User.updateMany({ isAdmin: { $ne: true } }, { isLeaderboardEnabled: enable === true });
    io.emit('leaderboard_toggle_all', { isLeaderboardEnabled: enable === true });
    res.json({ success: true, message: `Leaderboard access toggled for all students to ${enable === true}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/users/:id/leaderboard-toggle', auth, adminAuth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    const isReqSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const isTargetSuperAdmin = targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (isTargetSuperAdmin) {
      return res.status(400).json({ message: "Super Admin leaderboard access cannot be modified." });
    }

    if (targetUser.isAdmin && !isReqSuperAdmin) {
      return res.status(403).json({ message: "Only Super Admin can change Admin leaderboard access." });
    }

    // Toggle logic based on default rules
    const currentVal = targetUser.isAdmin
      ? (targetUser.isLeaderboardEnabled !== false) // default true for Admins
      : (targetUser.isLeaderboardEnabled === true); // default false for students

    targetUser.isLeaderboardEnabled = !currentVal;
    await targetUser.save();

    io.to(targetUser._id.toString()).emit('leaderboard_toggle', { isLeaderboardEnabled: targetUser.isLeaderboardEnabled });
    res.json({ success: true, isLeaderboardEnabled: targetUser.isLeaderboardEnabled });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/debts', auth, async (req, res) => { try { res.json(await Debt.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/debts', auth, async (req, res) => { try { const d = await new Debt({ ...req.body, userId: req.user.id }).save(); await broadcastLiveUpdate(null, req.user.id); res.json(d); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/debts/:id/status', auth, async (req, res) => { try { const d = await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { status: req.body.status }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(d); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/debts/:id/delete', auth, async (req, res) => { try { const d = await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(d); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/debts/:id/restore', auth, async (req, res) => { try { const d = await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(d); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/debts/:id', auth, async (req, res) => { try { await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); await broadcastLiveUpdate(null, req.user.id); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });
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
    await broadcastLiveUpdate(null, req.user.id);
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
    
    if (newNote.groupId) {
      await createGroupNotification(newNote.groupId, req.user.id, 'note', 'New Group Note', `A new note "${newNote.title}" was shared in the group.`);
    }

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
        
        if (note.groupId === null) {
          await createGroupNotification(userGroup._id, req.user.id, 'note', 'Note Shared', `A note "${note.title}" was made public to the group.`);
        }
        
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

// === ADMIN: Block / Unblock a user ===
app.put('/api/admin/users/:id/block', auth, adminAuth, async (req, res) => {
  try {
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
    const requestingUser = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Super Admin cannot be blocked.' });
    }
    // Only super admin can block other admins
    if (targetUser.isAdmin && requestingUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Only Super Admin can block other admins.' });
    }
    targetUser.isBlocked = !targetUser.isBlocked;
    await targetUser.save();
    if (targetUser.isBlocked) {
      io.to(targetUser._id.toString()).emit('account_blocked');
    }
    res.json({ success: true, isBlocked: targetUser.isBlocked });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// === ADMIN: Validate UCP session for a user ===
app.get('/api/admin/validate-session/:userId', auth, adminAuth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (!targetUser.ucpCookie) return res.json({ isAlive: false, reason: 'No cookie stored' });

    const sinceMs = targetUser.lastSyncAt ? (Date.now() - new Date(targetUser.lastSyncAt).getTime()) : null;

    try {
      const testRes = await fetch('https://horizon.ucp.edu.pk/student/dashboard', {
        method: 'GET',
        headers: {
          'Cookie': targetUser.ucpCookie,
          'User-Agent': 'Mozilla/5.0'
        },
        signal: AbortSignal.timeout(8000)
      });
      const text = await testRes.text();
      const isAlive = testRes.ok && 
                      !testRes.url.toLowerCase().includes('login') && 
                      !text.includes('name="password"') &&
                      !text.includes('placeholder="Password"');
      res.json({ isAlive, sinceMs, lastSyncAt: targetUser.lastSyncAt });
    } catch (fetchErr) {
      res.json({ isAlive: false, reason: 'Network error', sinceMs, lastSyncAt: targetUser.lastSyncAt });
    }
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// === ADMIN: Broadcast push notification ===
app.post('/api/admin/push-notification', auth, adminAuth, async (req, res) => {
  try {
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
    const { title, message, userIds } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'Title and message are required.' });

    let targetUsers;
    let targetType = 'all';

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds }, pushTokens: { $exists: true, $not: { $size: 0 } } });
      targetType = 'specific';
    } else {
      targetUsers = await User.find({ pushTokens: { $exists: true, $not: { $size: 0 } } });
    }

    const messages = [];
    for (const user of targetUsers) {
      const tokens = user.pushTokens.filter(t => Expo.isExpoPushToken(t));
      for (const token of tokens) {
        messages.push({
          to: token,
          sound: 'default',
          title,
          body: message,
          data: { type: 'admin_broadcast' }
        });
      }
    }

    let deliveredCount = 0;
    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const receipts = await expo.sendPushNotificationsAsync(chunk);
          deliveredCount += receipts.filter(r => r.status === 'ok').length;
        } catch (e) { console.error('[PUSH BROADCAST ERROR]', e.message); }
      }
    }

    // Save user-facing in-app Notification records in bulk & emit WebSocket pings
    const notificationsToSave = targetUsers.map(u => ({
      userId: u._id,
      type: 'broadcast',
      title,
      message,
      isRead: false
    }));

    if (notificationsToSave.length > 0) {
      await Notification.insertMany(notificationsToSave);
      for (const u of targetUsers) {
        io.to(u._id.toString()).emit('live_db_update');
      }
    }

    const requestingUser = await User.findById(req.user.id);
    const record = new AdminNotification({
      title,
      message,
      sentBy: req.user.id,
      sentByName: requestingUser?.name || 'Admin',
      targetType,
      targetUserIds: targetType === 'specific' ? userIds : [],
      targetCount: targetUsers.length,
      deliveredCount
    });
    await record.save();

    res.json({ success: true, deliveredCount, targetCount: targetUsers.length, recordId: record._id });
  } catch (error) {
    console.error('[PUSH BROADCAST ERROR]', error);
    res.status(500).json({ message: error.message });
  }
});

// === ADMIN: Get broadcast history ===
app.get('/api/admin/notifications', auth, adminAuth, async (req, res) => {
  try {
    const records = await AdminNotification.find().sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// === SUPER ADMIN ONLY: Delete a broadcast record ===
app.delete('/api/admin/notifications/:id', auth, adminAuth, async (req, res) => {
  try {
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
    const requestingUser = await User.findById(req.user.id);
    if (requestingUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Only Super Admin can delete broadcast records.' });
    }
    await AdminNotification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
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
    if (user.isBlocked) return res.status(503).json({ message: 'Network Error: Timeout communicating with identity provider.' });
    res.json({ token: jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET, { expiresIn: '30d' }), user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isPortalConnected: user.isPortalConnected } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => { try { res.json(await User.findById(req.user.id).select('-password')); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.post('/api/auth/check-admin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    res.json({ isAdmin: !!user?.isAdmin });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

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

    if (user && user.isBlocked) {
      return res.status(503).json({ error: 'Network Error: Timeout communicating with identity provider.' });
    }

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
        // profilePic is now strictly for the custom uploaded picture
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
        originalPortalProfilePic: finalProfilePicUrl
        // profilePic is strictly left empty so it doesn't show to community
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


app.put('/api/user/privacy', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.showProfilePicToCommunity = req.body.showProfilePicToCommunity;
    
    if (user.showProfilePicToCommunity === false && !user.customProfilePic) {
      user.profilePic = null; // Hide the portal pic
    } else if (user.showProfilePicToCommunity === true && !user.customProfilePic && user.portalProfilePic) {
      user.profilePic = user.portalProfilePic; // Restore it
    }
    
    await user.save();
    const freshUser = await User.findById(req.user.id).select('-password');
    res.json(freshUser);
  } catch (error) {
    res.status(500).json({ message: "Error" });
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
    const removeToken = req.body.removeToken;

    if (token) {
      // 1. Remove this token from any OTHER users' pushTokens lists to prevent cross-user leakage
      await User.updateMany(
        { _id: { $ne: user._id }, pushTokens: token },
        { $pull: { pushTokens: token } }
      );

      // 2. Add it to the current user's pushTokens list (if not already there)
      if (!user.pushTokens) user.pushTokens = [];
      if (!user.pushTokens.includes(token)) {
        user.pushTokens.push(token);
        await user.save();
      }
    } else if (token === null || removeToken) {
      const targetToken = removeToken || (user.pushTokens && user.pushTokens[0]);
      if (targetToken && user.pushTokens) {
        user.pushTokens = user.pushTokens.filter(t => t !== targetToken);
        await user.save();
      }
    }
    res.json({ success: true, message: "Push token updated successfully" });
  } catch (error) { res.status(500).json({ message: "Failed to update token" }); }
});

app.put('/api/user/preferences', auth, async (req, res) => { try { await User.findByIdAndUpdate(req.user.id, { prayerNotifs: req.body.prayerNotifs }); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

// Course visibility toggle
app.put('/api/user/course-preferences', auth, async (req, res) => {
  try {
    const { courseName, isVisible } = req.body;
    if (!courseName) return res.status(400).json({ message: "Course name is required" });
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.coursePreferences) {
      user.coursePreferences = new Map();
    }
    user.coursePreferences.set(courseName, isVisible);
    await user.save();
    
    res.json({ success: true, coursePreferences: user.coursePreferences });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

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

app.get('/api/timetable', auth, async (req, res) => { try { const now = new Date(); res.json((await Timetable.find({ userId: req.user.id, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] })).map(i => ({ ...i.toObject(), id: i._id }))); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/student-stats', auth, async (req, res) => { try { res.json(await StudentStats.findOne({ userId: req.user.id }) || { cgpa: "0.00", credits: "0", inprogressCr: "0" }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/grades', auth, async (req, res) => { try { res.json(await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/results-history', auth, async (req, res) => { try { res.json(await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/sync-diagnostics/users', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    const connectedUsers = await User.find({})
      .select('_id name email portalId isPortalConnected')
      .sort({ name: 1 });
    res.json(connectedUsers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching connected users" });
  }
});

app.get('/api/sync-diagnostics', auth, async (req, res) => {
  try {
    let targetUserId = req.user.id;
    
    if (req.query.targetUserId) {
      const requester = await User.findById(req.user.id);
      if (requester.isAdmin) {
        targetUserId = req.query.targetUserId;
      }
    }

    const [attendance, announcements, submissions, grades, timetable, syncLogs, courses, studentStats, userInfo] = await Promise.all([
      Attendance.find({ userId: targetUserId }),
      Announcement.find({ userId: targetUserId }),
      Submission.find({ userId: targetUserId }),
      Grade.find({ userId: targetUserId }),
      Timetable.find({ userId: targetUserId }),
      SyncLog.find({ userId: targetUserId }).sort({ startTime: -1 }).limit(20),
      Course.find({ userId: targetUserId }),
      StudentStats.findOne({ userId: targetUserId }),
      User.findById(targetUserId).select('-password')
    ]);
    res.json({
      attendance,
      announcements,
      submissions,
      grades,
      timetable,
      syncLogs,
      courses,
      studentStats,
      user: userInfo
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    res.status(500).json({ message: "Error fetching diagnostic data" });
  }
});

app.get('/api/focus-sessions', auth, async (req, res) => { try { res.json(await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/focus-sessions', auth, async (req, res) => { try { res.json(await new FocusSession({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });

// ==========================================
// 🚀 INSTANT WEBSOCKET BROADCAST HELPER
// ==========================================
async function broadcastLiveUpdate(groupId, activeUserId) {
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
}

// ==========================================
// 🔔 NOTIFICATIONS API
// ==========================================
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    notification.isRead = true;
    await notification.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Notification not found" });
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

const createGroupNotification = async (groupId, senderId, type, title, message, link) => {
  if (!groupId) return;
  try {
    const group = await Group.findById(groupId);
    if (!group) return;
    const sender = await User.findById(senderId);
    
    const memberIds = group.members.filter(m => m.toString() !== senderId.toString());
    const notifications = memberIds.map(memberId => ({
      userId: memberId,
      type,
      title,
      message,
      sender: sender ? { name: sender.name, profilePic: sender.profilePic, id: sender._id } : {},
      link
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      
      // 🚀 SEND PUSH NOTIFICATIONS TO ALL OTHER MEMBERS
      const usersToPush = await User.find({ _id: { $in: memberIds } });
      for (const u of usersToPush) {
        await sendPush(u, title, message, { link, type, senderName: sender?.name }, "smart-alert", "default");
      }
    }
  } catch (error) {
    console.error("Failed to create notifications", error);
  }
};

const createAcademicNotification = async (userId, type, title, message, link = '') => {
  if (!userId) return;
  try {
    const notification = new Notification({
      userId,
      type, // 'marks', 'attendance', 'submission', 'announcement'
      title,
      message,
      link,
      isRead: false
    });
    await notification.save();
    
    // Trigger WebSocket so Bell icon updates instantly
    io.to(userId.toString()).emit('live_db_update');
  } catch (error) {
    console.error("Failed to create academic notification", error);
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
    
    if (task.groupId) {
      await createGroupNotification(task.groupId, req.user.id, 'task', 'New Group Task', `A new task "${task.title}" was added to the group.`);
    }
    
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
        await createGroupNotification(task.groupId, req.user.id, 'task', 'Task Shared', `A task "${task.title}" was made public to the group.`);
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
app.post('/api/transactions', auth, async (req, res) => { try { const t = await new Transaction({ ...req.body, userId: req.user.id }).save(); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/transactions/:id/delete', auth, async (req, res) => { try { const t = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (err) { res.status(500).json({ message: err.message }) } });
app.put('/api/transactions/:id/restore', auth, async (req, res) => { try { const t = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(t); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/transactions/:id', auth, async (req, res) => { try { await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); await broadcastLiveUpdate(null, req.user.id); res.json({ success: true }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/budgets', auth, async (req, res) => { try { res.json(await Budget.find({ userId: req.user.id })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/budgets', auth, async (req, res) => { try { const b = await Budget.findOneAndUpdate({ category: req.body.category, userId: req.user.id }, { limit: req.body.limit, userId: req.user.id }, { upsert: true, new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(b); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/habits/stats', auth, async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id, isDeleted: false });
    res.json({ total: habits.length });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.get('/api/habits', auth, async (req, res) => { try { res.json(await Habit.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/habits', auth, async (req, res) => { try { const h = await new Habit({ ...req.body, userId: req.user.id, startDate: new Date() }).save(); await broadcastLiveUpdate(null, req.user.id); res.json(h); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.put('/api/habits/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { ...req.body }, { new: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/journal', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.journal.push({ type: req.body.type, content: req.body.content, trigger: req.body.trigger, date: new Date() });
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/archive', auth, async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { archivedAt: new Date() }, { new: true });
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/habits/:id/delete', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Not found" });
    if (habit.name === 'Daily Namaz') return res.status(403).json({ message: "Cannot delete system habit." });
    habit.isDeleted = true;
    habit.deletedAt = new Date();
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (err) { res.status(500).json({ message: err.message }) }
});
app.put('/api/habits/:id/restore', auth, async (req, res) => { try { const h = await Habit.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true }); await broadcastLiveUpdate(null, req.user.id); res.json(h); } catch (err) { res.status(500).json({ message: err.message }) } });
app.delete('/api/habits/:id', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    if (!habit) return res.status(404).json({ message: "Not found" });
    if (habit.name === 'Daily Namaz') return res.status(403).json({ message: "Cannot delete system habit." });
    await Habit.findByIdAndDelete(req.params.id);
    await broadcastLiveUpdate(null, req.user.id);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/reset', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.startDate = new Date();
    habit.cheatDays = [];
    habit.totalRelapses = (habit.totalRelapses || 0) + 1;
    habit.journal.push({ type: 'relapse', content: req.body.note || 'Relapsed', trigger: req.body.trigger || 'Unknown', date: new Date() });
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.put('/api/habits/:id/cheat', auth, async (req, res) => { try { const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id }); habit.cheatDays.push(new Date()); await habit.save(); await broadcastLiveUpdate(null, req.user.id); res.json(habit); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.put('/api/habits/:id/checkin', auth, async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user.id });
    habit.checkIns.push(new Date());
    
    // Calculate consecutive streak
    const uniqueDays = [...new Set(habit.checkIns.map(d => new Date(d).setHours(0, 0, 0, 0)))].sort((a,b) => b - a);
    let streak = 0;
    let currentDate = new Date().setHours(0,0,0,0);
    if (uniqueDays[0] !== currentDate) currentDate -= 86400000;
    for (const day of uniqueDays) {
      if (day === currentDate) { streak++; currentDate -= 86400000; }
      else if (day < currentDate) break;
    }
    
    if (streak > habit.longestStreak) habit.longestStreak = streak;
    
    // Check milestones
    const MILESTONES = [7, 21, 30, 60, 90, 100, 365];
    for (let m of MILESTONES) {
      if (streak >= m && !habit.milestones.find(mil => mil.days === m)) {
        habit.milestones.push({ days: m, achievedAt: new Date(), celebrated: false });
        habit.journal.push({ type: 'milestone', content: `Reached ${m} days streak!`, date: new Date() });
      }
    }
    
    await habit.save();
    await broadcastLiveUpdate(null, req.user.id);
    res.json(habit);
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

    // Notes are in bin if creator and isDeleted,
    // OR if it's a shared group note and the member explicitly trashed it on their side.
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
    const senderUser = await User.findById(req.user.id);

    for (let targetId of targetUserIds) {
      const targetUser = await User.findById(targetId);
      
      const notesCount = notesToShare.length;
      const notesStr = notesCount === 1 ? `"${notesToShare[0].title}"` : `${notesCount} notes`;
      const title = "Note Shared 📝";
      const message = `${senderUser?.name || 'A user'} shared ${notesStr} with you.`;

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
      }

      if (targetUser && notesCount > 0) {
        // Send push notification
        if (typeof sendPush === 'function') {
          await sendPush(targetUser, title, message, { type: 'note' }, 'smart-alert', 'default');
        }
        
        // Save in-app Notification log
        const notification = new Notification({
          userId: targetId,
          type: 'note',
          title,
          message,
          sender: senderUser ? { name: senderUser.name, profilePic: senderUser.profilePic, id: senderUser._id } : {},
          isRead: false
        });
        await notification.save();
      }

      io.to(targetId.toString()).emit('live_db_update');
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
// Notes routes defined under the primary notes section at line 1766

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

// Notes delete route defined under the primary notes section at line 1881

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
// 🏆 RELATIVE GRADING LEADERBOARD API (EXTENSION)
// ==========================================
app.get('/api/extension/leaderboard/:courseCode', async (req, res) => {
  try {
    const courseCode = req.params.courseCode;
    const section = req.query.section;
    const courseName = req.query.courseName;

    const email = req.query.email;
    if (email) {
      const requestingUser = await User.findOne({ email: { $regex: '^' + email.trim() + '$', $options: 'i' } });
      if (requestingUser) {
        const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled !== true) {
          return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
        }
      } else {
        return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
      }
    } else {
      return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
    }

    let query = {};
    if (courseName && section) {
      query = {
        name: { $regex: '^' + courseName.trim() + '$', $options: 'i' },
        section: { $regex: '^' + section.trim() + '$', $options: 'i' }
      };
    } else {
      if (courseCode.includes('-')) {
        // If it looks like a full course code, do an exact case-insensitive match
        query = { code: { $regex: '^' + courseCode.trim() + '$', $options: 'i' } };
      } else {
        // It's a short course code, use prefix match
        query = { code: { $regex: '^' + courseCode.trim(), $options: 'i' } };
        if (section) {
          query.section = { $regex: '^' + section.trim() + '$', $options: 'i' };
        }
      }
    }

    // Find all courses matching this course code prefix (and section if provided)
    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic');
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    let leaderboard = matchingCourses.map(course => {
      // Find matching grade entry for this user
      const userGrade = grades.find(g =>
        g.userId.toString() === course.userId?._id.toString() &&
        (
          (course.code && g.courseUrl && g.courseUrl.toLowerCase().includes(course.code.toLowerCase())) ||
          (course.code && g.courseName && g.courseName.toLowerCase().includes(course.code.toLowerCase())) ||
          g.courseName === course.name || 
          (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase()))
        )
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
        pic: course.userId?.customProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(course.userId?.name || 'Student')}&backgroundColor=4f46e5`
      };
    });

    leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
    leaderboard.sort((a, b) => b.score - a.score);

    // Add rank and relative grading properties
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
    console.error('Leaderboard generation error:', error);
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});

// ==========================================
// 🏆 RELATIVE GRADING & LEADERBOARD API (ADMIN & SUPER ADMIN ONLY)
// ==========================================
app.get('/api/course-leaderboard/:courseId', auth, async (req, res) => {
  try {
    // 🔒 Strict security guard: Reject request if requester is not an administrator
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) return res.status(404).json({ message: "User not found" });

    const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Block non-admins (students) if access is disabled
    if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled !== true) {
      return res.status(403).json({ message: "Leaderboard has been disabled for your account by an administrator." });
    }

    const gradeName = req.query.gradeName; // NEW: Precise identifier 

    const myCourse = await Course.findById(req.params.courseId);
    if (!myCourse) return res.status(404).json({ message: "Course not found" });

    let query = {};
    if (myCourse.name && myCourse.section) {
      query = {
        name: { $regex: '^' + myCourse.name.trim() + '$', $options: 'i' },
        section: { $regex: '^' + myCourse.section.trim() + '$', $options: 'i' }
      };
    } else if (myCourse.code) {
      query.code = myCourse.code;
      if (myCourse.section) query.section = myCourse.section;
    } else {
      query.name = myCourse.name;
      if (myCourse.section) query.section = myCourse.section;
    }

    // Aggregates all registered students in this specific section block
    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic'); 
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    let leaderboard = matchingCourses.map(course => {
      const userGrade = grades.find(g => {
        if (!g.userId || !course.userId?._id) return false;
        if (g.userId.toString() !== course.userId._id.toString()) return false;
        
        // Exact match injection forces lab logic if passed
        if (gradeName) {
          return g.courseName === gradeName;
        }

        // Web logic fallback mapping
        return (
          (course.code && g.courseUrl && g.courseUrl.toLowerCase().includes(course.code.toLowerCase())) ||
          (course.code && g.courseName && g.courseName.toLowerCase().includes(course.code.toLowerCase())) ||
          g.courseName === course.name || 
          (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase()))
        );
      });

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
// 📅 HABITS PUSH NOTIFICATION CRON
// ==========================================
cron.schedule('0 20 * * *', async () => {
  try {
    const habits = await Habit.find({ isDeleted: false }).populate('userId');
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    
    for (const habit of habits) {
      if (!habit.userId || !habit.userId.expoPushToken) continue;
      
      if (habit.scheduleDays && !habit.scheduleDays.includes(todayDayOfWeek)) continue;
      
      if (habit.type === 'good') {
        const todayStr = new Date().setHours(0,0,0,0);
        const checksToday = habit.checkIns.filter(d => new Date(d).setHours(0,0,0,0) === todayStr).length;
        if (checksToday < habit.targetPerDay) {
          const title = "Habit Reminder 🎯";
          const message = `Don't forget to complete your habit: ${habit.name}!`;
          if (typeof sendPush === 'function') {
            await sendPush(habit.userId, title, message, { type: 'habit_reminder' }, 'smart-alert', 'default');
          }
          await createAcademicNotification(habit.userId._id, 'system', title, message);
        }
      }
    }
  } catch (error) { console.error("[CRON] Habit Reminder Error:", error); }
}, { timezone: "Asia/Karachi" });

// ==========================================
// 🔔 THE 1-MINUTE CRON ENGINES 
// ==========================================

cron.schedule('* * * * *', async () => {

  try {
    const allSubmissions = await Submission.find({
      tasks: { $exists: true, $not: { $size: 0 } },
      "tasks.status": { $ne: "Submitted" }
    }).populate({
      path: 'userId',
      match: { isPortalConnected: true }
    });
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
          await createAcademicNotification(sub.userId, 'submission', `Deadline Alert: ${sub.courseName}`, `${alertMsg} for "${task.title}".`, task.submissionUrl);
        }
      }
    }
  } catch (error) { console.error(`[DEADLINE ENGINE] Error:`, error.message); }
});

// ==========================================
// 🗑️ RECYCLE BIN 30-DAY AUTO-PURGE CRON
// ==========================================
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] 🗑️ Initiating 30-Day Recycle Bin auto-purge...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = { isDeleted: true, deletedAt: { $lt: thirtyDaysAgo } };

    const deletedTasks = await Task.deleteMany(query);
    const deletedNotes = await Note.deleteMany(query);
    const deletedTransactions = await Transaction.deleteMany(query);
    const deletedHabits = await Habit.deleteMany(query);
    const deletedKeynotes = await Keynote.deleteMany(query);
    const deletedDebts = await Debt.deleteMany(query);

    console.log(`[CRON] 🗑️ Recycle Bin purge completed:
      - Tasks: ${deletedTasks.deletedCount}
      - Notes: ${deletedNotes.deletedCount}
      - Transactions: ${deletedTransactions.deletedCount}
      - Habits: ${deletedHabits.deletedCount}
      - Keynotes: ${deletedKeynotes.deletedCount}
      - Debts: ${deletedDebts.deletedCount}`);
  } catch (err) {
    console.error("[CRON] Recycle Bin purge error:", err.message);
  }
}, { timezone: "Asia/Karachi" });

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

// Removed all sync crons

// ==========================================
// 🚀 TIERED BACKGROUND SCRAPER ENGINES (CRON)
// ==========================================
const { scrapeServerSide } = require('./services/scraperEngine');

// Helper to run background sync for a specific mode
const runTieredSync = async (mode, logName) => {
  console.log(`[CRON] 🌐 Starting ${logName} Scrape Engine...`);
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      ucpCookie: { $exists: true, $ne: null }
    });

    console.log(`[CRON] Found ${activeUsers.length} users for ${logName}.`);

    for (let user of activeUsers) {
      // Skip if last synced less than 3 minutes ago
      if (user.lastSyncAt && (Date.now() - new Date(user.lastSyncAt).getTime()) < 3 * 60 * 1000) {
        console.log(`[CRON] ⏭️ Skipping ${user.email} - synced ${Math.round((Date.now() - new Date(user.lastSyncAt).getTime()) / 1000)}s ago.`);
        continue;
      }

      const syncLog = new SyncLog({
        userId: user._id,
        portalId: user.portalId,
        mode: mode,
        status: 'PENDING',
        startTime: new Date()
      });
      await syncLog.save();
      const startTime = Date.now();

      try {
        const scrapedPayload = await scrapeServerSide(user.ucpCookie, mode, user.portalId);
        scrapedPayload.syncLogId = syncLog._id.toString();

        // Generate an internal token to call our own endpoint
        const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        });
        
        await SyncLog.findByIdAndUpdate(syncLog._id, { durationMs: Date.now() - startTime });
      } catch (err) {
        console.error(`[CRON] Failed ${logName} for ${user.email}:`, err.message);
        
        syncLog.status = 'FAILED';
        syncLog.error = err.message;
        syncLog.endTime = new Date();
        syncLog.durationMs = Date.now() - startTime;
        await syncLog.save();
        if (err.message === "Session Expired") {
          await User.findByIdAndUpdate(user._id, { isPortalConnected: false });
          const title = "UCP Session Expired ⚠️";
          const message = "Your background sync failed because your session expired. Tap here to log in again.";
          await sendPush(
            user,
            title,
            message,
            { type: "session_expired", action: "OPEN_APP" },
            "smart-alert",
            "default"
          );
          await createAcademicNotification(user._id, 'system', title, message);
        }
      }

      // Gentle inter-user delay to avoid overwhelming UCP servers
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (error) {
    console.error(`[CRON] ${logName} Engine Error:`, error.message);
  }
};

// 1. Submissions + Attendance + Grades - Every 20 minutes during university hours (8 AM - 6 PM PKT)
cron.schedule('*/20 8-18 * * *', () => runTieredSync('HIGH', 'Submissions/Attendance/Grades (20m)'), { timezone: "Asia/Karachi" });

// 2. Full Sync (History/Timetable/Announcements) - Every 6 hours
cron.schedule('0 */6 * * *', () => runTieredSync('FULL', 'Full Sync + Announcements (6h)'), { timezone: "Asia/Karachi" });

// 3. 🗂️ Nightly Material Sync — 2:00 AM PKT
// Fallback: re-fetches material links for all users and processes any newly added files
cron.schedule('0 2 * * *', () => runNightlyMaterialSync(User, Course), { timezone: "Asia/Karachi" });

// ==========================================
// 🗂️ COURSE MATERIAL & COURSE VAULT APIS (Fully Automated)
// ==========================================

// 1. Get all scraped course materials for a section (returns files + signed download URLs)
app.get('/api/course-material/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const materials = await CourseMaterial.find({ courseCode, sectionCode })
      .sort({ isArchiveExtracted: 1, fileName: 1 })
      .lean();

    // Generate fresh signed URLs for each file
    const withUrls = await Promise.all(materials.map(async (m) => {
      const signedUrl = m.b2Key ? await getSignedDownloadUrl(m.b2Key, 3600) : null;
      return { ...m, downloadUrl: signedUrl };
    }));

    // Group extracted files under their parent archives
    const grouped = [];
    const archives = {};
    for (const m of withUrls) {
      if (m.isArchiveExtracted && m.parentArchive) {
        if (!archives[m.parentArchive]) archives[m.parentArchive] = [];
        archives[m.parentArchive].push(m);
      } else {
        if (m.fileType === 'zip' && archives[m.fileName]) {
          m.contents = archives[m.fileName];
        }
        grouped.push(m);
      }
    }
    // Attach orphan extracted files to their zip parent
    for (const m of grouped) {
      if ((m.fileType === 'zip' || m.fileType === 'rar') && archives[m.fileName]) {
        m.contents = archives[m.fileName];
      }
    }

    res.json({ files: grouped, total: withUrls.length });
  } catch (err) {
    console.error('[API] course-material fetch error:', err.message);
    res.status(500).json({ message: 'Failed to fetch course materials.' });
  }
});

// 2. Get scraping status for a section
app.get('/api/course-material/status/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const count = await CourseMaterial.countDocuments({ courseCode, sectionCode });
    const pending = await MaterialLink.countDocuments({
      userId: req.user.id,
      courseCode: { $regex: courseCode, $options: 'i' },
      processed: false
    });
    const latest = await CourseMaterial.findOne({ courseCode, sectionCode })
      .sort({ createdAt: -1 }).lean();

    res.json({
      fileCount: count,
      hasPending: pending > 0,
      lastSyncedAt: latest?.createdAt || null,
      isProcessing: pending > 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status.' });
  }
});

// 3. Download multiple files as a ZIP (server zips them from B2)
app.post('/api/course-material/download-zip', auth, async (req, res) => {
  try {
    const { fileIds, courseName } = req.body;
    if (!fileIds || fileIds.length === 0) return res.status(400).json({ message: 'No files selected.' });
    if (fileIds.length > 20) return res.status(400).json({ message: 'Max 20 files per download.' });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const materials = await CourseMaterial.find({ _id: { $in: fileIds } }).lean();

    for (const m of materials) {
      if (!m.b2Key) continue;
      try {
        // Get signed URL and fetch the file
        const signedUrl = await getSignedDownloadUrl(m.b2Key, 300);
        const response = await fetch(signedUrl);
        if (!response.ok) continue;
        const buf = Buffer.from(await response.arrayBuffer());
        zip.addFile(m.fileName || m.normalizedFileName, buf);
      } catch (_) {}
    }

    const zipBuffer = zip.toBuffer();
    const safeCourseName = (courseName || 'course-materials').replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeCourseName}_files.zip"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err) {
    console.error('[API] download-zip error:', err.message);
    res.status(500).json({ message: 'Failed to create zip.' });
  }
});

// 4. Get Course Vault files for a course, grouped by teacher
app.get('/api/course-vault/:courseCode', auth, async (req, res) => {
  try {
    const courseCode = decodeURIComponent(req.params.courseCode).trim();
    const files = await CourseVaultFile.find({ courseCode }).sort({ createdAt: -1 }).lean();

    // Generate signed URLs for vault files (view-only, 2 hour expiry for PDF readers)
    const withUrls = await Promise.all(files.map(async (f) => {
      const viewUrl = f.b2Key ? await getSignedDownloadUrl(f.b2Key, 7200) : null;
      return { ...f, viewUrl };
    }));

    // Group by teacher
    const grouped = {};
    for (const f of withUrls) {
      const teacher = f.teacherName || 'Unknown Teacher';
      if (!grouped[teacher]) grouped[teacher] = [];
      grouped[teacher].push(f);
    }

    const response = Object.keys(grouped).map(teacher => ({
      teacherName: teacher,
      fileCount: grouped[teacher].length,
      files: grouped[teacher]
    }));

    res.json(response);
  } catch (err) {
    console.error('[API] course-vault error:', err.message);
    res.status(500).json({ message: 'Failed to fetch vault.' });
  }
});

// 5. Get a fresh signed URL for a single vault file (for inline PDF viewer refresh)
app.get('/api/course-vault/view/:id', auth, async (req, res) => {
  try {
    const vaultFile = await CourseVaultFile.findById(req.params.id).lean();
    if (!vaultFile || !vaultFile.b2Key) return res.status(404).json({ message: 'Not found.' });
    const viewUrl = await getSignedDownloadUrl(vaultFile.b2Key, 7200);
    res.json({ viewUrl, fileName: vaultFile.fileName, fileType: vaultFile.fileType });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate view URL.' });
  }
});

// 6. (Old manual upload endpoint — kept but hidden from public; only internal use)
app.post('/api/course-material/upload', auth, async (req, res) => {
  return res.status(403).json({ message: 'Manual uploads are disabled. Course materials are synced automatically from Horizon Portal.' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`));

