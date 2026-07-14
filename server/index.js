require('dotenv').config();


process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const mongoose = require('mongoose');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { JWT_SECRET, JWT_ALG } = require('./config/secrets');
const auth = require('./Middleware/auth');


const { 
  detectAttendanceChanges, 
  detectAnnouncementChanges, 
  detectSubmissionChanges, 
  detectGradeChanges 
} = require('./services/changeDetector');


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const { encrypt, decrypt } = require('./utils/encryption');
const { parseUCPDate } = require('./utils/dateParser');
const { escapeRegex } = require('./utils/regexEscaper');
const crypto = require('crypto');
const { Resend } = require('resend');


const http = require('http');
const { Server } = require('socket.io');


const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const axios = require('axios');


const activeSyncs = new Set();


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
const Exam = require('./models/Exam'); 
const Group = require('./models/Group');
const GroupInvitation = require('./models/GroupInvitation');
const SyncLog = require('./models/SyncLog');
const PendingSync = require('./models/PendingSync');
const { spawn } = require('child_process');


const CourseMaterial = require('./models/CourseMaterial');
const CourseVaultFile = require('./models/CourseVaultFile');
const CourseVaultBucket = require('./models/CourseVaultBucket');
const MaterialLink   = require('./models/MaterialLink');
const DeviceSession = require('./models/DeviceSession');
const ScraperHealth = require('./models/ScraperHealth');
const { getAbsoluteGrade, getSmartCurveGrade, calculateTrueScore, calculateClassAverageScore, getProjectedGradeForCourse, computeProjection } = require('./services/grading');
const { registerDeviceSession } = require('./utils/sessionHelper');
const { convertToPdf } = require('./utils/documentConverter');

const SEASON_ORDER = { spring: 0, summer: 1, fall: 2 };

function sortSemestersJS(semesters, direction = 'desc') {
  return [...semesters].sort((a, b) => {
    if (!a.term || !b.term) return 0;
    const [aSeason, aYear] = a.term.toLowerCase().split(/\s+/);
    const [bSeason, bYear] = b.term.toLowerCase().split(/\s+/);
    const yearDiff = (parseInt(bYear) || 0) - (parseInt(aYear) || 0); // newest year first
    if (yearDiff !== 0) return direction === 'desc' ? yearDiff : -yearDiff;
    const seasonDiff = (SEASON_ORDER[bSeason] ?? 0) - (SEASON_ORDER[aSeason] ?? 0);
    return direction === 'desc' ? seasonDiff : -seasonDiff;
  });
}



const { getSignedDownloadUrl, b2, B2_BUCKET, uploadToB2, getPresignedUploadUrl, configureBucketCors, downloadFileFromB2, getMimeType } = require('./utils/b2Client');
const { processUserMaterials, runNightlyMaterialSync } = require('./services/materialProcessor');
const { processUserSubmissions } = require('./services/submissionProcessor');



const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "l1f23bscs1329@ucp.edu.pk";
const resend = new Resend(process.env.RESEND_API_KEY);
let expo = new Expo();




let cachedPrayerTimes = null;
let lastFetchDate = null;

async function getLahorePrayerTimes(todayStr) {
  if (lastFetchDate !== todayStr || !cachedPrayerTimes) {
    try {
      const response = await axios.get('https://api.aladhan.com/v1/timingsByCity?city=Lahore&country=Pakistan&method=1', { timeout: 5000 });
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



const API_URL = process.env.NODE_ENV === 'production' ? 'https://api.myportalucp.online' : 'http://localhost:5000';




let uploadDir = process.env.UPLOAD_DIR || (process.env.NODE_ENV === 'production'
  ? '/var/www/student_portal/media/'
  : path.join(__dirname, 'media'));


try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Created media directory at: ${uploadDir}`);
  }
} catch (err) {
  console.error(`❌ Failed to create media directory at ${uploadDir}:`, err.message);
  uploadDir = path.join(__dirname, 'media');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}





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
  limits: { fileSize: 25 * 1024 * 1024 } 
});



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
      folder: 'myportal/avatars', 
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      public_id: `profile_${cleanIdentifier}_${Date.now()}`,
      transformation: [{ width: 500, height: 500, crop: 'limit' }] 
    };
  },
});


const profilePicUpload = multer({
  storage: cloudinaryProfileStorage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const generalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const upload = generalUpload;




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
  codeHash: { type: String, required: true }, // bcrypt hash of the 6-digit code — never store plaintext
  attempts: { type: Number, default: 0 },     // failed verification attempts (brute-force lockout)
  createdAt: { type: Date, default: Date.now, expires: 300 } // 5-min TTL
});
const OTP = mongoose.model('OTP', otpSchema);

const OTP_MAX_ATTEMPTS = 5;

// Generate a cryptographically-random 6-digit code, store only its hash, and
// return the plaintext so the caller can email it. Resetting createdAt renews
// the TTL on resend.
async function createOtp(email) {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  await OTP.findOneAndUpdate(
    { email },
    { codeHash, attempts: 0, createdAt: new Date() },
    { upsert: true, new: true }
  );
  return code;
}

// Verify a submitted code. Increments the attempt counter on failure and locks
// out after OTP_MAX_ATTEMPTS. Does NOT consume the code (callers that complete a
// flow should call consumeOtp on success).
async function verifyOtp(email, submitted) {
  const rec = await OTP.findOne({ email });
  if (!rec) return false;
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return false;
  const ok = await bcrypt.compare(String(submitted).trim(), rec.codeHash || '');
  if (!ok) {
    rec.attempts = (rec.attempts || 0) + 1;
    await rec.save();
    return false;
  }
  return true;
}

async function consumeOtp(email) {
  await OTP.deleteOne({ email });
}

const parseSemesterAndSectionFromCode = (fullCode) => {
  if (!fullCode) return { semester: '', section: '' };
  const parts = fullCode.trim().split('-');
  
  let section = '';
  if (parts.length > 1) {
    const candidate = parts[parts.length - 1].trim();
    const isValidSection = candidate && 
      !candidate.includes(' ') && 
      !candidate.toLowerCase().includes('credit') && 
      !candidate.toLowerCase().includes('hour') && 
      candidate.length <= 15 &&
      /^[a-zA-Z0-9-]+$/.test(candidate);
    if (isValidSection) {
      section = candidate;
    }
  }

  let semester = '';
  try {
    const { parseSemesterFromCourseCode } = require('./services/scraperEngine');
    semester = parseSemesterFromCourseCode(fullCode) || '';
  } catch (err) {
    console.error("Error parsing semester from code:", err.message);
  }

  return { semester, section };
};

/**
 * Normalize a semester/term string so that abbreviated 2-digit years are
 * expanded to 4-digit years for consistent comparison.
 * Examples:
 *   "Spring 26"   -> "Spring 2026"
 *   "Fall 25"     -> "Fall 2025"
 *   "Spring 2026" -> "Spring 2026"  (unchanged)
 */
const normalizeSemesterTerm = (term) => {
  if (!term) return '';
  // Match a season word followed by a 2-digit year (but NOT already 4-digit)
  return term.trim().replace(
    /^(Spring|Summer|Fall|Winter)\s+(\d{2})$/i,
    (_, season, yy) => `${season.charAt(0).toUpperCase()}${season.slice(1).toLowerCase()} 20${yy}`
  );
};

const app = express();
app.set('trust proxy', 1);

const getBaseUrl = (req) => {
  const host = req.get('host') || '';
  if (host.includes('myportalucp.online') || host.includes('render.com')) {
    return `https://${host}`;
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${host}`;
};


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // isOriginAllowed is defined later in this module but only invoked at
    // connection time, so the reference resolves correctly at runtime.
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
});


app.get('/ping', (req, res) => res.json({ status: "alive", environment: process.env.NODE_ENV, time: new Date() }));
app.get('/api/ping', (req, res) => res.json({ status: "alive", prefix: "api", time: new Date() }));

io.on('connection', (socket) => {
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`👤 User ${userId} joined their personal data room.`);
    }
  });
  socket.on('join_session', (signature) => {
    if (signature) {
      socket.join(signature);
      console.log(`🔑 Socket joined session room: ${signature.substring(0, 10)}...`);
    }
  });
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://192.168.0.103:8081',
  'http://10.14.100.54:8081',
  'https://to-do-web-01.onrender.com/api',
  'http://127.0.0.1:3001',
  'http://localhost:8081',
  'http://localhost:5000/',
  'https://myportalucp.online',
  'http://4.188.99.151',
  'https://horizon.ucp.edu.pk',
  'https://www.myportalucp.online',
  'chrome-extension://fgipkgekakeenpklgdgeibndjmmcgaof'
];

// Allow additional origins at deploy time without a code change (comma-separated).
const extraOrigins = (process.env.EXTRA_CORS_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);
const corsAllowList = new Set([
  ...allowedOrigins,
  'https://web.myportalucp.online',
  'https://api.myportalucp.online',
  ...extraOrigins,
]);

const isOriginAllowed = (origin) => {
  // No Origin header => native mobile app / server-to-server / curl. These are
  // not browser cross-site requests, so they are not a CORS threat.
  if (!origin) return true;
  if (corsAllowList.has(origin)) return true;
  // Any browser extension packaged for this project.
  if (origin.startsWith('chrome-extension://')) return true;
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-sync-token', 'x-chunk-index', 'x-total-chunks'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use('/media', express.static(uploadDir));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.query) mongoSanitize.sanitize(req.query);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300, 
  message: { message: "Too many authentication attempts, please try again later." }
});


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
        Group.find({ members: activeUserId }).lean().select('members').then(groups => {
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

// NOTE: `auth` is now the hardened middleware imported from ./Middleware/auth
// at the top of this file. It enforces active-session (revocation) and
// isBlocked checks in addition to verifying the JWT. The previous lightweight
// inline definition was removed because it silently bypassed those controls.

const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isAdmin').lean();
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access Denied: Admins Only" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};




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


app.get('/api/feedback/my', auth, async (req, res) => {
  try {
    const tickets = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Fetch User Tickets Error:", error);
    res.status(500).json({ message: "Server Error fetching tickets" });
  }
});


app.get('/api/admin/feedback', auth, adminAuth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic').sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
});


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


app.put('/api/admin/feedback/:id/deny-dispute', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'invalid' },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    
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


app.put('/api/admin/feedback/:id/reopen', auth, adminAuth, async (req, res) => {
  try {
    const ticket = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: 'open', adminResponse: null },
      { new: true }
    ).populate('userId', 'name email customProfilePic portalProfilePic originalPortalProfilePic profilePic pushTokens pushToken');

    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    
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
  limits: { fileSize: 250 * 1024 * 1024 } 
});


let cachedSettingsData = null;
let settingsCacheExpiry = 0;

function invalidateSettingsCache() {
  cachedSettingsData = null;
  settingsCacheExpiry = 0;
}


app.get('/api/public/settings', async (req, res) => {
  try {
    const now = Date.now();
    if (!cachedSettingsData || now > settingsCacheExpiry) {
      let webPortalLink = "https://web.myportalucp.online/";
      const linkSetting = await SystemSettings.findOne({ key: "web_portal_link" });
      if (linkSetting && linkSetting.value) {
        let val = linkSetting.value.trim();
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
          val = 'https://' + val;
        }
        webPortalLink = val;
      }

      let termsLink = "";
      const termsSetting = await SystemSettings.findOne({ key: "terms_link" });
      if (termsSetting) {
        termsLink = termsSetting.value;
      }

      let whatsappGroupLink = "https://chat.whatsapp.com/";
      const whatsappSetting = await SystemSettings.findOne({ key: "whatsapp_group_link" });
      if (whatsappSetting) {
        whatsappGroupLink = whatsappSetting.value;
      }

      let chromeExtensionLink = "https://chromewebstore.google.com/";
      const chromeSetting = await SystemSettings.findOne({ key: "chrome_extension_link" });
      if (chromeSetting) {
        chromeExtensionLink = chromeSetting.value;
      }

      let rawApkInfo = null;
      const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
      if (dbSetting && dbSetting.value && dbSetting.value.uploaded) {
        rawApkInfo = { ...dbSetting.value };
      } else {
        const apkPath = path.join(uploadDir, 'myportal.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          rawApkInfo = {
            uploaded: true,
            filename: 'myportal.apk',
            size: stat.size,
            uploadedAt: stat.mtime
          };
        }
      }

      cachedSettingsData = { webPortalLink, termsLink, whatsappGroupLink, chromeExtensionLink, rawApkInfo };
      settingsCacheExpiry = now + 60000; 
    }

    
    const baseUrl = getBaseUrl(req);
    let apkInfo = { uploaded: false };
    if (cachedSettingsData.rawApkInfo) {
      apkInfo = {
        ...cachedSettingsData.rawApkInfo,
        url: `${baseUrl}/api/public/download-apk`
      };
    }

    res.json({
      webPortalLink: cachedSettingsData.webPortalLink,
      termsLink: cachedSettingsData.termsLink,
      whatsappGroupLink: cachedSettingsData.whatsappGroupLink,
      chromeExtensionLink: cachedSettingsData.chromeExtensionLink,
      apkInfo
    });
  } catch (error) {
    console.error("Public Settings Error:", error);
    res.status(500).json({ message: "Server Error fetching settings" });
  }
});


app.get('/api/public/download-apk', async (req, res) => {
  try {
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    
    
    if (dbSetting && dbSetting.value && dbSetting.value.uploaded && dbSetting.value.b2Key) {
      const signedUrl = await getSignedDownloadUrl(dbSetting.value.b2Key, 3600, 'myportal.apk'); 
      return res.redirect(signedUrl);
    }
    
    
    if (dbSetting && dbSetting.value && dbSetting.value.uploaded && dbSetting.value.url && !dbSetting.value.url.includes('/api/public/download-apk')) {
      const cloudinaryUrl = dbSetting.value.url;
      
      const streamRes = await axios({
        method: 'get',
        url: cloudinaryUrl,
        responseType: 'stream'
      });
      
      
      res.setHeader('Content-Disposition', 'attachment; filename="myportal.apk"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      
      
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      
      return streamRes.data.pipe(res);
    }
    
    
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


app.post('/api/admin/settings/web-portal-link', auth, adminAuth, async (req, res) => {
  try {
    let { link } = req.body;
    if (!link) return res.status(400).json({ message: "Link is required." });
    
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      link = 'https://' + link;
    }

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "web_portal_link" },
      { value: link },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save Web Portal Link Error:", error);
    res.status(500).json({ message: "Server Error saving portal link" });
  }
});

app.post('/api/admin/settings/chrome-extension-link', auth, adminAuth, async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ message: "Link is required." });

    const setting = await SystemSettings.findOneAndUpdate(
      { key: "chrome_extension_link" },
      { value: link },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save Chrome Extension Link Error:", error);
    res.status(500).json({ message: "Server Error saving extension link" });
  }
});


app.post('/api/admin/settings/terms-link', auth, adminAuth, async (req, res) => {
  try {
    const { link } = req.body;
    const setting = await SystemSettings.findOneAndUpdate(
      { key: "terms_link" },
      { value: link || "" },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save Terms Link Error:", error);
    res.status(500).json({ message: "Server Error saving terms link" });
  }
});


app.post('/api/admin/settings/whatsapp-link', auth, adminAuth, async (req, res) => {
  try {
    const { link } = req.body;
    const setting = await SystemSettings.findOneAndUpdate(
      { key: "whatsapp_group_link" },
      { value: link || "" },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();
    res.json({ success: true, link: setting.value });
  } catch (error) {
    console.error("Save WhatsApp Link Error:", error);
    res.status(500).json({ message: "Server Error saving whatsapp link" });
  }
});


app.post('/api/admin/settings/apk-upload', auth, adminAuth, (req, res) => {
  apkUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const version = req.body.version || '1.0.0';
    const filePath = req.file.path;

    try {
      
      const buffer = fs.readFileSync(filePath);

      
      const b2Key = `apk_releases/myportal_${version.replace(/[^a-zA-Z0-9.-]/g, '_')}_${Date.now()}.apk`;
      await uploadToB2(b2Key, buffer, 'application/vnd.android.package-archive');

      
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.error("Failed to delete temp APK file:", unlinkErr.message);
      }

      
      const baseUrl = getBaseUrl(req);
      const apkInfo = {
        uploaded: true,
        filename: req.file.originalname || 'myportal.apk',
        size: req.file.size,
        uploadedAt: new Date(),
        version: version,
        b2Key: b2Key,
        url: `${baseUrl}/api/public/download-apk`
      };

      await SystemSettings.findOneAndUpdate(
        { key: "apk_info" },
        { value: apkInfo },
        { upsert: true, new: true }
      );
      invalidateSettingsCache();

      res.json({ success: true, apkInfo });
    } catch (error) {
      console.error("APK Settings Save Error:", error);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
      res.status(500).json({ message: "Server Error uploading APK to B2." });
    }
  });
});


app.get('/api/admin/settings/apk-upload-url', auth, adminAuth, async (req, res) => {
  const version = req.query.version || '1.0.0';
  const filename = req.query.filename || 'myportal.apk';
  const cleanVersion = version.replace(/[^a-zA-Z0-9.-]/g, '_');
  const b2Key = `apk_releases/myportal_${cleanVersion}_${Date.now()}.apk`;

  try {
    const uploadUrl = await getPresignedUploadUrl(b2Key, 'application/vnd.android.package-archive', 3600);
    res.json({ success: true, uploadUrl, b2Key });
  } catch (error) {
    console.error("Presigned URL Generation Error:", error);
    res.status(500).json({ message: "Server Error generating pre-signed upload URL." });
  }
});


app.post('/api/admin/settings/apk-confirm', auth, adminAuth, async (req, res) => {
  const { b2Key, version, size, filename } = req.body;
  if (!b2Key || !version) {
    return res.status(400).json({ message: "b2Key and version are required." });
  }

  try {
    const baseUrl = getBaseUrl(req);
    const apkInfo = {
      uploaded: true,
      filename: filename || 'myportal.apk',
      size: size || 0,
      uploadedAt: new Date(),
      version: version,
      b2Key: b2Key,
      url: `${baseUrl}/api/public/download-apk`
    };

    await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();

    res.json({ success: true, apkInfo });
  } catch (error) {
    console.error("APK Confirm Save Error:", error);
    res.status(500).json({ message: "Server Error saving APK release info." });
  }
});


app.delete('/api/admin/settings/apk-delete', auth, adminAuth, async (req, res) => {
  try {
    const dbSetting = await SystemSettings.findOne({ key: "apk_info" });
    if (dbSetting && dbSetting.value && dbSetting.value.b2Key) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const deleteCommand = new DeleteObjectCommand({
        Bucket: B2_BUCKET,
        Key: dbSetting.value.b2Key
      });
      await b2.send(deleteCommand);
      console.log(`🗑️ Deleted APK from B2: ${dbSetting.value.b2Key}`);
    }

    const apkPath = path.join(uploadDir, 'myportal.apk');
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }

    const apkInfo = {
      uploaded: false,
      filename: '',
      size: 0,
      uploadedAt: null,
      version: '',
      b2Key: '',
      url: ''
    };

    await SystemSettings.findOneAndUpdate(
      { key: "apk_info" },
      { value: apkInfo },
      { upsert: true, new: true }
    );
    invalidateSettingsCache();

    res.json({ success: true, apkInfo });
  } catch (error) {
    console.error("Delete APK Error:", error);
    res.status(500).json({ message: "Server Error deleting APK" });
  }
});


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
    invalidateSettingsCache();

    res.json({ success: true, apkInfo: setting.value });
  } catch (error) {
    console.error("Save APK URL Error:", error);
    res.status(500).json({ message: "Server Error saving APK URL" });
  }
});





app.post('/api/web/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });
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

app.post('/api/web/send-otp', authLimiter, async (req, res) => {
  try {
    const { email, type } = req.body;
    if (typeof email !== 'string' || (type !== undefined && typeof type !== 'string')) {
      return res.status(400).json({ message: "Invalid input types." });
    }
    if (!email) return res.status(400).json({ message: "Email is required." });
    const formattedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: formattedEmail });

    if (!user) return res.status(404).json({ message: "Account not found." });

    const code = await createOtp(formattedEmail);

    const subject = type === 'setup' ? 'Set up your Web Portal Password' : 'Reset your Web Portal Password';
    const msg = type === 'setup'
      ? 'Welcome to MyPortal Web! Use this code to verify your identity and create your web password.'
      : 'You requested a password reset for MyPortal Web. Use this code to proceed.';

    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: formattedEmail,
      subject: subject,
      html: generateEmailTemplate(subject, code, msg)
    });

    res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    res.status(500).json({ message: "Error sending verification code." });
  }
});

app.post('/api/web/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (typeof email !== 'string' || (typeof otp !== 'string' && typeof otp !== 'number')) {
      return res.status(400).json({ message: "Invalid input types." });
    }
    if (!email) return res.status(400).json({ message: "Email is required." });
    const formattedEmail = email.toLowerCase().trim();

    const isValid = await verifyOtp(formattedEmail, otp);
    if (!isValid) return res.status(400).json({ message: "Invalid or expired OTP." });

    res.json({ success: true, message: "OTP verified." });
  } catch (err) {
    res.status(500).json({ message: "Error verifying OTP." });
  }
});

app.post('/api/web/set-password', authLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (typeof email !== 'string' || (typeof otp !== 'string' && typeof otp !== 'number') || typeof newPassword !== 'string') {
      return res.status(400).json({ message: "Invalid input types." });
    }
    if (!email) return res.status(400).json({ message: "Email is required." });
    const formattedEmail = email.toLowerCase().trim();

    const isValid = await verifyOtp(formattedEmail, otp);
    if (!isValid) return res.status(400).json({ message: "Invalid or expired OTP." });

    const user = await User.findOne({ email: formattedEmail });
    if (!user) return res.status(404).json({ message: "Account not found." });
    user.webPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();
    await consumeOtp(formattedEmail);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d', algorithm: JWT_ALG });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, profilePic: user.profilePic }
    });
  } catch (err) {
    res.status(500).json({ message: "Error securing your new password." });
  }
});

// Register a pending onboarding sync so the extension's first scrape can be linked back to this
// web session even if the URL fragment carrying the sync id is lost during the SSO redirect.
app.post('/api/web/register-sync', async (req, res) => {
  try {
    const { email, tempSyncId } = req.body;
    if (!email || !tempSyncId || typeof email !== 'string' || typeof tempSyncId !== 'string') {
      return res.status(400).json({ message: "email and tempSyncId are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    await PendingSync.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, tempSyncId, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Register sync error:", err.message);
    res.status(500).json({ message: "Server error registering sync" });
  }
});

app.get('/api/web/check-sync-status', async (req, res) => {
  try {
    const { tempSyncId } = req.query;
    if (!tempSyncId) {
      return res.status(400).json({ message: "tempSyncId is required" });
    }
    const user = await User.findOne({ tempSyncId });
    if (!user) {
      // Extension hasn't linked this session yet.
      return res.json({ state: 'waiting', synced: false });
    }

    // The extension has connected. Always hand back a short-lived password-setup token plus the
    // DETECTED identity so the web can (a) show real progress and (b) warn if the Horizon account
    // that actually logged in differs from the roll number the user typed.
    const token = jwt.sign(
      { id: user.id, isTempSyncAuth: true },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    const detectedRoll = (user.portalId || (user.email ? user.email.split('@')[0] : '')).toUpperCase();
    const identity = { name: user.name, rollNumber: detectedRoll, email: user.email };

    if (user.syncStatus === 'complete') {
      // Full first scrape finished — clear tempSyncId so it can't be reused.
      user.tempSyncId = null;
      await user.save();
      return res.json({ 
        state: 'done', 
        synced: true, 
        tempToken: token, 
        syncProgress: 100, 
        syncActivity: 'Sync complete! Setting up account…',
        hasPassword: !!user.webPassword,
        ...identity 
      });
    }

    // Connected and importing data; keep tempSyncId so subsequent polls still resolve.
    return res.json({ 
      state: 'scraping', 
      synced: false, 
      tempToken: token, 
      syncProgress: user.syncProgress || 0,
      syncActivity: user.syncActivity || 'Importing your data...',
      hasPassword: !!user.webPassword,
      ...identity 
    });
  } catch (err) {
    console.error("Check sync status error:", err.message);
    res.status(500).json({ message: "Server error checking sync status" });
  }
});

app.post('/api/extension-sync-progress', auth, async (req, res) => {
  try {
    const { progress, activity } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.syncProgress = progress;
    user.syncActivity = activity;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/web/set-password-via-sync', authLimiter, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const authHeader = req.headers['x-sync-token'];
    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized. Sync token missing." });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ message: "Sync session expired or invalid." });
    }

    if (!decoded.isTempSyncAuth || !decoded.id) {
      return res.status(403).json({ message: "Invalid token permissions." });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.webPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    await registerDeviceSession(user.id, token, req, resend);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePic: user.profilePic
      }
    });
  } catch (err) {
    console.error("Set password via sync error:", err.message);
    res.status(500).json({ message: "Server error setting password." });
  }
});

app.post('/api/web/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: "Email and password must be strings." });
    }
    if (!email) return res.status(400).json({ message: "Email is required." });
    const formattedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: formattedEmail });
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

    if (!user.accessedWeb) {
      user.accessedWeb = true;
      await user.save();
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d', algorithm: JWT_ALG });
    await registerDeviceSession(user.id, token, req, resend);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, profilePic: user.profilePic }
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in." });
  }
});





app.post('/api/session/keep-alive', auth, async (req, res) => {
  const { ucpCookie } = req.body;
  if (!ucpCookie) return res.status(400).json({ error: "No cookie provided" });
  try {
    // F-001: Validate Keep-alive Cookie by sending a probe GET request to UCP Horizon Dashboard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const probeRes = await fetch('https://horizon.ucp.edu.pk/student/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': ucpCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal,
      redirect: 'manual'
    });
    clearTimeout(timeoutId);

    const location = probeRes.headers.get('location') || '';
    if (probeRes.status === 302 && (location.includes('/login') || location.includes('/web/login'))) {
      console.warn(`[KEEP_ALIVE] ⚠️ Cookie validation failed: Redirected to login.`);
      return res.status(401).json({ error: "SESSION_EXPIRED", message: "Your university portal session has expired. Please re-authenticate." });
    }
    if (!probeRes.ok && probeRes.status !== 302) {
      console.warn(`[KEEP_ALIVE] ⚠️ Cookie validation failed with HTTP status ${probeRes.status}`);
      return res.status(401).json({ error: "INVALID_COOKIE", message: "Failed to validate session cookie." });
    }

    const encrypted = encrypt(ucpCookie);
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        ucpCookie: ucpCookie,
        ucpCookieEncrypted: encrypted,
        ucpCookieUpdatedAt: new Date(),
        isPortalConnected: true,
        lastSyncAt: new Date()
      }
    }, { strict: false });
    
    // F-005: Trigger B2 processing immediately on the spot (asynchronously to avoid blocking client)
    processUserMaterials(req.user.id.toString(), ucpCookie)
      .catch(err => console.error(`[SESSION_KEEP_ALIVE_PROC] Async processing failed:`, err.message));

    res.status(200).json({ message: "Cookies saved to vault." });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(408).json({ error: "TIMEOUT", message: "Validation request timed out." });
    }
    console.error("[KEEP_ALIVE] Error securing cookie:", err.message);
    res.status(500).json({ error: "Failed to secure cookie in vault" });
  }
});

app.post('/api/trigger-expired-push', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    console.log(`[PUSH] Triggering Session Expired push for ${user.email} (Suppressed/Removed)`);

    res.json({ success: true, message: "Push notification suppressed." });
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
    const exams = await Exam.find({ userId: req.user.id }).sort({ date: 1 }).lean();
    res.json(exams);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/assessments', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.id }).sort({ dueDate: 1 }).lean();
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


const mergeUserTasks = (existingTasks, incomingTasks) => {
  const existingTasksList = existingTasks || [];
  const existingTaskMap = new Map();
  
  
  for (const t of existingTasksList) {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (existingTaskMap.has(title)) {
      const current = existingTaskMap.get(title);
      if (t.status === 'Submitted' && current.status !== 'Submitted') {
        existingTaskMap.set(title, t);
      }
    } else {
      existingTaskMap.set(title, t);
    }
  }

  const mergedTasks = [];
  const processedTitles = new Set();

  for (const incomingTask of incomingTasks) {
    const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDueDate = parseUCPDate(incomingTask.dueDate);
    const normStartDate = parseUCPDate(incomingTask.startDate);

    if (existingTaskMap.has(title)) {
      const existingTask = existingTaskMap.get(title);
      const status = (existingTask.status === 'Submitted' || incomingTask.status === 'Submitted') ? 'Submitted' : 'Pending';
      const existingObj = existingTask.toObject ? existingTask.toObject() : existingTask;

      mergedTasks.push({
        ...existingObj,
        ...incomingTask,
        dueDate: normDueDate,
        startDate: normStartDate,
        status
      });
    } else {
      mergedTasks.push({
        ...incomingTask,
        dueDate: normDueDate,
        startDate: normStartDate
      });
    }
    processedTitles.add(title);
  }

  
  for (const existingTask of existingTasksList) {
    const title = (existingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!processedTitles.has(title)) {
      const bestTask = existingTaskMap.get(title) || existingTask;
      mergedTasks.push(bestTask);
      processedTitles.add(title);
    }
  }

  return mergedTasks;
};

const syncQueues = new Map();

function queueSyncTask(userId, taskFn) {
  if (!syncQueues.has(userId)) {
    syncQueues.set(userId, Promise.resolve());
  }
  const prev = syncQueues.get(userId);
  const next = (async () => {
    try { await prev; } catch (err) {}
    return await taskFn();
  })();
  syncQueues.set(userId, next);
  next.finally(() => {
    if (syncQueues.get(userId) === next) {
      syncQueues.delete(userId);
    }
  });
  return next;
}

function logDetailedDifference(obj1, obj2, path = '') {
  const normalize = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (Array.isArray(val) && val.length === 0) return null;
    return val;
  };

  const n1 = normalize(obj1);
  const n2 = normalize(obj2);

  if (n1 === null && n2 === null) return true;
  if (n1 === null || n2 === null) {
    console.log(`[SYNC] [DIFF] Mismatch at "${path}": one is null/empty. DB: ${n1 === null ? 'empty' : JSON.stringify(n1)} | Scraped: ${n2 === null ? 'empty' : JSON.stringify(n2)}`);
    return false;
  }

  if (typeof n1 !== 'object' || typeof n2 !== 'object') {
    const match = String(n1).trim() === String(n2).trim();
    if (!match) {
      console.log(`[SYNC] [DIFF] Mismatch at "${path}": DB value "${n1}" !== Scraped value "${n2}"`);
    }
    return match;
  }

  if (n1 instanceof Date && n2 instanceof Date) {
    const match = n1.getTime() === n2.getTime();
    if (!match) {
      console.log(`[SYNC] [DIFF] Mismatch at "${path}" (Date): DB "${n1.toISOString()}" !== Scraped "${n2.toISOString()}"`);
    }
    return match;
  }

  if (Array.isArray(n1)) {
    if (!Array.isArray(n2)) {
      console.log(`[SYNC] [DIFF] Mismatch at "${path}": DB is Array, Scraped is not`);
      return false;
    }
    if (n1.length !== n2.length) {
      console.log(`[SYNC] [DIFF] Array length mismatch at "${path}": DB length ${n1.length} !== Scraped length ${n2.length}`);
      return false;
    }
    for (let i = 0; i < n1.length; i++) {
      if (!logDetailedDifference(n1[i], n2[i], `${path}[${i}]`)) return false;
    }
    return true;
  }

  const ignoreKeys = ['_id', 'id', 'userId', 'lastUpdated', 'createdAt', 'updatedAt', '__v', 'lastScrapedAt', 'sequenceNumber', 'processed'];
  const keys1 = Object.keys(n1).filter(k => !ignoreKeys.includes(k));
  const keys2 = Object.keys(n2).filter(k => !ignoreKeys.includes(k));

  const allKeys = new Set([...keys1, ...keys2]);
  for (const key of allKeys) {
    if (!logDetailedDifference(n1[key], n2[key], path ? `${path}.${key}` : key)) return false;
  }
  return true;
}

function mergeGradesNonDestructively(oldGrade, newGrade) {
  if (!oldGrade) return newGrade;

  const merged = JSON.parse(JSON.stringify(newGrade));

  const isZeroOrEmpty = (val) => val === null || val === undefined || val === '' || val === '0' || val === '0.00' || val === 0;
  
  if (isZeroOrEmpty(newGrade.totalPercentage) && !isZeroOrEmpty(oldGrade.totalPercentage)) {
    merged.totalPercentage = oldGrade.totalPercentage;
  }

  if (newGrade.assessments && Array.isArray(newGrade.assessments)) {
    const oldAssessmentsMap = new Map((oldGrade.assessments || []).map(a => [a.name, a]));
    
    merged.assessments = newGrade.assessments.map(newAss => {
      const oldAss = oldAssessmentsMap.get(newAss.name);
      if (!oldAss) return newAss;

      const mergedAss = JSON.parse(JSON.stringify(newAss));
      if (isZeroOrEmpty(newAss.percentage) && !isZeroOrEmpty(oldAss.percentage)) {
        mergedAss.percentage = oldAss.percentage;
      }

      if (newAss.details && Array.isArray(newAss.details)) {
        const oldDetailsMap = new Map((oldAss.details || []).map(d => [d.name, d]));
        mergedAss.details = newAss.details.map(newDet => {
          const oldDet = oldDetailsMap.get(newDet.name);
          if (!oldDet) return newDet;

          const mergedDet = JSON.parse(JSON.stringify(newDet));
          if (isZeroOrEmpty(newDet.obtainedMarks) && !isZeroOrEmpty(oldDet.obtainedMarks)) {
            mergedDet.obtainedMarks = oldDet.obtainedMarks;
            mergedDet.percentage = oldDet.percentage;
          }
          if (isZeroOrEmpty(newDet.classAverage) && !isZeroOrEmpty(oldDet.classAverage)) {
            mergedDet.classAverage = oldDet.classAverage;
          }
          return mergedDet;
        });
      }
      return mergedAss;
    });
  } else if (oldGrade.assessments) {
    merged.assessments = oldGrade.assessments;
  }

  return merged;
}

function mergeAttendanceNonDestructively(oldAtt, newAtt) {
  if (!oldAtt) return newAtt;
  const merged = JSON.parse(JSON.stringify(newAtt));
  if ((!newAtt.records || newAtt.records.length === 0) && oldAtt.records && oldAtt.records.length > 0) {
    merged.records = oldAtt.records;
    merged.summary = oldAtt.summary;
  }
  return merged;
}

function mergeAnnouncementsNonDestructively(oldAnn, newAnn) {
  if (!oldAnn) return newAnn;
  const merged = JSON.parse(JSON.stringify(newAnn));
  if ((!newAnn.news || newAnn.news.length === 0) && oldAnn.news && oldAnn.news.length > 0) {
    merged.news = oldAnn.news;
  }
  return merged;
}

function objectsAreEqual(obj1, obj2) {
  const normalize = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (Array.isArray(val) && val.length === 0) return null;
    return val;
  };

  const n1 = normalize(obj1);
  const n2 = normalize(obj2);

  if (n1 === null && n2 === null) return true;
  if (n1 === null || n2 === null) return false;

  if (typeof n1 !== 'object' || typeof n2 !== 'object') {
    return String(n1).trim() === String(n2).trim();
  }

  if (n1 instanceof Date && n2 instanceof Date) {
    return n1.getTime() === n2.getTime();
  }

  if (Array.isArray(n1)) {
    if (!Array.isArray(n2) || n1.length !== n2.length) return false;
    for (let i = 0; i < n1.length; i++) {
      if (!objectsAreEqual(n1[i], n2[i])) return false;
    }
    return true;
  }

  const keys1 = Object.keys(n1).filter(k => !['_id', 'id', 'userId', 'lastUpdated', 'createdAt', 'updatedAt', '__v', 'lastScrapedAt', 'sequenceNumber', 'processed'].includes(k));
  const keys2 = Object.keys(n2).filter(k => !['_id', 'id', 'userId', 'lastUpdated', 'createdAt', 'updatedAt', '__v', 'lastScrapedAt', 'sequenceNumber', 'processed'].includes(k));

  const allKeys = new Set([...keys1, ...keys2]);
  for (const key of allKeys) {
    if (!objectsAreEqual(n1[key], n2[key])) return false;
  }
  return true;
}

app.post(['/api/extension-sync', '/api/mobile-sync'], auth, async (req, res) => {
  const userId = req.user.id;
  const syncKey = userId.toString();

  // Hoist scraperEngine imports out of loops and handle failure gracefully.
  let getCurrentSemesterCode, parseSemesterFromCourseCode;
  try {
    const engine = require('./services/scraperEngine');
    getCurrentSemesterCode = engine.getCurrentSemesterCode;
    parseSemesterFromCourseCode = engine.parseSemesterFromCourseCode;
  } catch (err) {
    console.error(`[SYNC] scraperEngine failed to load:`, err.message);
    return res.status(500).json({ message: "Sync engine unavailable. Please try again." });
  }

  try {
    const { gradesData, historyData, statsData, timetableData, attendanceData, announcementsData, submissionsData, datesheetData, portalId, ucpCookie, courseMap: clientCourseMap, syncMode, studentName, profilePic, syncLogId, materialLinksData } = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Mark platform access immediately upon receiving request
    let platformChanged = false;
    const ua = req.headers['user-agent'] || '';
    const isAxios = ua.toLowerCase().includes('axios');

    if (req.path === '/api/extension-sync') {
      if (!isAxios && !user.accessedExtension) {
        user.accessedExtension = true;
        platformChanged = true;
      }
    } else if (req.path === '/api/mobile-sync') {
      if (!user.accessedMobile) {
        user.accessedMobile = true;
        platformChanged = true;
      }
    }
    if (platformChanged) {
      await user.save();
    }

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

    // Fetch existing records for diff comparison
    const [
      existingCourses,
      existingAttendance,
      existingAnnouncements,
      existingSubmissions,
      existingTimetable,
      existingExams,
      existingGrades,
      existingHistory,
      existingStats
    ] = await Promise.all([
      Course.find({ userId }).lean(),
      Attendance.find({ userId }).lean(),
      Announcement.find({ userId }).lean(),
      Submission.find({ userId }).lean(),
      Timetable.find({ userId, semester: req.body.semester || getCurrentSemesterCode() }).lean(),
      Exam.find({ userId }).lean(),
      Grade.find({ userId }).lean(),
      ResultHistory.find({ userId }).lean(),
      StudentStats.findOne({ userId }).lean()
    ]);

    const compareGrades = () => {
      const arr = gradesData || [];
      if (arr.length === 0) return true;
      const newUrls = new Set(arr.map(g => g.courseUrl));
      if (existingGrades.some(g => !newUrls.has(g.courseUrl))) {
        console.log(`[SYNC] [DIFF] Grades: Database contains courses not present in the scraped payload.`);
        return false;
      }
      const oldGradesMap = new Map(existingGrades.map(g => [g.courseUrl, g]));
      let match = true;
      for (const grade of arr) {
        if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
        const oldGrade = oldGradesMap.get(grade.courseUrl);
        if (!oldGrade) {
          console.log(`[SYNC] [DIFF] Grades: Scraped course "${grade.courseName}" (${grade.courseUrl}) not found in database.`);
          match = false;
          continue;
        }
        if (!logDetailedDifference(oldGrade, grade, `Grades(${grade.courseName})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Grades match database exactly.`);
      return match;
    };

    const compareAttendance = () => {
      const arr = attendanceData || [];
      if (arr.length === 0) return true;
      const newUrls = new Set(arr.map(a => a.courseUrl));
      if (existingAttendance.some(a => !newUrls.has(a.courseUrl))) {
        console.log(`[SYNC] [DIFF] Attendance: Database contains courses not present in the scraped payload.`);
        return false;
      }
      const oldAttMap = new Map(existingAttendance.map(a => [a.courseUrl, a]));
      let match = true;
      for (const att of arr) {
        if (!att.courseUrl || !att.courseName || att.courseName.includes("Unknown")) continue;
        const oldAtt = oldAttMap.get(att.courseUrl);
        if (!oldAtt) {
          console.log(`[SYNC] [DIFF] Attendance: Scraped course "${att.courseName}" (${att.courseUrl}) not found in database.`);
          match = false;
          continue;
        }
        if (!logDetailedDifference(oldAtt, att, `Attendance(${att.courseName})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Attendance matches database exactly.`);
      return match;
    };

    const compareAnnouncements = () => {
      const arr = announcementsData || [];
      if (arr.length === 0) return true;
      const newUrls = new Set(arr.map(a => a.courseUrl));
      if (existingAnnouncements.some(a => !newUrls.has(a.courseUrl))) {
        console.log(`[SYNC] [DIFF] Announcements: Database contains courses not present in the scraped payload.`);
        return false;
      }
      const oldAnnMap = new Map(existingAnnouncements.map(a => [a.courseUrl, a]));
      let match = true;
      for (const ann of arr) {
        if (!ann.courseUrl || !ann.courseName || ann.courseName.includes("Unknown")) continue;
        const oldAnn = oldAnnMap.get(ann.courseUrl);
        if (!oldAnn) {
          console.log(`[SYNC] [DIFF] Announcements: Scraped course "${ann.courseName}" (${ann.courseUrl}) not found in database.`);
          match = false;
          continue;
        }
        if (!logDetailedDifference(oldAnn, ann, `Announcements(${ann.courseName})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Announcements match database exactly.`);
      return match;
    };

    const compareSubmissions = () => {
      const arr = submissionsData || [];
      if (arr.length === 0) return true;
      const oldSubMap = new Map(existingSubmissions.map(s => [s.courseUrl, s]));
      let match = true;
      for (const sub of arr) {
        if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;
        const oldSub = oldSubMap.get(sub.courseUrl);
        if (!oldSub) {
          console.log(`[SYNC] [DIFF] Submissions: Scraped course "${sub.courseName}" (${sub.courseUrl}) not found in database.`);
          match = false;
          continue;
        }
        const mergedTasks = mergeUserTasks(oldSub?.tasks, sub.tasks);
        if (!logDetailedDifference(oldSub.tasks, mergedTasks, `Submissions(${sub.courseName}).tasks`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Submissions match database exactly.`);
      return match;
    };

    const compareTimetable = () => {
      const arr = timetableData || [];
      if (arr.length === 0) return true;
      const preparedClasses = [];
      for (const classItem of arr) {
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
        const fullCode = classItem.courseCode || '';
        const parsed = parseSemesterAndSectionFromCode(fullCode);
        const finalSemester = parsed.semester || req.body.semester || getCurrentSemesterCode();
        preparedClasses.push({
          ...classData,
          isMakeup,
          expiresAt,
          userId,
          semester: finalSemester
        });
      }
      const match = logDetailedDifference(existingTimetable, preparedClasses, 'Timetable');
      if (match) console.log(`[SYNC] [NO_DIFF] Timetable matches database exactly.`);
      return match;
    };

    const compareExams = () => {
      const arr = datesheetData || [];
      if (arr.length === 0) return true;
      const oldExamsMap = new Map(existingExams.map(e => [`${e.courseName}_${e.date}`, e]));
      let match = true;
      for (const exam of arr) {
        const oldExam = oldExamsMap.get(`${exam.courseName}_${exam.date}`);
        if (!oldExam) {
          console.log(`[SYNC] [DIFF] Exams: Exam for "${exam.courseName}" on ${exam.date} not found in database.`);
          match = false;
          continue;
        }
        if (!logDetailedDifference(oldExam, exam, `Exams(${exam.courseName}_${exam.date})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Exams match database exactly.`);
      return match;
    };

    const compareHistory = () => {
      const arr = historyData || [];
      if (arr.length === 0) return true;
      const newTerms = new Set(arr.map(h => h.term));
      if (existingHistory.some(h => !newTerms.has(h.term))) {
        console.log(`[SYNC] [DIFF] History: Database contains terms not present in the scraped payload.`);
        return false;
      }
      const historyMap = new Map(existingHistory.map(h => [h.term, h]));
      let match = true;
      for (const sem of arr) {
        if (!sem.term) continue;
        const existing = historyMap.get(sem.term);
        if (!existing) {
          console.log(`[SYNC] [DIFF] History: Scraped term "${sem.term}" not found in database.`);
          match = false;
          continue;
        }
        if (!logDetailedDifference(existing, sem, `History(${sem.term})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] History matches database exactly.`);
      return match;
    };

    const compareStats = () => {
      if (!statsData || Object.keys(statsData).length === 0) return true;
      if (!existingStats) {
        console.log(`[SYNC] [DIFF] Stats: No existing stats found in database.`);
        return false;
      }
      const updatePayload = { ...statsData, userId };
      if (statsData.cgpa === "0.00" && existingStats.cgpa !== "0.00") {
        delete updatePayload.cgpa;
      }
      const match = logDetailedDifference(existingStats, updatePayload, 'Stats');
      if (match) console.log(`[SYNC] [NO_DIFF] Stats match database exactly.`);
      return match;
    };

    const compareCourses = () => {
      if (!clientCourseMap || typeof clientCourseMap !== 'object') return true;
      const oldCoursesMap = new Map(existingCourses.map(c => [c.name, c]));
      let match = true;
      for (const [url, info] of Object.entries(clientCourseMap)) {
        const courseName = (info.name || '').trim();
        if (!courseName) continue;
        const oldCourse = oldCoursesMap.get(courseName);
        if (!oldCourse) {
          console.log(`[SYNC] [DIFF] Courses: Scraped course "${courseName}" not found in database.`);
          match = false;
          continue;
        }
        const fullCode = (info.code || '').trim();
        const parsed = parseSemesterAndSectionFromCode(fullCode);
        const creditHours = info.creditHours !== undefined ? info.creditHours : 3;
        let sectionCode = '';
        if (fullCode) {
          const parts = fullCode.split('-');
          const candidate = parts.length > 1 ? parts[parts.length - 1] : fullCode;
          if (candidate && !candidate.includes(' ') && !candidate.toLowerCase().includes('credit') && candidate.length <= 15 && /^[a-zA-Z0-9-]+$/.test(candidate)) {
            sectionCode = candidate;
          }
        }
        const finalSection = sectionCode || parsed.section || '';
        const finalSemester = parsed.semester || req.body.semester || getCurrentSemesterCode();
        const updatePayload = { userId, name: courseName, type: 'university', creditHours, semester: finalSemester };
        if (fullCode) updatePayload.code = fullCode;
        if (finalSection) updatePayload.section = finalSection;
        if (url) updatePayload.portalUrl = url;
        if (!logDetailedDifference(oldCourse, updatePayload, `Courses(${courseName})`)) {
          match = false;
        }
      }
      if (match) console.log(`[SYNC] [NO_DIFF] Courses match database exactly.`);
      return match;
    };

    const gradesMatch = compareGrades();
    const attendanceMatch = compareAttendance();
    const announcementsMatch = compareAnnouncements();
    const submissionsMatch = compareSubmissions();
    const timetableMatch = compareTimetable();
    const examsMatch = compareExams();
    const historyMatch = compareHistory();
    const statsMatch = compareStats();
    const coursesMatch = compareCourses();

    const isIdentical = gradesMatch && attendanceMatch && announcementsMatch && submissionsMatch && timetableMatch && examsMatch && historyMatch && statsMatch && coursesMatch;

    if (isIdentical) {
      console.log(`[SYNC] User ${user.email} sync DISCARDED: scraped data matches database exactly.`);
      const activeCookie = ucpCookie || user.ucpCookie;
      if (activeCookie) {
        await User.updateOne({ _id: userId }, {
          $set: {
            ucpCookie: activeCookie,
            ucpCookieEncrypted: encrypt(activeCookie),
            ucpCookieUpdatedAt: new Date(),
            lastSyncAt: new Date(),
            isPortalConnected: true,
            ...((user.syncStatus === 'scraping' || user.tempSyncId) ? { syncStatus: 'complete' } : {})
          }
        });
      }
      if (syncLogId) {
        await SyncLog.findByIdAndUpdate(syncLogId, {
          status: 'SUCCESS',
          endTime: new Date(),
          changesSummary: null
        });
      }
      return res.status(200).json({ message: "Sync complete. No changes detected." });
    }

    const isFullSync = (mode === 'LOGIN_SYNC' || mode === 'FORCE_SYNC');

    const executeUpdate = async () => {
      try {
        console.log(`[SYNC] Sync mode: ${mode}. Differences found. Executing database updates for user: ${user.email}`);
        let userUpdated = false;

        const profileChanged = updateProfileFields(user, req.body);
        if (profileChanged || userUpdated) {
          console.log(`[SYNC] [WRITE] Updating student profile fields in database.`);
          await user.save();
        }

        let changesSummary = {};
        const enrolledSections = [];
        const sectionLookup = {}; 
        const baseCodeLookup = {}; 

        if (clientCourseMap && typeof clientCourseMap === 'object') {
          const coursePromises = [];
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

              const parsed = parseSemesterAndSectionFromCode(fullCode);
              const finalSection = sectionCode || parsed.section || '';
              const finalSemester = parsed.semester || req.body.semester || getCurrentSemesterCode();

              const updatePayload = { userId, name: courseName, type: 'university', creditHours, semester: finalSemester };
              if (fullCode) updatePayload.code = fullCode;
              if (finalSection) updatePayload.section = finalSection;
              if (url) updatePayload.portalUrl = url; 

              const oldCourse = existingCourses.find(c => c.name === courseName);
              if (oldCourse && objectsAreEqual(oldCourse, updatePayload)) {
                continue;
              }

              console.log(`[SYNC] [WRITE] Updating course "${courseName}" in database.`);
              coursePromises.push(Course.findOneAndUpdate(
                { userId, name: courseName },
                { $set: updatePayload },
                { upsert: true }
              ));
            }
          }
          await Promise.all(coursePromises);
        }

        if (attendanceData && attendanceData.length > 0) {
          const oldAttMap = new Map(existingAttendance.map(a => [a.courseUrl, a]));
          const attPromises = [];

          for (const att of attendanceData) {
            if (!att.courseUrl || !att.courseName || att.courseName.includes("Unknown")) continue;
            if (att.records) {
              const oldAtt = oldAttMap.get(att.courseUrl);
              const mergedAtt = mergeAttendanceNonDestructively(oldAtt, att);

              if (oldAtt && objectsAreEqual(oldAtt, mergedAtt)) {
                continue;
              }

              console.log(`[SYNC] [WRITE] Updating attendance for course "${att.courseName}" in database.`);
              const changes = detectAttendanceChanges(oldAtt, mergedAtt);
              if (changes) {
                if (changes.isNewAbsent) {
                  sendPush(user, `Attendance Alert: ${att.courseName} ⚠️`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
                  await createAcademicNotification(userId, 'attendance', `Attendance Alert: ${att.courseName}`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
                }
                if (changes.isCritical) {
                  sendPush(user, `CRITICAL: ${att.courseName} 🚨`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
                  await createAcademicNotification(userId, 'attendance', `CRITICAL: ${att.courseName}`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
                }
                io.to(userId.toString()).emit('attendance_update', changes);
                changesSummary.attendance = changesSummary.attendance || [];
                if (!changesSummary.attendance.includes(att.courseName)) changesSummary.attendance.push(att.courseName);
              }
              attPromises.push(Attendance.findOneAndUpdate({ userId, courseUrl: att.courseUrl }, { ...mergedAtt, lastUpdated: new Date() }, { upsert: true }));
            }
          }
          await Promise.all(attPromises);
        }

        if (announcementsData && announcementsData.length > 0) {
          const oldAnnMap = new Map(existingAnnouncements.map(a => [a.courseUrl, a]));
          const annPromises = [];

          for (const ann of announcementsData) {
            if (!ann.courseUrl || !ann.courseName || ann.courseName.includes("Unknown")) continue;
            if (ann.news) {
              const oldAnn = oldAnnMap.get(ann.courseUrl);
              const mergedAnn = mergeAnnouncementsNonDestructively(oldAnn, ann);

              if (oldAnn && objectsAreEqual(oldAnn, mergedAnn)) {
                continue;
              }

              console.log(`[SYNC] [WRITE] Updating announcements for course "${ann.courseName}" in database.`);
              const changes = detectAnnouncementChanges(oldAnn, mergedAnn);
              if (changes) {
                sendPush(user, `New Announcement: ${ann.courseName} 📢`, changes.latestSubject || "Tap to view details.");
                await createAcademicNotification(userId, 'announcement', `New Announcement: ${ann.courseName}`, changes.latestSubject || "Tap to view details.", ann.courseUrl);
                io.to(userId.toString()).emit('announcement_update', changes);
                changesSummary.announcements = changesSummary.announcements || [];
                if (!changesSummary.announcements.includes(ann.courseName)) changesSummary.announcements.push(ann.courseName);
              }
              annPromises.push(Announcement.findOneAndUpdate({ userId, courseUrl: ann.courseUrl }, { ...mergedAnn, lastUpdated: new Date() }, { upsert: true }));
            }
          }
          await Promise.all(annPromises);
        }

        if (submissionsData && submissionsData.length > 0) {
          const oldSubMap = new Map(existingSubmissions.map(s => [s.courseUrl, s]));
          const subPromises = [];

          for (const sub of submissionsData) {
            if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;

            if (sub.tasks) {
              const oldSub = oldSubMap.get(sub.courseUrl);
              const mergedTasks = mergeUserTasks(oldSub?.tasks, sub.tasks);

              if (oldSub && objectsAreEqual(oldSub.tasks, mergedTasks)) {
                console.log(`[SYNC] Submissions for ${sub.courseName} unchanged, skipping.`);
              } else {
                console.log(`[SYNC] [WRITE] Updating submissions for course "${sub.courseName}" in database.`);
                const changes = detectSubmissionChanges(oldSub, sub);
                if (changes) {
                  io.to(userId.toString()).emit('submission_update', changes);
                  changesSummary.submissions = changesSummary.submissions || [];
                  if (!changesSummary.submissions.includes(sub.courseName)) changesSummary.submissions.push(sub.courseName);
                }

                const newHash = computeSubmissionsHash(mergedTasks);
                subPromises.push(Submission.findOneAndUpdate(
                  { userId, courseUrl: sub.courseUrl },
                  { $set: { courseName: sub.courseName, tasks: mergedTasks, lastSyncHash: newHash, lastUpdated: new Date() } },
                  { upsert: true }
                ));
              }

              const sectionCode = sectionLookup[sub.courseName] || sectionLookup[sub.courseUrl] || '';
              if (sectionCode) {
                const peerCourseDocs = await Course.find({ name: sub.courseName, section: sectionCode });
                const peerUserIds = peerCourseDocs.map(c => c.userId.toString()).filter(id => id !== userId.toString());
                const uniquePeerIds = [...new Set(peerUserIds)];

                if (uniquePeerIds.length > 0) {
                  const peerSubs = await Submission.find({ userId: { $in: uniquePeerIds }, courseUrl: sub.courseUrl });
                  const peerSubMap = new Map(peerSubs.map(s => [s.userId.toString(), s]));

                  for (const peerId of uniquePeerIds) {
                    const peerSub = peerSubMap.get(peerId);
                    const existingTasks = peerSub && peerSub.tasks ? peerSub.tasks : [];

                    const existingTaskMap = new Map();
                    const cleanExistingTasks = [];
                    const seenTitles = new Set();

                    for (const t of existingTasks) {
                      const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                      if (seenTitles.has(title)) {
                        const current = existingTaskMap.get(title);
                        if (t.status === 'Submitted' && current.status !== 'Submitted') {
                          existingTaskMap.set(title, t);
                          const idx = cleanExistingTasks.findIndex(item => 
                            (item.title || '').replace(/\s+/g, ' ').trim().toLowerCase() === title
                          );
                          if (idx !== -1) cleanExistingTasks[idx] = t;
                        }
                      } else {
                        existingTaskMap.set(title, t);
                        cleanExistingTasks.push(t);
                        seenTitles.add(title);
                      }
                    }

                    existingTasks.length = 0;
                    existingTasks.push(...cleanExistingTasks);

                    let merged = false;
                    let newPeerTasks = [];
                    let updatedPeerTasks = [];

                    mergedTasks.forEach(incomingTask => {
                      const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                      const normDueDate = parseUCPDate(incomingTask.dueDate);
                      const normStartDate = parseUCPDate(incomingTask.startDate);

                      if (existingTaskMap.has(title)) {
                        const existingTask = existingTaskMap.get(title);
                        const oldDateParsed = parseUCPDate(existingTask.dueDate);

                        if (oldDateParsed !== normDueDate) {
                          existingTask.dueDate = normDueDate;
                          existingTask.startDate = normStartDate;
                          if (incomingTask.description) existingTask.description = incomingTask.description;
                          if (incomingTask.attachmentUrl) existingTask.attachmentUrl = incomingTask.attachmentUrl;
                          if (incomingTask.submissionUrl) existingTask.submissionUrl = incomingTask.submissionUrl;

                          updatedPeerTasks.push(existingTask);
                          merged = true;
                        }
                      } else {
                        const peerTask = { 
                          ...incomingTask, 
                          status: 'Pending', 
                          dueDate: normDueDate, 
                          startDate: normStartDate 
                        };
                        existingTasks.push(peerTask);
                        newPeerTasks.push(peerTask);
                        merged = true;
                      }
                    });

                    if (merged) {
                      const peerNewHash = computeSubmissionsHash(existingTasks);
                      subPromises.push(Submission.findOneAndUpdate(
                        { userId: peerId, courseUrl: sub.courseUrl },
                        { $set: { courseName: sub.courseName, tasks: existingTasks, lastSyncHash: peerNewHash, lastUpdated: new Date() } },
                        { upsert: true }
                      ).then(() => {
                        io.to(peerId.toString()).emit('submission_update', {
                          type: 'SUBMISSION_UPDATE',
                          courseName: sub.courseName,
                          newCount: newPeerTasks.length + updatedPeerTasks.length,
                          newTasks: [...newPeerTasks, ...updatedPeerTasks]
                        });
                      }));
                    }
                  }
                }
              }
            }
          }
          await Promise.all(subPromises);
          const liveCookie = ucpCookie || user.ucpCookie;
          if (liveCookie) {
            setTimeout(() => processUserSubmissions(userId.toString(), liveCookie), 1000);
          }
        }

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

            const fullCode = classItem.courseCode || '';
            const parsed = parseSemesterAndSectionFromCode(fullCode);
            const finalSemester = parsed.semester || req.body.semester || getCurrentSemesterCode();

            preparedClasses.push({
              ...classData,
              isMakeup,
              expiresAt,
              userId,
              semester: finalSemester,
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

          const currentSem = req.body.semester || getCurrentSemesterCode();

          // Deduplicate preparedClasses by day, startTime, courseName, and semester to avoid unique constraint violations
          const uniqueClassesMap = new Map();
          for (const item of preparedClasses) {
            const key = `${item.day}_${item.startTime}_${item.courseName}_${item.semester}`;
            if (!uniqueClassesMap.has(key)) {
              uniqueClassesMap.set(key, item);
            }
          }
          const deduplicatedClasses = Array.from(uniqueClassesMap.values());

          if (existingTimetable.length > 0 && objectsAreEqual(existingTimetable, deduplicatedClasses)) {
            console.log(`[SYNC] Timetable unchanged, skipping updates.`);
          } else if (deduplicatedClasses.length > 0) {
            console.log(`[SYNC] [WRITE] Updating timetable in database (entries count: ${deduplicatedClasses.length}).`);
            
            // Delete existing records for the semesters we are about to insert to prevent unique key violations
            const semestersToClear = [...new Set(deduplicatedClasses.map(c => c.semester))];
            for (const sem of semestersToClear) {
              if (sem) {
                console.log(`[SYNC] [WRITE] Clearing existing timetable for user: ${userId} and semester: ${sem}`);
                await Timetable.deleteMany({ userId, semester: sem });
              }
            }

            await Timetable.insertMany(deduplicatedClasses);
          }

          const timetablePromises = [];
          for (const [courseName, data] of courseMapLocal.entries()) {
            const sectionCode = sectionLookup[courseName] || '';
            const fullCode = baseCodeLookup[courseName] || data.code || '';

            const parsed = parseSemesterAndSectionFromCode(fullCode);
            const finalSection = sectionCode || parsed.section || '';
            const finalSemester = parsed.semester || req.body.semester || getCurrentSemesterCode();

            const courseUpdatePayload = {
              userId, 
              name: courseName, 
              type: 'university',
              color: data.color || '#3498db'
            };

            if (fullCode) courseUpdatePayload.code = fullCode;
            if (finalSection) courseUpdatePayload.section = finalSection;
            if (finalSemester) courseUpdatePayload.semester = finalSemester;

            if (data.instructors && data.instructors.size > 0) {
              courseUpdatePayload.instructors = Array.from(data.instructors);
            }
            if (data.rooms && data.rooms.size > 0) {
              courseUpdatePayload.rooms = Array.from(data.rooms);
            }

            const oldCourse = existingCourses.find(c => c.name === courseName);
            if (oldCourse && objectsAreEqual(oldCourse, courseUpdatePayload)) {
              continue;
            }

            console.log(`[SYNC] [WRITE] Updating course "${courseName}" details in database.`);
            timetablePromises.push(Course.findOneAndUpdate(
              { userId, name: courseName },
              { $set: courseUpdatePayload },
              { upsert: true }
            ));
          }
          await Promise.all(timetablePromises);
        }

        if (mode === 'LOGIN_SYNC' || mode === 'FORCE_SYNC' || mode === 'AUTO_SYNC') {
          if (datesheetData && datesheetData.length > 0) {
            const oldExamsMap = new Map(existingExams.map(e => [`${e.courseName}_${e.date}`, e]));
            const datesheetPromises = [];
            for (const exam of datesheetData) {
              const oldExam = oldExamsMap.get(`${exam.courseName}_${exam.date}`);

              if (oldExam && objectsAreEqual(oldExam, exam)) {
                continue;
              }

              console.log(`[SYNC] [WRITE] Updating exam datesheet for "${exam.courseName}" on ${exam.date} in database.`);
              datesheetPromises.push(Exam.findOneAndUpdate(
                { userId, courseName: exam.courseName, date: exam.date },
                { $set: { ...exam, userId, lastUpdated: new Date() } },
                { upsert: true, new: true }
              ));
            }
            if (datesheetPromises.length > 0) {
              await Promise.all(datesheetPromises);
              changesSummary.datesheet = [...new Set(datesheetData.map(exam => exam.courseName))];
            }
          }
        }

        if (gradesData && gradesData.length > 0) {
          const oldGradesMap = new Map(existingGrades.map(g => [g.courseUrl, g]));
          let hasAnyGradeChanges = false;
          const gradesToUpdate = [];
          const newUrls = new Set(gradesData.map(g => g.courseUrl));

          if (existingGrades.some(g => !newUrls.has(g.courseUrl))) {
            hasAnyGradeChanges = true;
          }

          for (const grade of gradesData) {
            if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
            const oldGrade = oldGradesMap.get(grade.courseUrl);
            if (!oldGrade || !objectsAreEqual(oldGrade, grade)) {
              hasAnyGradeChanges = true;
              gradesToUpdate.push({ grade, oldGrade });
            }
          }

          if (hasAnyGradeChanges) {
            if (mode === 'LOGIN_SYNC') {
              console.log(`[SYNC] [WRITE] Deleting old grades for LOGIN_SYNC.`);
              await Grade.deleteMany({ userId });
            }
            const gradePromises = [];

            for (const { grade, oldGrade } of gradesToUpdate) {
              const mergedGrade = mergeGradesNonDestructively(oldGrade, grade);
              console.log(`[SYNC] [WRITE] Updating grades for course "${grade.courseName}" in database.`);
              const changes = detectGradeChanges(oldGrade, mergedGrade);
              if (changes) {
                sendPush(user, `Grade Update: ${grade.courseName} 📊`, `Your total weight is now ${changes.newPercentage}%`);
                await createAcademicNotification(userId, 'marks', `Grade Update: ${grade.courseName}`, `Your total weight is now ${changes.newPercentage}%`, grade.courseUrl);
                io.to(userId.toString()).emit('grade_update', changes);
                changesSummary.grades = changesSummary.grades || [];
                if (!changesSummary.grades.includes(grade.courseName)) changesSummary.grades.push(grade.courseName);
              }
              gradePromises.push(Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...mergedGrade, userId, lastUpdated: new Date() }, { upsert: true }));
            }

            if (mode === 'LOGIN_SYNC') {
              for (const grade of gradesData) {
                if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
                const wasInUpdate = gradesToUpdate.some(u => u.grade.courseUrl === grade.courseUrl);
                if (!wasInUpdate) {
                  const oldGrade = oldGradesMap.get(grade.courseUrl);
                  const mergedGrade = mergeGradesNonDestructively(oldGrade, grade);
                  console.log(`[SYNC] [WRITE] Re-inserting course grade for "${grade.courseName}" during LOGIN_SYNC.`);
                  gradePromises.push(Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...mergedGrade, userId, lastUpdated: new Date() }, { upsert: true }));
                }
              }
            }
            await Promise.all(gradePromises);
          }
        }

        if (historyData && historyData.length > 0) {
          const historyMap = new Map(existingHistory.map(h => [h.term, h]));
          const newTerms = new Set(historyData.map(h => h.term));
          let hasAnyHistoryChanges = existingHistory.some(h => !newTerms.has(h.term));
          const historyToUpdate = [];

          for (const sem of historyData) {
            if (!sem.term) continue;
            const existing = historyMap.get(sem.term);
            if (!existing || !objectsAreEqual(existing, sem)) {
              hasAnyHistoryChanges = true;
              historyToUpdate.push({ sem, existing });
            }
          }

          if (hasAnyHistoryChanges) {
            if (mode === 'LOGIN_SYNC') {
              console.log(`[SYNC] [WRITE] Deleting old result history for LOGIN_SYNC.`);
              await ResultHistory.deleteMany({ userId });
            }
            const historyPromises = [];

            for (const { sem, existing } of historyToUpdate) {
              console.log(`[SYNC] [WRITE] Updating result history term "${sem.term}" in database.`);
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

                historyPromises.push(ResultHistory.findOneAndUpdate(
                  { term: sem.term, userId },
                  { $set: updateDoc },
                  { upsert: true }
                ));
              } else {
                historyPromises.push(ResultHistory.findOneAndUpdate(
                  { term: sem.term, userId },
                  { ...sem, userId, lastUpdated: new Date() },
                  { upsert: true }
                ));
              }
            }

            if (mode === 'LOGIN_SYNC') {
              for (const sem of historyData) {
                if (!sem.term) continue;
                const wasInUpdate = historyToUpdate.some(u => u.sem.term === sem.term);
                if (!wasInUpdate) {
                  console.log(`[SYNC] [WRITE] Re-inserting unmodified result history for "${sem.term}" during LOGIN_SYNC.`);
                  historyPromises.push(ResultHistory.findOneAndUpdate(
                    { term: sem.term, userId },
                    { ...sem, userId, lastUpdated: new Date() },
                    { upsert: true }
                  ));
                }
              }
            }
            await Promise.all(historyPromises);
          }
        }

        if (statsData && Object.keys(statsData).length > 0) {
          const updatePayload = { ...statsData, userId, lastUpdated: new Date() };
          if (existingStats && statsData.cgpa === "0.00" && existingStats.cgpa !== "0.00") {
            delete updatePayload.cgpa;
          }
          if (existingStats && objectsAreEqual(existingStats, updatePayload)) {
            console.log(`[SYNC] Student stats unchanged.`);
          } else {
            console.log(`[SYNC] [WRITE] Updating student stats in database.`);
            await StudentStats.findOneAndUpdate(
              { userId },
              { $set: updatePayload },
              { upsert: true }
            );
          }
        }

        const activeCookie = ucpCookie || user.ucpCookie;
        const updateFields = {
          isPortalConnected: true,
          lastSyncAt: new Date(),
          lastScrapedAt: new Date(),
          portalId: user.portalId,
          ucpCookie: activeCookie,
          ucpCookieEncrypted: activeCookie ? encrypt(activeCookie) : null,
          ucpCookieUpdatedAt: new Date(),
          ...((user.syncStatus === 'scraping' || user.tempSyncId) ? { syncStatus: 'complete' } : {}),
          ...(enrolledSections.length > 0 ? { enrolledSections } : {})
        };

        try {
          const userCourses = await Course.find({ userId, type: 'university' });
          const courseSemesters = [...new Set(userCourses.map(c => c.semester).filter(Boolean))];
          if (courseSemesters.length > 0) {
            const history = await ResultHistory.find({ userId });
            const historyTerms = new Set(history.map(h => normalizeSemesterTerm(h.term)));
            const allMatched = courseSemesters.every(sem => historyTerms.has(normalizeSemesterTerm(sem)));
            if (allMatched) {
              const currentCompletedSem = courseSemesters[0];
              if (!user.isSemesterCompleted || user.lastCompletedSemester !== currentCompletedSem) {
                updateFields.isSemesterCompleted = true;
                updateFields.lastCompletedSemester = currentCompletedSem;
              }
            }
          }
        } catch (semErr) {
          console.error("Error detecting semester completion:", semErr);
        }
        if (studentName && studentName !== 'UCP Student') updateFields.name = studentName;
        if (profilePic) {
          updateFields.portalProfilePic = profilePic;
          if (!user.originalPortalProfilePic) {
            updateFields.originalPortalProfilePic = profilePic;
          }
          if (user.showProfilePicToCommunity === true && !user.customProfilePic) {
            updateFields.profilePic = profilePic;
          } else if (user.showProfilePicToCommunity !== true) {
            updateFields.profilePic = null;
          }
        }

        await User.updateOne({ _id: userId }, { $set: updateFields });

        if (syncLogId) {
          if (Object.keys(changesSummary).length === 0) changesSummary = null;
          await SyncLog.findByIdAndUpdate(syncLogId, {
            status: 'SUCCESS',
            endTime: new Date(),
            changesSummary: changesSummary
          });
        }

        if (materialLinksData && Array.isArray(materialLinksData) && materialLinksData.length > 0) {
          const liveCookie = ucpCookie || user.ucpCookie;
          if (liveCookie) {
            let stagedCount = 0;
            const userCourses = await Course.find({ userId }).lean();
            const courseMapDb = new Map(userCourses.map(c => [c.name, c]));

            const existingMaterialLinks = await MaterialLink.find({ userId }).lean();
            const existingMaterialMap = new Map(existingMaterialLinks.map(m => [m.courseUrl, m]));

            const materialPromises = [];

            for (const item of materialLinksData) {
              if (!item.courseUrl) continue;

              let itemSectionCode = sectionLookup[item.courseUrl] || sectionLookup[item.courseName] || '';
              const courseDoc = courseMapDb.get(item.courseName);

              if (!itemSectionCode && courseDoc && courseDoc.section) {
                itemSectionCode = courseDoc.section;
              }

              if (!itemSectionCode && item.courseCode && item.courseCode.includes('-')) {
                const parts = item.courseCode.split('-');
                const candidate = parts[parts.length - 1].trim();
                if (candidate && candidate.length <= 15 && /^[a-zA-Z0-9-]+$/.test(candidate)) {
                  itemSectionCode = candidate;
                }
              }

              if (courseDoc && courseDoc.creditHours === 0) {
                console.log(`[SYNC] Skipping 0 credit hour course material staging: ${item.courseName}`);
                continue;
              }

              const itemTeacherName = (courseDoc?.instructors || [])[0] || '';
              const activeSemester = parseSemesterFromCourseCode(item.courseCode) || req.body.semester || getCurrentSemesterCode();
              const isProcessed = !item.links || item.links.length === 0;
              const finalCourseCode = item.courseCode || courseDoc?.code || '';

              const linksPayload = (item.links || []).map((l, index) => ({
                fileName: l.fileName || '',
                description: l.description || '',
                downloadUrl: l.downloadUrl || '',
                token: l.token || '',
                processed: false,
                sequenceNumber: index
              }));

              const updatePayload = {
                courseName: item.courseName || '',
                courseCode: finalCourseCode,
                sectionCode: itemSectionCode,
                teacherName: itemTeacherName,
                links: linksPayload,
                isProcessed
              };

              const existingMaterial = existingMaterialMap.get(item.courseUrl);
              if (existingMaterial && objectsAreEqual(existingMaterial, updatePayload)) {
                continue;
              }

              stagedCount++;
              materialPromises.push(MaterialLink.findOneAndUpdate(
                { userId, courseUrl: item.courseUrl },
                {
                  $set: {
                    ...updatePayload,
                    lastScrapedAt: new Date()
                  }
                },
                { upsert: true }
              ));
            }
            await Promise.all(materialPromises);
            changesSummary.courseMaterials = [...new Set(materialLinksData.map(m => m.courseName))];

            if (stagedCount > 0) {
              console.log(`[SYNC] 📥 Staged ${stagedCount} material link sets. Firing processor immediately.`);
              processUserMaterials(userId.toString(), liveCookie)
                .catch(err => console.error(`[SYNC_B2_PROC] Async processing failed:`, err.message));
            }
          }
        }
        await updateUserCurrentSemester(userId);

        // Invalidate leaderboard cache for all sections this user belongs to
        try {
          const syncedUserCourses = await Course.find({ userId });
          for (const c of syncedUserCourses) {
            invalidateLeaderboardCache(c.code, c.section);
          }
        } catch (cacheErr) {
          console.warn('[CACHE ERROR] Failed to invalidate cache:', cacheErr.message);
        }

        res.json({ message: "Sync & Diffing complete securely!" });

      } catch (error) {
        console.error("[SYNC_ERROR_STACK] Error in executeUpdate:", error);
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
    };

    if (isFullSync) {
      await executeUpdate();
    } else {
      await queueSyncTask(userId, executeUpdate);
    }

  } catch (error) {
    console.error("[SYNC_ERROR_STACK] Error in outer sync handler:", error);
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
  } finally {
    activeSyncs.delete(syncKey);
  }
});

app.post('/api/force-server-sync', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || !user.ucpCookie || !user.portalId) {
      return res.status(400).json({ message: "No cookie or portalId found. Please login again." });
    }

    
    const syncLog = new SyncLog({
      userId: user._id,
      portalId: user.portalId,
      mode: 'MANUAL_FULL',
      status: 'PENDING',
      startTime: new Date()
    });
    await syncLog.save();

    
    res.json({ message: "Server-side scraping triggered successfully." });

    
    setTimeout(async () => {
      const startTime = Date.now();
      try {
        const { scrapeServerSide } = require('./services/scraperEngine');
        const scrapedPayload = await scrapeServerSide(user.ucpCookie, 'FULL', user.portalId);

        
        scrapedPayload.syncLogId = syncLog._id.toString();

        const jwt = require('jsonwebtoken');
        const axios = require('axios');
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          },
          timeout: 60000
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





const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("🔗 Connecting to MyPortal Database...");

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB Connection Error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Disconnected. Waiting for reconnection...');
});

mongoose.set('sanitizeProjection', true);
mongoose.connect(dbLink, {
  maxPoolSize: 80,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}).then(async () => {
  console.log("✅ MongoDB Connected Successfully!");

  try {
    
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
  upload.any()(req, res, async function (err) {
    if (err) {
      console.error('[UPLOAD_ERROR]', err);
      return res.status(500).json({ error: "Upload failed", details: err.message });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const baseUrl = getBaseUrl(req);
      const urls = [];

      for (const file of req.files) {
        const timestamp = Date.now();
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const userIdentifier = req.user?.rollNumber || req.user?.id || 'anonymous';
        const b2Key = `notes_media/${userIdentifier}_${timestamp}_${cleanName}`;
        
        await uploadToB2(b2Key, file.buffer, file.mimetype || 'application/octet-stream');
        urls.push(`${baseUrl}/api/media/view/${b2Key}`);
      }

      res.json({ urls });
    } catch (error) {
      console.error('[UPLOAD_ERROR_B2]', error);
      res.status(500).json({ error: 'Failed to upload files to B2 storage', details: error.message });
    }
  });
});

app.get('/api/media/view/:folder/:filename', async (req, res) => {
  const { folder, filename } = req.params;
  if (!folder || !filename) return res.status(400).send("Bad Request");
  const key = `${folder}/${filename}`;

  try {
    const buffer = await downloadFileFromB2(key);
    const mimeType = getMimeType(key);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); 
    res.send(buffer);
  } catch (error) {
    console.error(`[MEDIA_VIEW_ERROR] Error retrieving file ${key}:`, error);
    res.status(404).send("File not found");
  }
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
  try { res.json(await Keynote.find({ userId: req.user.id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean()); } catch (error) { res.status(500).json({ message: "Error" }); }
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
      admins: [req.user.id] 
    });
    await group.save();
    await broadcastLiveUpdate(group._id, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});


app.put('/api/groups/toggle-admin', auth, async (req, res) => {
  try {
    const { memberId } = req.body;
    const group = await Group.findOne({ members: req.user.id });
    if (!group) return res.status(404).json({ message: "Group not found." });

    
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


app.post('/api/groups/invite', auth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ message: "Receiver ID is required" });

    
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


app.get('/api/groups/my', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ members: req.user.id })
      .populate('members', 'name email profilePic customProfilePic portalId createdAt')
      .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt')
      .lean();
    res.json(group);
  } catch (error) {
    console.error("Fetch My Group Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


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
        
        group.admins = otherAdmins;
        group.members = otherMembers;
        if (group.creatorId.toString() === userIdStr) {
          
          group.creatorId = otherAdmins[0];
        }
        await group.save();

        
        await Task.updateMany(
          { groupId: group._id },
          { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
        );
        await broadcastLiveUpdate(group._id, req.user.id);
        res.json({ message: "Left group successfully. Workspace continues under other administrators." });
      }
      else if (otherMembers.length > 0) {
        
        const { nextAdminId } = req.body;
        if (!nextAdminId) {
          return res.status(400).json({ message: "Please specify who should be promoted to Admin next." });
        }
        
        const nextAdminIdStr = nextAdminId.toString();
        const isValidMember = otherMembers.some(m => m.toString() === nextAdminIdStr);
        if (!isValidMember) {
          return res.status(400).json({ message: "Selected user is not a member of this group." });
        }

        
        group.admins = [nextAdminId];
        group.creatorId = nextAdminId;
        group.members = otherMembers;
        await group.save();

        
        const memberUser = await User.findById(nextAdminId);
        if (memberUser) {
          await createAcademicNotification(nextAdminId, 'group', `Admin Promoted 👑`, `You are now the Admin of "${group.name}".`);
          if (typeof sendPush === 'function') sendPush(memberUser, `Admin Promoted 👑`, `You are now the Admin of "${group.name}".`);
          io.to(nextAdminIdStr).emit('live_db_update');
        }

        
        await Task.updateMany(
          { groupId: group._id },
          { $pull: { deletedByUsers: req.user.id, memberStatuses: { userId: req.user.id } } }
        );
        await broadcastLiveUpdate(group._id, req.user.id);
        res.json({ message: "Left group successfully. Administrative role reassigned." });
      }
      else {
        
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
      
      group.members = otherMembers;
      group.admins = group.admins.filter(a => a.toString() !== userIdStr);
      await group.save();

      
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


app.get('/api/users/community', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const query = { _id: { $ne: req.user.id } };
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
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


app.get('/api/groups/invitations', auth, async (req, res) => {
  try {
    const invites = await GroupInvitation.find({ receiverId: req.user.id, status: 'pending' })
      .populate('senderId', 'name email profilePic')
      .populate('groupId', 'name')
      .lean();
    res.json(invites);
  } catch (error) {
    console.error("Fetch Invites Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});


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

    
    
    const userInGroup = await Group.findOne({ members: req.user.id });
    if (userInGroup) {
      userInGroup.members = userInGroup.members.filter(m => m.toString() !== req.user.id);
      userInGroup.admins = userInGroup.admins.filter(a => a.toString() !== req.user.id);
      
      if (userInGroup.members.length === 0) {
        
        const pendingInvites = await GroupInvitation.find({ groupId: userInGroup._id });
        for (const invite of pendingInvites) {
          io.to(invite.receiverId.toString()).emit('live_db_update');
        }
        await Group.findByIdAndDelete(userInGroup._id);
        await GroupInvitation.deleteMany({ groupId: userInGroup._id });
        await Task.updateMany({ groupId: userInGroup._id }, { groupId: null, memberStatuses: [] });
      } else {
        
        const userIdStr = req.user.id.toString();
        const isOldGroupAdmin = userInGroup.admins.length === 0 || userInGroup.creatorId.toString() === userIdStr;

        if (isOldGroupAdmin && userInGroup.admins.length === 0) {
          
          const nextAdmin = userInGroup.members[0];
          userInGroup.admins = [nextAdmin];
          userInGroup.creatorId = nextAdmin;
          
          
          const memberUser = await User.findById(nextAdmin);
          if (memberUser) {
            await createAcademicNotification(nextAdmin, 'group', `Admin Promoted 👑`, `You are now the Admin of "${userInGroup.name}".`);
            if (typeof sendPush === 'function') sendPush(memberUser, `Admin Promoted 👑`, `You are now the Admin of "${userInGroup.name}".`);
            io.to(nextAdmin.toString()).emit('live_db_update');
          }
        } else if (userInGroup.creatorId.toString() === userIdStr) {
          
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

    
    group.members.push(req.user.id);
    await group.save();

    
    invite.status = 'accepted';
    await invite.save();

    const sender = await User.findById(req.user.id);
    await createGroupNotification(group._id, req.user.id, 'group', 'New Member Joined', `${sender?.name || 'A user'} accepted the invitation and joined the group.`);

    
    const inviter = await User.findById(invite.senderId);
    if (inviter) {
      await createAcademicNotification(invite.senderId, 'group', `Invitation Accepted ✅`, `${sender?.name || 'A user'} accepted your invite to "${group.name}".`);
      if (typeof sendPush === 'function') sendPush(inviter, `Invitation Accepted ✅`, `${sender?.name || 'A user'} accepted your invite to "${group.name}".`);
      io.to(invite.senderId.toString()).emit('live_db_update');
    }

    
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

    
    await Task.updateMany(
      { groupId: group._id },
      { $pull: { deletedByUsers: memberId, memberStatuses: { userId: memberId } } }
    );
    await broadcastLiveUpdate(group._id, req.user.id);
    
    
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
app.get('/api/admin/users/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const activeSyncingUsers = await User.countDocuments({ isPortalConnected: true });
    const webUsers = await User.countDocuments({ isPortalConnected: true });
    const mobileUsers = await User.countDocuments({ accessedMobile: true });
    const extensionUsers = await User.countDocuments({ accessedExtension: true });
    res.json({ totalUsers, activeSyncingUsers, webUsers, mobileUsers, extensionUsers });
  } catch (error) {
    console.error("Admin Fetch Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const isCompact = req.query.compact === 'true' || req.query.all === 'true';
    const portalConnected = req.query.portalConnected === 'true';
    const hasPushTokens = req.query.hasPushTokens === 'true';
    const searchQuery = req.query.search || '';

    const filter = {};
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { secondaryEmail: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    if (portalConnected) {
      filter.isPortalConnected = true;
      filter.ucpCookie = { $ne: null };
    }
    if (hasPushTokens) {
      filter.pushTokens = { $exists: true, $not: { $size: 0 } };
    }

    if (isCompact) {
      const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
      const usersWithStorage = users.map((user) => {
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
          isLeaderboardEnabled: user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
            ? true
            : (user.isLeaderboardEnabled !== false),
          isPortalConnected: user.isPortalConnected,
          portalId: user.portalId,
          lastSyncAt: user.lastSyncAt,
          ucpCookie: user.ucpCookie ? true : false,
          createdAt: user.createdAt,
          secondaryEmail: user.secondaryEmail,
          dob: user.dob,
          gender: user.gender,
          faculty: user.faculty,
          careerType: user.careerType,
          program: user.program,
          currentSemester: user.currentSemester,
          academicOrdinalSemester: user.academicOrdinalSemester,
          syncStatus: user.syncStatus,
          accessedWeb: user.accessedWeb || false,
          accessedMobile: user.accessedMobile || false,
          accessedExtension: user.accessedExtension || false,
          storageUsed: 15360
        };
      });
      return res.json(usersWithStorage);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ isAdmin: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const modelsToMeasure = [
      { model: Task, field: 'userId' },
      { model: Note, field: 'user' },
      { model: Keynote, field: 'userId' },
      { model: Transaction, field: 'userId' },
      { model: Habit, field: 'userId' },
      { model: Timetable, field: 'userId' },
      { model: Grade, field: 'userId' }
    ];

    const storageMap = {};
    for (const user of users) {
      storageMap[user._id.toString()] = 15360;
    }

    const userIds = users.map(u => u._id);
    await Promise.all(modelsToMeasure.map(async ({ model, field }) => {
      try {
        const results = await model.aggregate([
          { $match: { [field]: { $in: userIds } } },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } }
        ]);
        for (const row of results) {
          if (row._id) {
            const uid = row._id.toString();
            if (storageMap[uid] !== undefined) {
              storageMap[uid] += row.count * 300; // 300 bytes per document estimate
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }));

    const usersWithStorage = users.map((user) => {
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
        isLeaderboardEnabled: user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ? true
          : (user.isLeaderboardEnabled !== false),
        isPortalConnected: user.isPortalConnected,
        portalId: user.portalId,
        lastSyncAt: user.lastSyncAt,
        ucpCookie: user.ucpCookie ? true : false,
        createdAt: user.createdAt,
        secondaryEmail: user.secondaryEmail,
        dob: user.dob,
        gender: user.gender,
        faculty: user.faculty,
        careerType: user.careerType,
        program: user.program,
        currentSemester: user.currentSemester,
        academicOrdinalSemester: user.academicOrdinalSemester,
        syncStatus: user.syncStatus,
        accessedWeb: user.accessedWeb || false,
        accessedMobile: user.accessedMobile || false,
        accessedExtension: user.accessedExtension || false,
        storageUsed: storageMap[user._id.toString()] || 15360
      };
    });

    // Super Admin strictly first, then admins, then others by creation date
    usersWithStorage.sort((a, b) => {
      const aIsSuper = a.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const bIsSuper = b.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return 0;
    });

    res.json({
      users: usersWithStorage,
      totalUsers,
      page,
      pages: Math.ceil(totalUsers / limit)
    });
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

    
    const currentVal = (targetUser.isLeaderboardEnabled !== false);

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
    const userGroups = await Group.find({ members: req.user.id }).lean().select('_id');
    const groupIds = userGroups.map(g => g._id);

    const notes = await Note.find({
      $or: [
        { user: req.user.id, groupId: null, isDeleted: false }, 
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } 
      ]
    })
    .populate('user', 'name email profilePic')
    .populate('sender', 'name profilePic') 
    .sort({ createdAt: -1 })
    .lean();

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
      
      note.isDeleted = true;
      note.deletedAt = new Date();
    } else if (note.groupId) {
      
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
    const code = await createOtp(user.email);
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
    if (!(await verifyOtp(user.email, req.body.otp))) return res.status(400).json({ message: "Invalid OTP" });
    user.adminPin = req.body.newPin; await user.save(); await consumeOtp(user.email);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});


app.put('/api/admin/users/:id/block', auth, adminAuth, async (req, res) => {
  try {
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
    const requestingUser = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ message: 'Super Admin cannot be blocked.' });
    }
    
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


app.get('/api/admin/notifications', auth, adminAuth, async (req, res) => {
  try {
    const records = await AdminNotification.find().sort({ createdAt: -1 }).limit(100);
    res.json(records);
  } catch (error) { res.status(500).json({ message: error.message }); }
});


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


app.get('/api/admin/b2-files', auth, adminAuth, async (req, res) => {
  try {
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      MaxKeys: 1000
    });
    const response = await b2.send(command);
    const files = response.Contents || [];
    res.json(files.map(f => ({
      key: f.Key,
      lastModified: f.LastModified,
      size: f.Size,
      etag: f.ETag
    })));
  } catch (error) {
    console.error('[ADMIN B2 LIST ERROR]', error);
    res.status(500).json({ message: error.message });
  }
});


app.delete('/api/admin/b2-files', auth, adminAuth, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ message: 'File key is required.' });

    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: B2_BUCKET,
      Key: key
    });
    await b2.send(command);

    
    await CourseMaterial.deleteMany({ b2Key: key });
    await CourseVaultFile.deleteMany({ b2Key: key });

    res.json({ success: true, message: 'File deleted from B2 and references removed.' });
  } catch (error) {
    console.error('[ADMIN B2 DELETE ERROR]', error);
    res.status(500).json({ message: error.message });
  }
});


app.post('/api/admin/trigger-processor', auth, adminAuth, async (req, res) => {
  try {
    const { userId, type } = req.body; 

    if (type === 'single_user_process') {
      if (!userId) return res.status(400).json({ message: 'User ID is required for single user processing.' });
      
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      if (!user.ucpCookie) return res.status(400).json({ message: 'User has no saved UCP Cookie.' });

      const result = await processUserMaterials(user._id.toString(), user.ucpCookie);
      
      if (result && result.sessionExpired) {
        return res.status(400).json({ message: 'Session expired or cookie is invalid.' });
      }

      if (result && !result.success) {
        return res.status(500).json({ message: result.error || 'Failed to process materials.' });
      }

      return res.json({ success: true, message: `Material processing completed successfully for ${user.name || user.email}.` });

    } else if (type === 'single_user_nightly') {
      if (!userId) return res.status(400).json({ message: 'User ID is required.' });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      if (!user.ucpCookie) return res.status(400).json({ message: 'User has no saved UCP Cookie.' });

      
      (async () => {
        const cheerio = require('cheerio');
        const courses = await Course.find({ userId: user._id, type: 'university', portalUrl: { $exists: true, $ne: '' } }).lean();
        console.log(`[MANUAL_NIGHTLY] Crawling ${courses.length} courses for ${user.email}`);
        
        for (const course of courses) {
          
          if (course.creditHours === 0) {
            console.log(`[MANUAL_NIGHTLY] Skipping 0 credit hour course material: ${course.code}`);
            continue;
          }

          const courseId = course.portalUrl.split('/').pop();
          if (!courseId) continue;

          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(`https://horizon.ucp.edu.pk/student/course/material/${courseId}`, {
              headers: { 'Cookie': user.ucpCookie, 'User-Agent': 'Mozilla/5.0' },
              signal: controller.signal
            });
            clearTimeout(tid);

            if (!res.ok) continue;
            const html = await res.text();
            if (html.includes('/login')) {
              console.warn(`[MANUAL_NIGHTLY] Session expired for ${user.email}`);
              break;
            }

            const $ = cheerio.load(html);
            const links = [];
            $('table tbody tr').each((_, row) => {
              const tds = $(row).find('td');
              if (tds.length >= 4) {
                const fileName = $(tds[1]).text().replace(/\s+/g, ' ').trim();
                const description = $(tds[2]).text().replace(/\s+/g, ' ').trim();
                const href = $(tds[3]).find('a').attr('href') || '';
                if (href.includes('/student/class/material/download/')) {
                  const fullUrl = href.startsWith('http') ? href : `https://horizon.ucp.edu.pk${href}`;
                  links.push({ fileName, description, downloadUrl: fullUrl, token: href.split('/').pop() });
                }
              }
            });

            const isProcessed = links.length === 0;
            await MaterialLink.findOneAndUpdate(
              { userId: user._id, courseUrl: course.portalUrl },
              {
                $set: {
                  courseName: course.name, courseCode: course.code,
                  sectionCode: course.section, teacherName: (course.instructors || [])[0] || '',
                  links, lastScrapedAt: new Date(), processed: isProcessed
                }
              },
              { upsert: true }
            );
          } catch (e) {
            console.warn(`[MANUAL_NIGHTLY] Failed course ${course.code}:`, e.message);
          }
        }
        
        await processUserMaterials(user._id.toString(), user.ucpCookie);
      })().catch(err => console.error(`[MANUAL_NIGHTLY] Async crawl failed for ${user.email}:`, err.message));

      return res.json({ success: true, message: `Full material sync and processing triggered for ${user.name || user.email}.` });

    } else if (type === 'nightly_sync_all') {
      runNightlyMaterialSync(User, Course)
        .catch(err => console.error('[MANUAL_NIGHTLY_ALL] Nightly sync failed:', err.message));

      return res.json({ success: true, message: 'Nightly sync triggered for all connected users.' });

    } else {
      return res.status(400).json({ message: 'Invalid sync type specified.' });
    }
  } catch (error) {
    console.error('[ADMIN TRIGGER PROCESSOR ERROR]', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/courses', auth, async (req, res) => {
  try {
    if (!(await Course.findOne({ userId: req.user.id, name: 'General Course' }).lean())) await new Course({ userId: req.user.id, name: 'General Course', type: 'general' }).save();
    res.json(await Course.find({ userId: req.user.id }).sort({ createdAt: 1 }).lean());
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
    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ message: "Email must be a string." });
    }
    if (await User.findOne({ email })) return res.status(400).json({ message: "Registered" });
    const code = await createOtp(email);
    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: email,
      subject: 'Welcome to MyPortal',
      html: generateEmailTemplate('Welcome to MyPortal', code, 'Please use the following verification code to complete your registration.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || (typeof otp !== 'string' && typeof otp !== 'number')) {
      return res.status(400).json({ message: "Invalid input types." });
    }
    if (!(await verifyOtp(email, otp))) return res.status(400).json({ message: "Invalid OTP" });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Exists' });
    const user = new User({ name, email, password: await bcrypt.hash(password, await bcrypt.genSalt(10)), isAdmin: email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() });
    await user.save(); await consumeOtp(email);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d', algorithm: JWT_ALG });
    await registerDeviceSession(user.id, token, req, resend);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password must be strings.' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });
    if (user.isBlocked) return res.status(503).json({ message: 'Network Error: Timeout communicating with identity provider.' });

    if (!user.accessedMobile) {
      user.accessedMobile = true;
      await user.save();
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d', algorithm: JWT_ALG });
    await registerDeviceSession(user.id, token, req, resend);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isPortalConnected: user.isPortalConnected } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let changed = false;
    const origin = req.headers.origin || req.headers.referer || '';
    const ua = req.headers['user-agent'] || '';

    
    if (!user.accessedWeb) {
      if (origin.includes('web.myportalucp.online') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        user.accessedWeb = true;
        changed = true;
      }
    }

    
    if (!user.accessedMobile) {
      const isMobileUA = ua.includes('okhttp') || ua.includes('Expo') || ua.includes('React-Native') || ua.includes('Darwin') || ua.includes('Android');
      if (isMobileUA || (user.pushTokens && user.pushTokens.length > 0)) {
        user.accessedMobile = true;
        changed = true;
      }
    }

    if (changed) {
      await user.save();
    }

    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (error) {
    console.error('[AUTH_USER] Error:', error);
    res.status(500).json({ message: "Error" });
  }
});

app.get('/api/security/sessions', auth, async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    const currentSignature = token ? (token.split('.')[2] || '') : '';

    const sessions = await DeviceSession.find({ userId: req.user.id, isActive: true })
      .sort({ lastActiveAt: -1 })
      .lean();

    const formatted = sessions.map(s => ({
      id: s._id,
      deviceType: s.deviceType,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      location: s.location,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s.tokenSignature === currentSignature
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/security/sessions/:id', auth, async (req, res) => {
  try {
    const session = await DeviceSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    session.isActive = false;
    await session.save();

    // Terminate socket connection remotely
    io.to(session.tokenSignature).emit('session_revoked', { message: 'This device has been logged out remotely.' });

    res.json({ success: true, message: 'Device logged out successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/security/logout', auth, async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    const currentSignature = token ? (token.split('.')[2] || '') : '';
    if (currentSignature) {
      await DeviceSession.updateOne({ userId: req.user.id, tokenSignature: currentSignature }, { isActive: false });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/security/sessions/bulk-revoke', auth, async (req, res) => {
  try {
    const { sessionIds } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ message: 'Session IDs must be a non-empty array.' });
    }

    const sessions = await DeviceSession.find({
      _id: { $in: sessionIds },
      userId: req.user.id
    });

    for (const session of sessions) {
      session.isActive = false;
      await session.save();
      io.to(session.tokenSignature).emit('session_revoked', { message: 'This device has been logged out remotely.' });
    }

    res.json({ success: true, message: `${sessions.length} devices logged out successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/admin/security/sessions', auth, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: 'Access Denied: Admins only.' });
    }

    const sessions = await DeviceSession.find({ isActive: true })
      .populate('userId', 'name email profilePic')
      .sort({ lastActiveAt: -1 })
      .lean();

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/admin/security/sessions/:id', auth, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id);
    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: 'Access Denied: Admins only.' });
    }

    const session = await DeviceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    session.isActive = false;
    await session.save();

    // Terminate socket connection remotely
    io.to(session.tokenSignature).emit('session_revoked', { message: 'Your session has been terminated by an administrator.' });

    res.json({ success: true, message: 'Device session terminated.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    
    const userGroups = await Group.find({ members: userId }).lean().select('_id');
    const groupIds = userGroups.map(g => g._id);

    const [
      user,
      tasks,
      notes,
      keynotes,
      notifications,
      binTasks,
      binTransactions,
      binHabits,
      binNotes,
      binKeynotes,
      courses,
      exams,
      group,
      invitations
    ] = await Promise.all([
      User.findById(userId).select('-password').lean(),

      Task.find({
        $or: [
          { userId, groupId: null, isDeleted: false },
          { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: userId } }
        ]
      })
      .populate('userId', 'name email profilePic')
      .sort({ createdAt: -1 })
      .lean(),

      Note.find({
        $or: [
          { user: userId, groupId: null, isDeleted: false },
          { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: userId } }
        ]
      })
      .populate('user', 'name email profilePic')
      .populate('sender', 'name profilePic')
      .sort({ createdAt: -1 })
      .lean(),

      Keynote.find({ userId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean(),

      Notification.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),

      Task.find({
        $or: [
          { userId, isDeleted: true },
          { groupId: { $in: groupIds }, deletedByUsers: userId }
        ]
      }).populate('userId', 'name email profilePic').lean(),

      Transaction.find({ userId, isDeleted: true }).lean(),

      Habit.find({ userId, isDeleted: true }).lean(),

      Note.find({
        $or: [
          { user: userId, isDeleted: true },
          { groupId: { $in: groupIds }, deletedByUsers: userId }
        ]
      }).populate('user', 'name email profilePic').lean(),

      Keynote.find({ userId, isDeleted: true }).lean(),

      Course.find({ userId }).sort({ createdAt: 1 }).lean(),

      Exam.find({ userId }).sort({ date: 1 }).lean(),

      Group.findOne({ members: userId })
        .populate('members', 'name email profilePic customProfilePic portalId createdAt')
        .populate('creatorId', 'name email profilePic customProfilePic portalId createdAt')
        .lean(),

      GroupInvitation.find({ receiverId: userId, status: 'pending' })
        .populate('senderId', 'name email profilePic')
        .populate('groupId', 'name')
        .lean()
    ]);

    
    const localizedTasks = tasks.map(task => {
      const taskObj = { ...task };
      if (taskObj.groupId) {
        const personalStatusOverride = taskObj.memberStatuses?.find(ms => ms.userId.toString() === userId);
        if (personalStatusOverride) {
          taskObj.status = personalStatusOverride.status;
        }
      }
      return taskObj;
    });

    
    let finalCourses = courses;
    if (courses.length === 0) {
      const generalCourse = new Course({ userId, name: 'General Course', type: 'general' });
      await generalCourse.save();
      finalCourses = [generalCourse.toObject()];
    }

    res.json({
      user,
      tasks: localizedTasks,
      notes,
      keynotes,
      notifications,
      bin: {
        tasks: binTasks,
        transactions: binTransactions,
        habits: binHabits,
        notes: binNotes,
        keynotes: binKeynotes
      },
      courses: finalCourses,
      exams,
      group,
      invitations
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.post('/api/auth/check-admin', async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ error: "Email must be a string." });
    }
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    res.json({ isAdmin: !!user?.isAdmin });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/auth/check-block-status', async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ error: "Email must be a string." });
    }
    if (!email) return res.status(400).json({ error: "Email required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && user.isBlocked) {
      return res.status(503).json({ error: 'Network Error: Timeout communicating with identity provider.', isBlocked: true });
    }
    res.json({ isBlocked: false });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});



const updateProfileFields = (user, body) => {
  const fields = [
    'secondaryEmail', 'dob', 'gender',
    'faculty', 'careerType', 'program'
  ];

  let hasChanges = false;
  const logDetails = {};

  for (const field of fields) {
    let bodyKey = field;
    if (body[field] === undefined) {
      const lowerField = field.toLowerCase();
      const matchKey = Object.keys(body).find(k => k.toLowerCase() === lowerField);
      if (matchKey) bodyKey = matchKey;
    }

    const incomingValue = body[bodyKey] !== undefined ? String(body[bodyKey]).trim() : undefined;
    const existingValue = user[field] ? String(user[field]).trim() : '';

    if (incomingValue === undefined || incomingValue === '') {
      logDetails[field] = { status: 'SKIPPED_EMPTY' };
      continue;
    }

    if (incomingValue !== existingValue) {
      console.log(`[PROFILE_SYNC] 🔄 Field '${field}' changed: "${existingValue}" -> "${incomingValue}"`);
      user[field] = incomingValue;
      hasChanges = true;
      logDetails[field] = { status: 'REPLACED', old: existingValue, new: incomingValue };
    } else {
      logDetails[field] = { status: 'SKIPPED_MATCH' };
    }
  }

  // Handle currentSemester (term code) and academicOrdinalSemester (e.g. 6th Semester) separately
  const rawCurrentSemester = body.currentSemester || body.currentsemester;
  if (rawCurrentSemester !== undefined && String(rawCurrentSemester).trim() !== '') {
    const incomingOrdinal = String(rawCurrentSemester).trim();
    const existingOrdinal = user.academicOrdinalSemester ? String(user.academicOrdinalSemester).trim() : '';
    if (incomingOrdinal !== existingOrdinal) {
      console.log(`[PROFILE_SYNC] 🔄 Field 'academicOrdinalSemester' changed: "${existingOrdinal}" -> "${incomingOrdinal}"`);
      user.academicOrdinalSemester = incomingOrdinal;
      hasChanges = true;
      logDetails['academicOrdinalSemester'] = { status: 'REPLACED', old: existingOrdinal, new: incomingOrdinal };
    }
  }

  // Set user.currentSemester to the parsed term code (like Spring 2026)
  const { getCurrentSemesterCode, parseSemesterFromCourseCode } = require('./services/scraperEngine');
  let incomingTerm = (body.semester || '').trim();

  // Detect term from courseMap in request body if not explicitly provided
  if (!incomingTerm) {
    const courseMap = body.courseMap;
    if (courseMap && typeof courseMap === 'object') {
      const semesters = [];
      for (const info of Object.values(courseMap)) {
        if (info.code) {
          const sem = parseSemesterFromCourseCode(info.code);
          if (sem) semesters.push(sem);
        }
      }
      if (semesters.length > 0) {
        const freq = {};
        semesters.forEach(s => freq[s] = (freq[s] || 0) + 1);
        const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
        incomingTerm = sorted[0];
      }
    }
  }

  // Fallback to getCurrentSemesterCode ONLY if user has no semester set in DB yet
  if (!incomingTerm && (!user.currentSemester || String(user.currentSemester).trim() === '')) {
    incomingTerm = getCurrentSemesterCode();
  }

  if (incomingTerm) {
    const existingTerm = user.currentSemester ? String(user.currentSemester).trim() : '';
    if (incomingTerm !== existingTerm) {
      console.log(`[PROFILE_SYNC] 🔄 Field 'currentSemester' changed: "${existingTerm}" -> "${incomingTerm}"`);
      user.currentSemester = incomingTerm;
      hasChanges = true;
      logDetails['currentSemester'] = { status: 'REPLACED', old: existingTerm, new: incomingTerm };
    }
  }

  console.log(`[PROFILE_SYNC] Summary for user ${user.email || user._id}:`, JSON.stringify(logDetails, null, 2));
  return hasChanges;
};


const updateUserCurrentSemester = async (userId) => {
  try {
    const User = mongoose.model('User');
    const Course = mongoose.model('Course');
    const ResultHistory = mongoose.model('ResultHistory');

    const user = await User.findById(userId);
    if (!user) return;

    const courses = await Course.find({ userId, type: 'university' }).lean();
    const history = await ResultHistory.find({ userId }).lean();

    const historyTerms = new Set(history.map(h => normalizeSemesterTerm(h.term).toLowerCase()));

    // Find semesters of courses that are NOT in results history
    const activeSemesters = [];
    for (const c of courses) {
      if (c.semester) {
        const semTrim = c.semester.trim();
        if (!historyTerms.has(normalizeSemesterTerm(semTrim).toLowerCase())) {
          activeSemesters.push(semTrim);
        }
      }
    }

    if (activeSemesters.length > 0) {
      // Find the most frequent active semester (in case of multiple)
      const freq = {};
      activeSemesters.forEach(s => freq[s] = (freq[s] || 0) + 1);
      const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
      const detectedCurrent = sorted[0];

      if (user.currentSemester !== detectedCurrent) {
        console.log(`[SEMESTER_DETECTOR] 🔄 Updating currentSemester to detected active term: "${user.currentSemester || ''}" -> "${detectedCurrent}"`);
        user.currentSemester = detectedCurrent;
        await user.save();
      }
    } else {
      // If all semesters of courses exist in ResultHistory, it means all synced semesters are completed/past.
      // In that case, let's set currentSemester to the newest semester from courses.
      const courseSemesters = Array.from(new Set(courses.map(c => c.semester).filter(Boolean)));
      if (courseSemesters.length > 0) {
        const sortedHistory = sortSemestersJS(courseSemesters.map(s => ({ term: s })), 'desc');
        if (sortedHistory.length > 0) {
          const newestSem = sortedHistory[0].term;
          if (user.currentSemester !== newestSem) {
            console.log(`[SEMESTER_DETECTOR] 🔄 All semesters completed. Setting currentSemester to newest: "${user.currentSemester || ''}" -> "${newestSem}"`);
            user.currentSemester = newestSem;
            await user.save();
          }
        }
      }
    }
  } catch (err) {
    console.error(`[SEMESTER_DETECTOR] ❌ Error updating current active semester for user ${userId}:`, err.message);
  }
};





app.post('/api/auth/microsoft-login', async (req, res) => {
  try {
    const { rollNumber, name, profilePic, ucpCookie, tempSyncId } = req.body;

    if (typeof rollNumber !== 'string') {
      return res.status(400).json({ error: 'Roll number must be a string.' });
    }
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'Name must be a string.' });
    }
    if (profilePic !== undefined && typeof profilePic !== 'string') {
      return res.status(400).json({ error: 'Profile pic must be a string.' });
    }
    if (ucpCookie !== undefined && typeof ucpCookie !== 'string') {
      return res.status(400).json({ error: 'UCP cookie must be a string.' });
    }
    if (tempSyncId !== undefined && typeof tempSyncId !== 'string') {
      return res.status(400).json({ error: 'Temp sync ID must be a string.' });
    }

    if (!rollNumber) {
      return res.status(400).json({ error: 'Roll number not detected from portal.' });
    }

    const formattedRoll = rollNumber.toLowerCase().trim();
    const email = `${formattedRoll}@ucp.edu.pk`;

    // Resolve the onboarding sync id: prefer the one the extension read from the URL; otherwise fall
    // back to a pending registration brokered by the web session for this email (covers the case
    // where the Horizon/SSO redirect stripped the URL fragment). Single-use.
    let effectiveSyncId = tempSyncId || null;
    if (!effectiveSyncId) {
      try {
        const pending = await PendingSync.findOneAndDelete({ email });
        if (pending && pending.tempSyncId) {
          effectiveSyncId = pending.tempSyncId;
        }
      } catch (brokerErr) {
        console.warn('[MS-LOGIN] Pending sync lookup failed:', brokerErr.message);
      }
    }

    let user = await User.findOne({ email });

    if (user && user.isBlocked) {
      return res.status(503).json({ error: 'Network Error: Timeout communicating with identity provider.' });
    }

    // Strict validation: new registrations must have profile picture fetched from Horizon portal
    if (!user && (!profilePic || !profilePic.includes('base64'))) {
      return res.status(400).json({ error: 'Profile picture must be fetched from the horizon portal to register.' });
    }

    let finalProfilePicUrl = user ? user.profilePic : null;
    let shouldUploadPic = false;
    let base64Data = null;

    if (profilePic && profilePic.includes('base64')) {
      shouldUploadPic = true;
      base64Data = profilePic;
    }

    let isNewUser = false;

    if (user) {
      user.ucpCookie = ucpCookie;
      if (ucpCookie) {
        user.ucpCookieEncrypted = encrypt(ucpCookie);
        user.ucpCookieUpdatedAt = new Date();
      }
      user.isPortalConnected = true;
      user.name = name && name !== 'UCP Student' ? name : user.name;
      if (effectiveSyncId) {
        user.tempSyncId = effectiveSyncId;
        user.syncStatus = 'scraping'; // extension connected; importing data
      }
      // Platform connection detection
      const ua = req.headers['user-agent'] || '';
      const origin = req.headers.origin || req.headers.referer || '';
      const isMobile = ua.includes('okhttp') || ua.includes('Expo') || ua.includes('React-Native') || ua.includes('Darwin') || ua.includes('Android') || !!req.body.dob || !!req.body.faculty || !!req.body.program;
      const isExtension = origin.startsWith('chrome-extension://') || (!isMobile && (ua.includes('Chrome') || !!effectiveSyncId));
      if (isExtension) {
        user.accessedExtension = true;
      } else if (isMobile) {
        user.accessedMobile = true;
      }
      if (finalProfilePicUrl) {
        user.portalProfilePic = finalProfilePicUrl;
        if (!user.originalPortalProfilePic) {
          user.originalPortalProfilePic = finalProfilePicUrl;
        }
        if (user.showProfilePicToCommunity === true && !user.customProfilePic) {
          user.profilePic = finalProfilePicUrl;
        }
      }
      updateProfileFields(user, req.body);
      await user.save();
    } else {
      isNewUser = true;
      // Platform connection detection
      const ua = req.headers['user-agent'] || '';
      const origin = req.headers.origin || req.headers.referer || '';
      const isMobile = ua.includes('okhttp') || ua.includes('Expo') || ua.includes('React-Native') || ua.includes('Darwin') || ua.includes('Android') || !!req.body.dob || !!req.body.faculty || !!req.body.program;
      const isExtension = origin.startsWith('chrome-extension://') || (!isMobile && (ua.includes('Chrome') || !!effectiveSyncId));

      user = new User({
        name: name || formattedRoll.toUpperCase(),
        email: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10),
        isPortalConnected: true,
        ucpCookie: ucpCookie,
        ucpCookieEncrypted: ucpCookie ? encrypt(ucpCookie) : null,
        ucpCookieUpdatedAt: ucpCookie ? new Date() : null,
        portalProfilePic: finalProfilePicUrl,
        originalPortalProfilePic: finalProfilePicUrl,
        tempSyncId: effectiveSyncId || null,
        syncStatus: effectiveSyncId ? 'scraping' : null,
        accessedExtension: isExtension,
        accessedMobile: isMobile
      });
      updateProfileFields(user, req.body);
      await user.save();
    }

    if (shouldUploadPic && base64Data) {
      const userId = user._id;
      try {
        if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
          console.warn(`[CLOUDINARY] Warning: Cloudinary is not configured. Skipping profile pic upload for user ${userId}.`);
        } else {
          cloudinary.uploader.upload(base64Data, {
            folder: 'myportal/avatars',
            public_id: `portal_profile_${formattedRoll}_${Date.now()}`,
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
          }).then(async (uploadResponse) => {
            const url = uploadResponse.secure_url;
            const userToUpdate = await User.findById(userId);
            if (userToUpdate) {
              userToUpdate.portalProfilePic = url;
              if (!userToUpdate.originalPortalProfilePic) {
                userToUpdate.originalPortalProfilePic = url;
              }
              if (userToUpdate.showProfilePicToCommunity === true && !userToUpdate.customProfilePic) {
                userToUpdate.profilePic = url;
              }
              await userToUpdate.save();
              console.log(`[CLOUDINARY] Background upload success for ${userToUpdate.email}`);
            }
          }).catch(err => {
            console.error('[CLOUDINARY SAVE ERROR] (Background):', err.message || err);
          });
        }
      } catch (uploadErr) {
        console.error('[CLOUDINARY UPLOAD INITIATION ERROR]:', uploadErr.message || uploadErr);
      }
    }

    if (ucpCookie) {
      setTimeout(() => {
        processUserMaterials(user._id.toString(), ucpCookie)
          .catch(err => console.error(`[MICROSOFT_LOGIN_PROC] Async processing failed:`, err.message));
      }, 500);
    }

    const payload = { id: user.id };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }, async (err, token) => {
      if (err) throw err;
      await registerDeviceSession(user.id, token, req, resend);
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
    console.error('[MICROSOFT LOGIN ERROR]:', err.stack || err.message || err);
    res.status(500).send('Server Error');
  }
});
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== 'string') {
      return res.status(400).json({ message: "Email must be a string." });
    }
    if (!(await User.findOne({ email }))) return res.status(400).json({ message: "No account found" });
    const code = await createOtp(email);
    await resend.emails.send({
      from: 'MyPortal <otp@myportalucp.online>',
      to: email,
      subject: 'Password Reset',
      html: generateEmailTemplate('Password Reset', code, 'You requested a password reset. Use the code below to securely change your password.')
    });
    res.json({ message: "OTP sent" });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (typeof email !== 'string' || (typeof otp !== 'string' && typeof otp !== 'number') || typeof newPassword !== 'string') {
      return res.status(400).json({ message: "Invalid input types." });
    }
    if (!(await verifyOtp(email, otp))) return res.status(400).json({ message: "Invalid OTP" });
    const user = await User.findOne({ email });
    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save(); await consumeOtp(email);
    res.json({ message: "Password updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
app.get('/api/ping', (req, res) => res.json({ status: "alive", time: new Date() }));



app.post(['/api/user/profile-pic', '/user/profile-pic', '/api/profile-pic'], auth, profilePicUpload.single('profilePic'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    
    const fileUrl = req.file.path;

    console.log(`📸 [PROFILE] Successful Cloudinary upload for user ${req.user.id}. URL: ${fileUrl}`);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.customProfilePic = fileUrl;
    if (user.showProfilePicToCommunity === true) {
      user.profilePic = fileUrl;
    } else {
      user.profilePic = null;
    }

    await user.save();
    const freshUser = await User.findById(req.user.id).select('-password');
    res.json(freshUser);
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
    
    if (user.showProfilePicToCommunity === true) {
      user.profilePic = user.customProfilePic || user.portalProfilePic || user.originalPortalProfilePic || null;
    } else {
      user.profilePic = null;
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
      
      await User.updateMany(
        { _id: { $ne: user._id }, pushTokens: token },
        { $pull: { pushTokens: token } }
      );

      
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
app.get('/api/user/portal-status', auth, async (req, res) => { try { const user = await User.findById(req.user.id).select('portalId isPortalConnected').lean(); res.json({ isConnected: !!user?.portalId && user?.isPortalConnected, portalId: user?.portalId }); } catch (error) { res.status(500).json({ message: "Error" }); } });

app.get('/api/timetable', auth, async (req, res) => {
  try {
    const now = new Date();
    const query = { userId: req.user.id, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] };
    if (req.query.semester) {
      query.semester = req.query.semester;
    }
    const items = await Timetable.find(query).lean();
    res.json(items.map(i => ({ ...i, id: i._id })));
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});
app.get('/api/student-stats', auth, async (req, res) => { try { res.json(await StudentStats.findOne({ userId: req.user.id }).lean() || { cgpa: "0.00", credits: "0", inprogressCr: "0" }); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/grades', auth, async (req, res) => { try { res.json(await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 }).lean()); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.get('/api/results-history', auth, async (req, res) => { try { const raw = await ResultHistory.find({ userId: req.user.id }).lean(); res.json(sortSemestersJS(raw, 'desc')); } catch (error) { res.status(500).json({ message: "Error" }); } });

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

app.post('/api/admin/fix-result-history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || (!user.isAdmin && user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase())) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const VALID_TERM_REGEX = /^(Spring|Summer|Fall)\s+\d{4}$/i;
    const allResults = await ResultHistory.find({});
    let deletedCount = 0;
    let dedupCount = 0;

    const resultsByUserId = {};
    for (const rh of allResults) {
      if (!VALID_TERM_REGEX.test(rh.term || "")) {
        await ResultHistory.deleteOne({ _id: rh._id });
        deletedCount++;
        continue;
      }
      const uidStr = rh.userId.toString();
      if (!resultsByUserId[uidStr]) {
        resultsByUserId[uidStr] = [];
      }
      resultsByUserId[uidStr].push(rh);
    }

    for (const uidStr in resultsByUserId) {
      const userRhs = resultsByUserId[uidStr];
      const termsSeen = {};
      for (const rh of userRhs) {
        const termKey = (rh.term || "").trim().toLowerCase();
        if (termsSeen[termKey]) {
          const existing = termsSeen[termKey];
          const existingCourses = existing.courses?.length || 0;
          const currentCourses = rh.courses?.length || 0;
          if (currentCourses >= existingCourses) {
            await ResultHistory.deleteOne({ _id: existing._id });
            termsSeen[termKey] = rh;
          } else {
            await ResultHistory.deleteOne({ _id: rh._id });
          }
          dedupCount++;
        } else {
          termsSeen[termKey] = rh;
        }
      }
    }

    res.json({ success: true, deletedInvalidCount: deletedCount, deduplicatedCount: dedupCount });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/api/semester-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isSemesterCompleted lastCompletedSemester').lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let latestResult = null;
    let previousResult = null;

    if (user.lastCompletedSemester) {
      const normalizedLastSem = normalizeSemesterTerm(user.lastCompletedSemester);
      const allResults = await ResultHistory.find({ userId: req.user.id }).lean();
      latestResult = allResults.find(r => normalizeSemesterTerm(r.term).toLowerCase() === normalizedLastSem.toLowerCase()) || null;
      const sorted = sortSemestersJS(allResults, 'desc');
      const idx = sorted.findIndex(r => normalizeSemesterTerm(r.term).toLowerCase() === normalizedLastSem.toLowerCase());
      if (idx !== -1 && idx + 1 < sorted.length) {
        previousResult = sorted[idx + 1];
      }
    }

    res.json({
      isSemesterCompleted: user.isSemesterCompleted,
      lastCompletedSemester: user.lastCompletedSemester,
      latestResult,
      previousResult
    });
  } catch (error) {
    console.error("Error in GET /api/semester-status:", error);
    res.status(500).json({ message: "Error" });
  }
});

app.post('/api/semester-status/acknowledge', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isSemesterCompleted: false });
    res.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/semester-status/acknowledge:", error);
    res.status(500).json({ message: "Error" });
  }
});

app.delete('/api/tasks/archived/clear', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('lastCompletedSemester').lean();
    if (!user || !user.lastCompletedSemester) {
      return res.status(400).json({ message: "No completed semester recorded to clear tasks for" });
    }

    const pastCourses = await Course.find({ userId: req.user.id, semester: user.lastCompletedSemester }).lean();
    const pastCourseNames = pastCourses.map(c => c.name);

    if (pastCourseNames.length === 0) {
      return res.json({ success: true, deletedCount: 0, message: "No courses found for completed semester" });
    }

    const deleteResult = await Task.deleteMany({
      userId: req.user.id,
      course: { $in: pastCourseNames, $ne: 'General' }
    });

    res.json({ success: true, deletedCount: deleteResult.deletedCount });
  } catch (error) {
    console.error("Error in DELETE /api/tasks/archived/clear:", error);
    res.status(500).json({ message: "Error clearing archived tasks" });
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

    const [attendance, announcements, submissions, grades, timetable, syncLogs, courses, studentStats, userInfo, courseMaterials, materialLinks, datesheet] = await Promise.all([
      Attendance.find({ userId: targetUserId }),
      Announcement.find({ userId: targetUserId }),
      Submission.find({ userId: targetUserId }),
      Grade.find({ userId: targetUserId }),
      Timetable.find({ userId: targetUserId }),
      SyncLog.find({ userId: targetUserId }).sort({ startTime: -1 }).limit(20),
      Course.find({ userId: targetUserId }),
      StudentStats.findOne({ userId: targetUserId }),
      User.findById(targetUserId).select('-password'),
      CourseMaterial.find({ userId: targetUserId }),
      MaterialLink.find({ userId: targetUserId }),
      Exam.find({ userId: targetUserId })
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
      user: userInfo,
      courseMaterials,
      materialLinks,
      datesheet
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    res.status(500).json({ message: "Error fetching diagnostic data" });
  }
});

app.get('/api/focus-sessions', auth, async (req, res) => { try { res.json(await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 })); } catch (error) { res.status(500).json({ message: "Error" }); } });
app.post('/api/focus-sessions', auth, async (req, res) => { try { res.json(await new FocusSession({ ...req.body, userId: req.user.id }).save()); } catch (error) { res.status(500).json({ message: "Error" }); } });




async function broadcastLiveUpdate(groupId, activeUserId) {
  
  io.to(activeUserId.toString()).emit('live_db_update');
  
  
  if (groupId) {
    const group = await Group.findById(groupId);
    if (group) {
      group.members.forEach(memberId => {
        io.to(memberId.toString()).emit('live_db_update');
      });
    }
  }
}




app.get('/api/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
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
      type, 
      title,
      message,
      link,
      isRead: false
    });
    await notification.save();
    
    
    io.to(userId.toString()).emit('live_db_update');
  } catch (error) {
    console.error("Failed to create academic notification", error);
  }
};








app.get('/api/tasks', auth, async (req, res) => {
  try {
    const userGroups = await Group.find({ members: req.user.id }).lean().select('_id');
    const groupIds = userGroups.map(g => g._id);

    const tasks = await Task.find({
      $or: [
        { userId: req.user.id, groupId: null, isDeleted: false }, 
        { groupId: { $in: groupIds }, isDeleted: false, deletedByUsers: { $ne: req.user.id } } 
      ]
    })
    .populate('userId', 'name email profilePic')
    .sort({ createdAt: -1 })
    .lean();

    
    const localizedTasks = tasks.map(task => {
      const taskObj = { ...task };
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
    
    else {
      
      const allowedKeys = ['status', 'acknowledged']; 
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


app.put('/api/tasks/:id/delete', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    
    const isCreator = task.userId.toString() === req.user.id;
    const oldGroupId = task.groupId;

    if (isCreator) {
      
      task.isDeleted = true;
      task.deletedAt = new Date();
    } else if (task.groupId) {
      
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
    
    
    const uniqueDays = [...new Set(habit.checkIns.map(d => new Date(d).setHours(0, 0, 0, 0)))].sort((a,b) => b - a);
    let streak = 0;
    let currentDate = new Date().setHours(0,0,0,0);
    if (uniqueDays[0] !== currentDate) currentDate -= 86400000;
    for (const day of uniqueDays) {
      if (day === currentDate) { streak++; currentDate -= 86400000; }
      else if (day < currentDate) break;
    }
    
    if (streak > habit.longestStreak) habit.longestStreak = streak;
    
    
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





app.get('/api/community/users', auth, async (req, res) => {
  try {
    
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
        
        const newNote = new Note({
          user: targetId,
          title: note.title,
          content: note.content,
          courseId: note.courseId,
          referenceFiles: note.referenceFiles,
          source: note.source,
          isPrivate: true, 
          groupId: null,
          isInbox: true,   
          sender: req.user.id
        });
        await newNote.save();
        newNotes.push(newNote);
      }

      if (targetUser && notesCount > 0) {
        
        if (typeof sendPush === 'function') {
          await sendPush(targetUser, title, message, { type: 'note' }, 'smart-alert', 'default');
        }
        
        
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
    
    note.isInbox = false; 
    await note.save();
    
    io.to(req.user.id.toString()).emit('live_db_update');
    res.json(await Note.findById(note._id).populate('user', 'name email profilePic').populate('sender', 'name profilePic'));
  } catch (err) { res.status(500).json({ error: err.message }); }
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

const parseBestOfQuery = (bestOfStr) => {
  const configs = {};
  if (!bestOfStr) return configs;
  bestOfStr.split(',').forEach(item => {
    const parts = item.split(':');
    if (parts.length === 2) {
      const name = decodeURIComponent(parts[0]);
      const limit = parseInt(parts[1]);
      if (!isNaN(limit)) {
        configs[name.toLowerCase()] = limit;
      }
    }
  });
  return configs;
};

const calculateStudentScore = (userGrade, bestOfConfigs = {}) => {
  if (!userGrade) return 0;
  return calculateTrueScore(userGrade.assessments, bestOfConfigs).percentage;
};

const extractCourseIdFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1] || null;
};
// Leaderboard in-memory shared cache
const leaderboardCache = new Map();
const LEADERBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const invalidateLeaderboardCache = (code, section) => {
  if (!code) return;
  const prefix = `${code.trim().toUpperCase()}_${(section || '').trim().toUpperCase()}_`;
  for (const key of leaderboardCache.keys()) {
    if (key.startsWith(prefix)) {
      leaderboardCache.delete(key);
      console.log(`[CACHE] Invalidated leaderboard cache for key: ${key}`);
    }
  }
};

const buildCourseLeaderboard = (matchingCourses, grades, bestOfConfigs = {}, gradeName = null) => {
  let leaderboard = matchingCourses.map(course => {
    const userGrade = grades.find(g => {
      if (!g.userId || !course.userId?._id) return false;
      if (g.userId.toString() !== course.userId._id.toString()) return false;
      
      if (gradeName) {
        return g.courseName === gradeName;
      }

      // 1. Try matching by numerical course ID extracted from the URLs
      const courseId = extractCourseIdFromUrl(course.portalUrl);
      const gradeCourseId = extractCourseIdFromUrl(g.courseUrl);
      if (courseId && gradeCourseId && courseId === gradeCourseId) {
        return true;
      }

      // 2. Fallbacks
      return (
        g.courseName === course.name || 
        (course.name && g.courseName && g.courseName.toLowerCase().includes(course.name.toLowerCase()))
      );
    });

    const score = calculateStudentScore(userGrade, bestOfConfigs);

    return {
      id: course.userId?.portalId || 'Unknown ID',
      name: course.userId?.name || 'Unknown Student',
      score: score || 0,
      pic: course.userId?.customProfilePic || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(course.userId?.name || 'Student')}&backgroundColor=4f46e5`,
      userGrade
    };
  });

  leaderboard = leaderboard.filter(s => s.id !== 'Unknown ID');
  leaderboard.sort((a, b) => b.score - a.score);

  // Compute the course class average from all students' scores
  let courseClassAvg = 0;
  const firstGradeWithAssessments = grades.find(g => {
    if (gradeName) return g.courseName === gradeName && g.assessments && g.assessments.length > 0;
    return g.assessments && g.assessments.length > 0;
  });
  if (firstGradeWithAssessments) {
    courseClassAvg = calculateClassAverageScore(firstGradeWithAssessments.assessments, bestOfConfigs).percentage;
  }

  const total = leaderboard.length;
  return leaderboard.map((s, idx) => {
    const curveGrade = getSmartCurveGrade(s.score, courseClassAvg);
    const { userGrade, ...cleanStudent } = s;
    return {
      ...cleanStudent,
      rank: idx + 1,
      grade: curveGrade.grade
    };
  });
};

app.get('/api/projection', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const mode = req.query.mode || 'relative';
    const bestOfQuery = req.query.bestOf || '';
    const bestOfConfigs = parseBestOfQuery(bestOfQuery);

    const stats = await StudentStats.findOne({ userId });
    const courses = await Course.find({ userId });
    const grades = await Grade.find({ userId });

    const projection = computeProjection({
      grades,
      courses,
      stats,
      mode,
      bestOfConfigs
    });

    res.json(projection);
  } catch (err) {
    console.error("Error computing projection:", err);
    res.status(500).json({ error: "Failed to compute CGPA projection" });
  }
});

function getClassmateQuery(code, fallbackSection) {
  if (!code) return null;
  const trimmed = code.trim();
  let globalCode = trimmed;
  let section = (fallbackSection || '').trim();

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    globalCode = parts[0].trim();
    section = parts[parts.length - 1].trim();
  }

  if (!globalCode) return null;

  const globalCodeRegex = { $regex: '^' + escapeRegex(globalCode) + '$', $options: 'i' };
  
  if (section) {
    const sectionRegex = { $regex: '^' + escapeRegex(section) + '$', $options: 'i' };
    const longCodeRegex = { $regex: '^' + escapeRegex(globalCode) + '-.*-' + escapeRegex(section) + '$', $options: 'i' };
    return {
      $or: [
        { code: longCodeRegex },
        { code: globalCodeRegex, section: sectionRegex }
      ]
    };
  }

  return { code: globalCodeRegex };
}

app.get('/api/extension/leaderboard/:courseCode', async (req, res) => {
  try {
    const courseCodeParam = req.params.courseCode;
    const courseName = req.query.courseName;
    const email = req.query.email;

    const bestOfQuery = req.query.bestOf || '';
    const bestOfConfigs = parseBestOfQuery(bestOfQuery);
    if (email) {
      const requestingUser = await User.findOne({ email: { $regex: '^' + escapeRegex(email.trim()) + '$', $options: 'i' } });
      if (requestingUser) {
        const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
        if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled === false) {
          return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
        }
      } else {
        return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
      }
    } else {
      return res.status(403).json({ error: "Leaderboard has been disabled for your account by an administrator." });
    }

    const sectionParam = (req.query.section || '').trim();
    const normalizedCode = (courseCodeParam || '').trim().toUpperCase();
    const normalizedName = (courseName || '').trim().toUpperCase();
    const normalizedSection = sectionParam.toUpperCase();
    const classKey = normalizedCode ? `${normalizedCode}_${normalizedSection}` : `${normalizedName}_${normalizedSection}`;
    const cacheKey = `${classKey}_default_${bestOfQuery || 'default'}`;

    const cached = leaderboardCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp < LEADERBOARD_CACHE_TTL)) {
      console.log(`[CACHE HIT] Serving extension leaderboard from cache for key: ${cacheKey}`);
      return res.status(200).json(cached.data);
    }

    let query = {};
    const classmateFilter = getClassmateQuery(courseCodeParam, sectionParam);
    if (classmateFilter) {
      query = { ...query, ...classmateFilter };
    } else {
      query.code = { $regex: '^' + escapeRegex(courseCodeParam.trim()) + '$', $options: 'i' };
    }

    if (courseName) {
      query.name = { $regex: '^' + escapeRegex(courseName.trim()) + '$', $options: 'i' };
    }

    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic');
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    const leaderboard = buildCourseLeaderboard(matchingCourses, grades, bestOfConfigs);

    leaderboardCache.set(cacheKey, {
      data: leaderboard,
      timestamp: now
    });
    console.log(`[CACHE MISS] Populated extension leaderboard cache for key: ${cacheKey}`);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Leaderboard generation error:', error);
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});

app.get('/api/course-leaderboard/:courseId', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) return res.status(404).json({ message: "User not found" });

    const isSuperAdmin = requestingUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!requestingUser.isAdmin && !isSuperAdmin && requestingUser.isLeaderboardEnabled === false) {
      return res.status(403).json({ message: "Leaderboard has been disabled for your account by an administrator." });
    }

    const gradeName = req.query.gradeName; 
    const bestOfQuery = req.query.bestOf || '';
    const bestOfConfigs = parseBestOfQuery(bestOfQuery); 

    const myCourse = await Course.findById(req.params.courseId);
    if (!myCourse) return res.status(404).json({ message: "Course not found" });

    // Strict ownership validation
    if (myCourse.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    let query = {};
    if (myCourse.code) {
      const classmateFilter = getClassmateQuery(myCourse.code, myCourse.section);
      if (classmateFilter) {
        query = { ...query, ...classmateFilter };
      } else {
        query.code = { $regex: '^' + escapeRegex(myCourse.code.trim()) + '$', $options: 'i' };
      }
    } else {
      // Fallback to name and section matching if no code is available
      const targetSection = (myCourse.section || '').trim();
      if (!targetSection) {
        return res.status(400).json({ message: "Your course section is not set. Leaderboards are restricted to section classmates." });
      }
      query.section = { $regex: '^' + escapeRegex(targetSection) + '$', $options: 'i' };
      query.name = { $regex: '^' + escapeRegex(myCourse.name.trim()) + '$', $options: 'i' };
    }
    const normalizedCode = (myCourse.code || '').trim().toUpperCase();
    const normalizedName = (myCourse.name || '').trim().toUpperCase();
    const normalizedSection = (myCourse.section || '').trim().toUpperCase();
    const classKey = normalizedCode ? `${normalizedCode}_${normalizedSection}` : `${normalizedName}_${normalizedSection}`;
    const cacheKey = `${classKey}_${gradeName || 'default'}_${bestOfQuery || 'default'}`;

    const cached = leaderboardCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp < LEADERBOARD_CACHE_TTL)) {
      console.log(`[CACHE HIT] Serving course leaderboard from cache for key: ${cacheKey}`);
      return res.status(200).json(cached.data);
    }

    const matchingCourses = await Course.find(query).populate('userId', 'name portalId customProfilePic'); 
    
    if (!matchingCourses || matchingCourses.length === 0) {
      return res.status(404).json({ message: "No students found in this section." });
    }

    const userIds = matchingCourses.map(c => c.userId?._id).filter(Boolean);
    const grades = await Grade.find({ userId: { $in: userIds } });

    const leaderboard = buildCourseLeaderboard(matchingCourses, grades, bestOfConfigs, gradeName);

    leaderboardCache.set(cacheKey, {
      data: leaderboard,
      timestamp: now
    });
    console.log(`[CACHE MISS] Populated course leaderboard cache for key: ${cacheKey}`);

    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate relative grading leaderboard" });
  }
});

// F-004: Endpoint to poll material processing status
app.get('/api/user/material-sync-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const pendingLinks = await MaterialLink.find({ userId, processed: false }).lean();
    
    const isProcessing = pendingLinks.length > 0;
    const hasExpired = pendingLinks.some(l => l.sessionExpiredAt);
    
    res.json({
      isProcessing,
      hasExpired,
      pendingCount: pendingLinks.length,
      details: pendingLinks.map(l => ({
        courseName: l.courseName,
        courseCode: l.courseCode,
        sectionCode: l.sectionCode,
        sessionExpiredAt: l.sessionExpiredAt || null
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// F-007: Scraper Health endpoint to receive client-side scraping errors
app.post('/api/scraper-health', auth, async (req, res) => {
  try {
    const { scraperName, error } = req.body;
    if (!scraperName || !error) return res.status(400).json({ error: "Missing scraperName or error" });

    const health = new ScraperHealth({
      userId: req.user.id,
      scraperName,
      error
    });
    await health.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




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






const { scrapeServerSide } = require('./services/scraperEngine');


const runTieredSync = async (mode, logName) => {
  console.log(`[CRON] 🌐 Starting ${logName} Scrape Engine...`);
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      ucpCookie: { $exists: true, $ne: null }
    });

    console.log(`[CRON] Found ${activeUsers.length} users for ${logName}.`);


    for (let user of activeUsers) {
      const cronSyncKey = user._id.toString();

      
      if (activeSyncs.has(cronSyncKey)) {
        console.log(`[CRON] ⏭️ Skipping ${user.email} — sync already in progress (lock held).`);
        continue;
      }
      activeSyncs.add(cronSyncKey);

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

        
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          },
          timeout: 60000
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
        }
      } finally {
        
        activeSyncs.delete(cronSyncKey);
      }

      
      await new Promise(r => setTimeout(r, 2000));
    }

  } catch (error) {
    console.error(`[CRON] ${logName} Engine Error:`, error.message);
  }
};


cron.schedule('*/20 8-18 * * *', () => runTieredSync('HIGH', 'Submissions/Attendance/Grades (20m)'), { timezone: "Asia/Karachi" });


cron.schedule('0 */6 * * *', () => runTieredSync('FULL', 'Full Sync + Announcements (6h)'), { timezone: "Asia/Karachi" });

cron.schedule('0 2 * * *', () => runNightlyMaterialSync(User, Course), { timezone: "Asia/Karachi" });


cron.schedule('*/10 * * * *', async () => {
  console.log('[CRON] 💓 Starting session keep-alive ping cycle (10m)...');
  try {
    const activeUsers = await User.find({
      isPortalConnected: true,
      $or: [
        { ucpCookie: { $exists: true, $ne: null } },
        { ucpCookieEncrypted: { $exists: true, $ne: null } }
      ]
    }).select('+ucpCookieEncrypted ucpCookie email portalId');

    console.log(`[CRON] Found ${activeUsers.length} users to ping keep-alive.`);

    for (const user of activeUsers) {
      
      await new Promise(r => setTimeout(r, 2000));
      try {
        const cookie = user.ucpCookieEncrypted ? decrypt(user.ucpCookieEncrypted) : user.ucpCookie;
        if (!cookie) continue;

        const response = await fetch('https://horizon.ucp.edu.pk/student/dashboard', {
          method: 'GET',
          headers: {
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
          }
        });

        if (response.url && response.url.toLowerCase().includes('login')) {
          console.log(`[CRON] Session expired for user ${user.email} during keep-alive`);
          await User.findByIdAndUpdate(user._id, { 
            isPortalConnected: false,
            ucpCookieEncrypted: null,
            ucpCookie: null
          });
        } else {
          console.log(`[CRON] Session kept alive successfully for user ${user.email}`);
        }
      } catch (err) {
        console.error(`[CRON] Keep-alive failed for user ${user.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[CRON] ❌ Session keep-alive cron error:', err.message);
  }
});


app.post('/api/sync-grades', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.ucpCookie) return res.status(400).json({ message: 'Portal not connected.' });

    console.log(`[MANUAL_SYNC] User ${user.email} triggered manual FULL sync`);
    const syncLog = new SyncLog({
      userId: user._id,
      portalId: user.portalId,
      mode: 'FULL',
      status: 'PENDING',
      startTime: new Date()
    });
    await syncLog.save();
    const startTime = Date.now();

    try {
      const { scrapeServerSide } = require('./services/scraperEngine');
      const scrapedPayload = await scrapeServerSide(user.ucpCookie, 'FULL', user.portalId);
      scrapedPayload.syncLogId = syncLog._id.toString();

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
      const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
      
      await axios.post(syncUrl, scrapedPayload, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      await SyncLog.findByIdAndUpdate(syncLog._id, { durationMs: Date.now() - startTime });
      res.json({ success: true, message: 'Sync complete.' });
    } catch (err) {
      console.error(`[MANUAL_SYNC] Sync failed:`, err.message);
      syncLog.status = 'FAILED';
      syncLog.error = err.message;
      syncLog.endTime = new Date();
      syncLog.durationMs = Date.now() - startTime;
      await syncLog.save();

      if (err.message === "Session Expired") {
        await User.findByIdAndUpdate(user._id, { isPortalConnected: false });
        res.status(401).json({ message: 'Session Expired' });
      } else {
        res.status(500).json({ message: err.message });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});






// Normalize a course code for tolerant comparison (strip spaces/dashes, upper).
const normCode = (s) => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

// A user may access shared course material if they are admin, they own this
// document, or they are enrolled in the same course (have a matching Course).
async function canAccessCourseMaterial(userId, file) {
  if (file.userId && file.userId.toString() === userId) return true;
  const user = await User.findById(userId).select('isAdmin').lean();
  if (user && user.isAdmin) return true;
  const target = normCode(file.courseCode);
  if (!target) return false;
  const courses = await Course.find({ userId }).select('code name').lean();
  return courses.some(c => normCode(c.code) === target || normCode(c.name).includes(target));
}

app.get('/api/course-material/download/:fileId', async (req, res) => {
  try {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] });

    const file = await CourseMaterial.findById(req.params.fileId).lean();
    if (!file || !file.b2Key) {
      return res.status(404).json({ message: 'File not found.' });
    }

    // Authorization (BOLA/IDOR prevention): the caller must be entitled to this file.
    if (!(await canAccessCourseMaterial(decoded.id, file))) {
      return res.status(403).json({ message: 'You are not authorized to access this file.' });
    }

    const signedUrl = await getSignedDownloadUrl(file.b2Key, 300, file.fileName || file.normalizedFileName);
    res.redirect(signedUrl);
  } catch (err) {
    console.error('[API] download redirect error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
});


app.get('/api/submission/download/:submissionId/:taskId', async (req, res) => {
  try {
    const token = req.header('x-auth-token') || req.query.token;
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALG] });

    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    // Authorization: submissions are personal — only the owner (or an admin) may download.
    if (submission.userId.toString() !== decoded.id) {
      const requester = await User.findById(decoded.id).select('isAdmin').lean();
      if (!requester || !requester.isAdmin) {
        return res.status(403).json({ message: 'You are not authorized to access this file.' });
      }
    }

    const task = submission.tasks.id(req.params.taskId);
    if (!task || !task.b2Key) {
      return res.status(404).json({ message: 'Attachment file not found.' });
    }

    const signedUrl = await getSignedDownloadUrl(task.b2Key, 300, task.title); 
    res.redirect(signedUrl);
  } catch (err) {
    console.error('[API] submission download redirect error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
});


app.get('/api/course-material/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const globalCode = courseCode.split('-')[0].trim();
    const { getCurrentSemesterCode } = require('./services/scraperEngine');

    
    const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
    const activeSemester = course?.semester || getCurrentSemesterCode();

    const materials = await CourseMaterial.find({ courseCode: globalCode, sectionCode, semester: activeSemester })
      .select('fileName fileType fileSize parentArchive isArchiveExtracted b2Key sequenceNumber')
      .sort({ isArchiveExtracted: 1, sequenceNumber: 1, fileName: 1 })
      .lean();

    
    const token = req.header('x-auth-token');
    const baseUrl = getBaseUrl(req);
    const withUrls = materials.map((m) => ({
      ...m,
      downloadUrl: m.b2Key ? `${baseUrl}/api/course-material/download/${m._id}?token=${encodeURIComponent(token)}` : null
    }));

    
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


app.get('/api/course-material/status/:courseCode/:sectionCode', auth, async (req, res) => {
  try {
    const { courseCode, sectionCode } = req.params;
    const globalCode = courseCode.split('-')[0].trim();
    const { getCurrentSemesterCode } = require('./services/scraperEngine');

    const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
    const activeSemester = course?.semester || getCurrentSemesterCode();

    const count = await CourseMaterial.countDocuments({ courseCode: globalCode, sectionCode, semester: activeSemester });
    
    
    const pendingLinkSet = await MaterialLink.findOne({
      userId: req.user.id,
      courseCode: { $regex: '^' + escapeRegex(globalCode) + '(-|$)', $options: 'i' },
      processed: false,
      semester: activeSemester
    }).lean();

    const latest = await CourseMaterial.findOne({ courseCode: globalCode, sectionCode, semester: activeSemester })
      .sort({ createdAt: -1 }).lean();

    if (pendingLinkSet && pendingLinkSet.links && pendingLinkSet.links.length > 0) {
      const total = pendingLinkSet.links.length;
      const completed = pendingLinkSet.links.filter(l => l.processed).length;
      return res.json({
        fileCount: count,
        hasPending: true,
        lastSyncedAt: latest?.createdAt || null,
        isProcessing: true,
        totalFiles: total,
        processedFiles: completed
      });
    }

    res.json({
      fileCount: count,
      hasPending: false,
      lastSyncedAt: latest?.createdAt || null,
      isProcessing: false,
      totalFiles: 0,
      processedFiles: 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch status.' });
  }
});


const zipJobs = new Map();


setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of zipJobs.entries()) {
    if (job.createdAt && (now - job.createdAt > 10 * 60 * 1000)) {
      zipJobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000); 


app.post('/api/course-material/download-urls', auth, async (req, res) => {
  try {
    const { fileIds, courseCode, sectionCode, semester } = req.body;
    let resolvedFileIds = fileIds || [];

    if (resolvedFileIds.length === 0 && courseCode) {
      const globalCode = courseCode.split('-')[0].trim();
      const query = { courseCode: globalCode };
      if (sectionCode) query.sectionCode = sectionCode;
      
      let activeSemester = semester;
      if (!activeSemester) {
        const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
        if (course) {
          activeSemester = course.semester;
        }
      }
      if (activeSemester) {
        query.semester = activeSemester;
      }
      
      const materials = await CourseMaterial.find(query).lean();
      resolvedFileIds = materials.map(m => m._id);
    }

    const materials = await CourseMaterial.find({ _id: { $in: resolvedFileIds } }).lean();
    const filesWithUrls = await Promise.all(materials.map(async (m) => {
      const url = m.b2Key ? await getSignedDownloadUrl(m.b2Key, 3600, m.fileName || m.normalizedFileName) : null;
      return {
        id: m._id,
        fileName: m.fileName || m.normalizedFileName,
        fileType: m.fileType,
        sectionCode: m.sectionCode,
        url
      };
    }));

    res.json({ files: filesWithUrls.filter(f => f.url !== null) });
  } catch (err) {
    console.error('[API] download-urls error:', err.message);
    res.status(500).json({ message: 'Failed to generate download URLs.' });
  }
});


app.post('/api/course-material/download-zip/start', auth, async (req, res) => {
  try {
    const { fileIds, courseName, courseCode, sectionCode, semester } = req.body;
    let resolvedFileIds = fileIds || [];

    if (resolvedFileIds.length === 0 && courseCode) {
      const globalCode = courseCode.split('-')[0].trim();
      const query = { courseCode: globalCode };
      if (sectionCode) query.sectionCode = sectionCode;
      
      let activeSemester = semester;
      if (!activeSemester) {
        const course = await Course.findOne({ userId: req.user.id, code: courseCode }).lean();
        if (course) {
          activeSemester = course.semester;
        }
      }
      if (activeSemester) {
        query.semester = activeSemester;
      }
      
      const materials = await CourseMaterial.find(query).select('_id').lean();
      resolvedFileIds = materials.map(m => m._id);
    }

    if (resolvedFileIds.length === 0) return res.status(400).json({ message: 'No files selected or found.' });
    if (resolvedFileIds.length > 150) return res.status(400).json({ message: 'Max 150 files per download.' });

    const jobId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const safeCourseName = (courseName || 'course-materials').replace(/[^a-zA-Z0-9-_]/g, '_');

    zipJobs.set(jobId, {
      status: 'processing',
      processed: 0,
      total: resolvedFileIds.length,
      error: null,
      buffer: null,
      fileName: `${safeCourseName}_files.zip`,
      createdAt: Date.now()
    });

    
    (async () => {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        const materials = await CourseMaterial.find({ _id: { $in: resolvedFileIds } }).lean();

        const uniqueSections = [...new Set(materials.map(m => m.sectionCode).filter(Boolean))];
        const useSectionDirs = uniqueSections.length > 1;

        let index = 0;
        const downloadNext = async () => {
          const job = zipJobs.get(jobId);
          if (!job || index >= materials.length) return;
          
          const currentIdx = index++;
          const m = materials[currentIdx];
          
          if (m.b2Key) {
            try {
              const signedUrl = await getSignedDownloadUrl(m.b2Key, 300, m.fileName || m.normalizedFileName);
              const response = await fetch(signedUrl, { signal: AbortSignal.timeout(15000) });
              if (response.ok) {
                const buf = Buffer.from(await response.arrayBuffer());
                const sectionFolder = useSectionDirs ? `Section ${m.sectionCode}/` : '';
                zip.addFile(`${sectionFolder}${m.fileName || m.normalizedFileName}`, buf);
              }
            } catch (err) {
              console.error(`[ZIP_JOB] Failed for ${m.fileName}:`, err.message);
            }
          }
          
          const updatedJob = zipJobs.get(jobId);
          if (updatedJob) {
            updatedJob.processed++;
            zipJobs.set(jobId, { ...updatedJob });
          }
          
          await downloadNext();
        };

        const concurrencyLimit = Math.min(10, materials.length);
        const workers = [];
        for (let i = 0; i < concurrencyLimit; i++) {
          workers.push(downloadNext());
        }
        await Promise.all(workers);

        const job = zipJobs.get(jobId);
        if (job) {
          job.buffer = zip.toBuffer();
          job.status = 'completed';
          zipJobs.set(jobId, job);
        }
      } catch (err) {
        console.error(`[ZIP_JOB] Job ${jobId} failed:`, err);
        const job = zipJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = err.message;
          zipJobs.set(jobId, job);
        }
      }
    })();

    res.json({ jobId });
  } catch (err) {
    console.error('[API] start-zip-job error:', err.message);
    res.status(500).json({ message: 'Failed to start zip packaging.' });
  }
});


app.get('/api/course-material/download-zip/status/:jobId', auth, async (req, res) => {
  const job = zipJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ message: 'Job not found or expired.' });
  res.json({
    status: job.status,
    processed: job.processed,
    total: job.total,
    error: job.error
  });
});


app.get('/api/course-material/download-zip/file/:jobId', auth, async (req, res) => {
  const { jobId } = req.params;
  const job = zipJobs.get(jobId);
  if (!job) return res.status(404).json({ message: 'File not found or expired.' });
  if (job.status !== 'completed' || !job.buffer) {
    return res.status(400).json({ message: 'Zip is not ready yet.' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
  res.setHeader('Content-Length', job.buffer.length);
  res.send(job.buffer);

  
  zipJobs.delete(jobId);
});


app.post('/api/course-material/download-zip', auth, async (req, res) => {
  try {
    const { fileIds, courseName } = req.body;
    if (!fileIds || fileIds.length === 0) return res.status(400).json({ message: 'No files selected.' });
    if (fileIds.length > 20) return res.status(400).json({ message: 'Max 20 files per download.' });

    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    const materials = await CourseMaterial.find({ _id: { $in: fileIds } }).lean();

    
    const downloadPromises = materials.map(async (m) => {
      if (!m.b2Key) return null;
      try {
        const signedUrl = await getSignedDownloadUrl(m.b2Key, 300);
        const response = await fetch(signedUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) return null;
        const buf = Buffer.from(await response.arrayBuffer());
        return {
          fileName: m.fileName || m.normalizedFileName,
          buf
        };
      } catch (err) {
        console.error(`[ZIP_DL] Failed to download B2 file for ${m.fileName}:`, err.message);
        return null;
      }
    });

    const downloadedFiles = await Promise.all(downloadPromises);

    for (const file of downloadedFiles) {
      if (file) {
        zip.addFile(file.fileName, file.buf);
      }
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






app.get('/api/admin/vault/files/pending', adminAuth, async (req, res) => {
  try {
    const files = await CourseVaultFile.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/api/admin/vault/buckets/:courseCode', adminAuth, async (req, res) => {
  try {
    const courseCode = req.params.courseCode.split('-')[0].trim();
    const buckets = await CourseVaultBucket.find({ courseCode }).sort({ createdAt: 1 }).lean();
    res.json(buckets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.post('/api/admin/vault/buckets', adminAuth, async (req, res) => {
  try {
    const { name, courseCode } = req.body;
    const globalCode = courseCode.split('-')[0].trim();
    const bucket = await CourseVaultBucket.create({ name, courseCode: globalCode, createdBy: req.user.id });
    res.json(bucket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/api/admin/vault/buckets/:id', adminAuth, async (req, res) => {
  try {
    await CourseVaultBucket.findByIdAndDelete(req.params.id);
    
    await CourseVaultFile.updateMany({ bucketId: req.params.id }, { $set: { status: 'pending', bucketId: null } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.put('/api/admin/vault/files/:id/publish', adminAuth, async (req, res) => {
  try {
    const { bucketId } = req.body;
    const updated = await CourseVaultFile.findByIdAndUpdate(req.params.id, {
      status: 'published',
      bucketId
    }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.delete('/api/admin/vault/files/:id', adminAuth, async (req, res) => {
  try {
    const file = await CourseVaultFile.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'Not found' });
    if (file.b2Key) {
        
    }
    await CourseVaultFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});






app.get('/api/admin/course-materials/courses', auth, adminAuth, async (req, res) => {
  try {
    const courses = await CourseMaterial.aggregate([
      {
        $match: {
          isArchiveExtracted: false
        }
      },
      {
        $group: {
          _id: { courseCode: "$courseCode", sectionCode: "$sectionCode", semester: "$semester" },
          courseName: { $first: "$courseName" },
          fileCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.courseCode",
          courseName: { $first: "$courseName" },
          sections: {
            $push: {
              sectionCode: "$_id.sectionCode",
              semester: "$_id.semester",
              fileCount: "$fileCount"
            }
          }
        }
      },
      {
        $project: {
          courseCode: "$_id",
          courseName: { $ifNull: ["$courseName", "$_id"] },
          sections: 1,
          _id: 0
        }
      },
      { $sort: { courseName: 1 } }
    ]);
    res.json(courses);
  } catch (err) {
    console.error('[API] admin get course list error:', err.message);
    res.status(500).json({ message: 'Failed to fetch admin course materials.' });
  }
});


app.get('/api/admin/course-materials/files', auth, adminAuth, async (req, res) => {
  try {
    const { courseCode, sectionCode, semester } = req.query;
    if (!courseCode || !sectionCode || !semester) {
      return res.status(400).json({ message: 'Missing courseCode, sectionCode, or semester.' });
    }

    
    const materials = await CourseMaterial.find({ courseCode, sectionCode, semester })
      .select('fileName fileType fileSize parentArchive isArchiveExtracted b2Key createdAt')
      .sort({ isArchiveExtracted: 1, fileName: 1 })
      .lean();

    
    const token = req.header('x-auth-token');
    const baseUrl = getBaseUrl(req);
    const withUrls = materials.map((m) => ({
      ...m,
      downloadUrl: m.b2Key ? `${baseUrl}/api/course-material/download/${m._id}?token=${encodeURIComponent(token)}` : null
    }));

    
    const grouped = [];
    const archives = {};
    for (const m of withUrls) {
      if (m.isArchiveExtracted && m.parentArchive) {
        if (!archives[m.parentArchive]) archives[m.parentArchive] = [];
        archives[m.parentArchive].push(m);
      } else {
        grouped.push(m);
      }
    }
    for (const m of grouped) {
      if ((m.fileType === 'zip' || m.fileType === 'rar') && archives[m.fileName]) {
        m.contents = archives[m.fileName];
      }
    }

    
    const enrollments = await Course.find({
      code: { $regex: '^' + escapeRegex(courseCode) + '(-|$)' },
      section: sectionCode,
      semester: semester
    }).populate('userId', 'name email portalId isPortalConnected').lean();

    const totalStudents = enrollments.length;
    const enrolledStudents = enrollments
      .filter(e => e.userId)
      .map(e => ({
        _id: e.userId._id,
        name: e.userId.name,
        email: e.userId.email,
        rollNumber: e.userId.portalId || '',
        isPortalConnected: e.userId.isPortalConnected || false
      }));

    res.json({
      files: grouped,
      totalFiles: withUrls.length,
      studentStats: {
        total: totalStudents,
        connectedCount: enrolledStudents.filter(s => s.isPortalConnected).length,
        connectedList: enrolledStudents.filter(s => s.isPortalConnected),
        studentsList: enrolledStudents
      }
    });
  } catch (err) {
    console.error('[API] admin get section files error:', err.message);
    res.status(500).json({ message: 'Failed to fetch course files and stats.' });
  }
});


app.get('/api/admin/course-materials/search', auth, adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json({ courses: [], files: [], students: [] });
    }

    const cleanQ = q.trim();
    const escapedQ = escapeRegex(cleanQ);

    
    const matchedCourses = await Course.find({
      $or: [
        { name: { $regex: escapedQ, $options: 'i' } },
        { code: { $regex: escapedQ, $options: 'i' } },
        { section: { $regex: escapedQ, $options: 'i' } }
      ]
    })
    .limit(50)
    .lean();

    
    const uniqueCoursesMap = new Map();
    for (const c of matchedCourses) {
      const key = `${c.code}_${c.section}_${c.semester}`;
      if (!uniqueCoursesMap.has(key)) {
        uniqueCoursesMap.set(key, {
          courseCode: c.code,
          courseName: c.name,
          sectionCode: c.section,
          semester: c.semester
        });
      }
    }
    const deduplicatedCourses = Array.from(uniqueCoursesMap.values()).slice(0, 15);

    
    const matchedFiles = await CourseMaterial.find({
      fileName: { $regex: escapedQ, $options: 'i' }
    })
    .select('fileName fileType fileSize courseCode sectionCode semester b2Key')
    .limit(15)
    .lean();

    
    const matchedUsers = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: escapedQ, $options: 'i' } },
        { email: { $regex: escapedQ, $options: 'i' } },
        { portalId: { $regex: escapedQ, $options: 'i' } }
      ]
    })
    .select('name email portalId isPortalConnected')
    .limit(15)
    .lean();

    res.json({
      courses: deduplicatedCourses,
      files: matchedFiles,
      students: matchedUsers
    });
  } catch (err) {
    console.error('[API] Admin search error:', err.message);
    res.status(500).json({ message: 'Search query failed.' });
  }
});


app.get('/api/admin/course-materials/student-sections/:userId', auth, adminAuth, async (req, res) => {
  try {
    const enrollments = await Course.find({ userId: req.params.userId })
      .select('name code section semester')
      .lean();

    const formatted = enrollments.map(c => ({
      courseName: c.name,
      courseCode: c.code,
      sectionCode: c.section,
      semester: c.semester
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[API] Get student sections error:', err.message);
    res.status(500).json({ message: 'Failed to retrieve student sections.' });
  }
});


app.get('/api/course-vault/:courseCode', auth, (req, res) => {
  res.json([]);
});


app.get('/api/course-vault/view/:id', auth, (req, res) => {
  res.status(404).json({ message: 'Course Vault is disabled.' });
});


app.post('/api/course-material/upload', auth, (req, res) => {
  return res.status(403).json({ message: 'Manual uploads are disabled. Course materials are synced automatically from Horizon Portal.' });
});


app.use((err, req, res, next) => {
  console.error('[EXPRESS_ERROR]', err.stack || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} with WebSockets enabled!`);
  configureBucketCors();
});




