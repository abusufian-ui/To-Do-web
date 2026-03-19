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

// --- NEW IMPORTS FOR SERVER NOTIFICATIONS & SCRAPING ---
const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const cheerio = require('cheerio'); 

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
const { Transaction, Budget, Debt } = require('./models/Transaction');
const axios = require('axios');

// --- NEW UCP DATA MODELS ---
const Attendance = require('./models/Attendance');
const Submission = require('./models/Submission');
const Announcement = require('./models/Announcement');

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = "ranasuffyan9@gmail.com";
const resend = new Resend(process.env.RESEND_API_KEY);
let expo = new Expo(); 

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

// ==========================================
// 1. CRITICAL MIDDLEWARE (MUST BE AT TOP)
// ==========================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000', 
  'http://localhost:3001',
  'http://127.0.0.1:3001', 
  'http://localhost:8081', 
  'http://localhost:5000/',
  'http://192.168.0.111:8081',
  'http://10.133.169.235:8081',
  'https://myportalucp.online',
  'https://horizon.ucp.edu.pk',
  'chrome-extension://fgipkgekakeenpklgdgeibndjmmcgaof'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      console.error(`🚨 CORS BLOCKED THIS ORIGIN: "${origin}"`); 
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

// --- AUTH MIDDLEWARE ---
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
// 2. BACKGROUND SCRAPER ENGINE & HEARTBEAT
// ==========================================
let activeUcpSession = {
    cookie: null,
    userId: null,
    courseLinks: [],
    courseMap: {}
};
let heartbeatInterval = null;

// BULLETPROOF: express.json() injected directly into route
app.post('/api/session/keep-alive', express.json(), auth, (req, res) => {
    const { ucpCookie, courseLinks, courseMap } = req.body;
    
    if (!ucpCookie) {
        return res.status(400).json({ error: "No cookie provided" });
    }

    activeUcpSession = {
        cookie: ucpCookie,
        userId: req.user.id,
        courseLinks: courseLinks || [],
        courseMap: courseMap || {}
    };

    console.log("📥 Received fresh UCP cookies & links from extension!");

    if (heartbeatInterval) clearInterval(heartbeatInterval);
    scrapeAndSaveUcpData(); 
    heartbeatInterval = setInterval(scrapeAndSaveUcpData, 210000); 

    res.status(200).json({ message: "Heartbeat & Background Scraper initiated." });
});

async function scrapeAndSaveUcpData() {
    if (!activeUcpSession.cookie || !activeUcpSession.userId) return;

    const { cookie, userId, courseLinks, courseMap } = activeUcpSession;

    try {
        console.log("🚀 Background Scraper: Sweeping active UCP courses...");

        for (const url of courseLinks) {
            try {
                const courseName = (courseMap[url] && courseMap[url].name) ? courseMap[url].name : "Unknown Course";
                const courseId = url.split('/').pop();
                const baseUrl = 'https://horizon.ucp.edu.pk/student/course';

                // --- 1. ATTENDANCE ---
                const attUrl = `${baseUrl}/attendance/${courseId}`;
                const attRes = await axios.get(attUrl, { headers: { 'Cookie': cookie }, maxRedirects: 0, validateStatus: status => status < 400 });

                if (attRes.status === 302) {
                    console.warn("💀 UCP Session Expired! The absolute timeout was reached.");
                    clearInterval(heartbeatInterval);
                    activeUcpSession.cookie = null;
                    return; 
                }

                const parsedAttendance = parseAttendance(attRes.data);
                const existingAtt = await Attendance.findOne({ userId: userId, courseUrl: url });

                // PROTECT: Only save if we found actual records, OR if the database is completely empty (start of semester)
                if (parsedAttendance.records.length > 0 || !existingAtt) {
                    await Attendance.findOneAndUpdate(
                        { userId: userId, courseUrl: url },
                        { courseName: courseName, summary: parsedAttendance.summary, records: parsedAttendance.records, lastUpdated: Date.now() },
                        { upsert: true }
                    );
                }

                // --- 2. SUBMISSIONS ---
                const subUrl = `${baseUrl}/submission/${courseId}`;
                const subRes = await axios.get(subUrl, { headers: { 'Cookie': cookie } });
                const parsedSubmissions = parseSubmissions(subRes.data);
                const existingSub = await Submission.findOne({ userId: userId, courseUrl: url });

                if (parsedSubmissions.length > 0 || !existingSub) {
                    let finalTasks = parsedSubmissions;
                    
                    // SMART MERGE: Combine old tasks with new tasks without deleting historical ones
                    if (existingSub && existingSub.tasks && existingSub.tasks.length > 0) {
                        const taskMap = new Map();
                        existingSub.tasks.forEach(t => taskMap.set(t.title, t)); // Load old
                        parsedSubmissions.forEach(t => taskMap.set(t.title, t)); // Merge fresh
                        finalTasks = Array.from(taskMap.values());
                    }

                    await Submission.findOneAndUpdate(
                        { userId: userId, courseUrl: url },
                        { courseName: courseName, tasks: finalTasks, lastUpdated: Date.now() },
                        { upsert: true }
                    );
                }

                // --- 3. ANNOUNCEMENTS ---
                const annUrl = `${baseUrl}/info/${courseId}`;
                const annRes = await axios.get(annUrl, { headers: { 'Cookie': cookie } });
                const parsedAnnouncements = parseAnnouncements(annRes.data);
                const existingAnn = await Announcement.findOne({ userId: userId, courseUrl: url });

                if (parsedAnnouncements.length > 0 || !existingAnn) {
                    let finalNews = parsedAnnouncements;

                    // SMART MERGE: Combine old news with new news
                    if (existingAnn && existingAnn.news && existingAnn.news.length > 0) {
                        const newsMap = new Map();
                        existingAnn.news.forEach(n => newsMap.set(n.subject + n.date, n)); // Load old
                        parsedAnnouncements.forEach(n => newsMap.set(n.subject + n.date, n)); // Merge fresh
                        finalNews = Array.from(newsMap.values());
                    }

                    await Announcement.findOneAndUpdate(
                        { userId: userId, courseUrl: url },
                        { courseName: courseName, news: finalNews, lastUpdated: Date.now() },
                        { upsert: true }
                    );
                }

            } catch (error) {
                console.error(`⚠️ Failed to scrape data for ${url}:`, error.message);
            }
        }
        
        console.log("✅ Background sweep complete! Real-time data saved to MongoDB.");
    } catch (error) {
        console.error("⚠️ Master Heartbeat failed:", error.message);
    }
}

// ==========================================
// 3. CHEERIO HTML PARSERS
// ==========================================
function parseAnnouncements(htmlText) {
    const $ = cheerio.load(htmlText);
    const announcements = [];
    
    // Relaxed selector: Look at ALL rows in the table body
    $('table tbody tr').each((index, element) => {
        const tds = $(element).find('td');
        
        // Ensure it's a real data row (at least 4 columns: Sr, Subject, Date, Description)
        if (tds.length >= 4) {
            const subject = tds.eq(1).text().trim();
            const date = tds.eq(2).text().trim();
            let description = tds.eq(3).text().trim().replace(/\s+/g, ' '); 
            
            // Skip header rows if they accidentally get caught
            if (subject && subject.toLowerCase() !== 'subject') {
                announcements.push({ subject, date, description });
            }
        }
    });
    return announcements;
}

function parseSubmissions(htmlText) {
    const $ = cheerio.load(htmlText);
    const tasks = [];
    
    $('table.uk-table tbody tr.table-child-row').each((index, element) => {
        // Grab all columns (td) in this row
        const tds = $(element).find('td');
        
        // Map columns exactly as they appear on the UCP portal
        const name = tds.eq(1).text().trim() || $(element).find('.rec_submission_title').text().trim();
        let description = tds.eq(2).text().trim() || $(element).find('.rec_submission_description').text().trim();
        description = description.replace(/\s+/g, ' '); // Clean up extra spaces
        const startDate = tds.eq(3).text().trim();
        const dueDate = tds.eq(4).text().trim();
        
        const attachmentLink = tds.eq(5).find('a').attr('href') || null;
        const uploadLink = tds.eq(6).find('a').attr('href') || null;

        // BULLETPROOF STATUS CHECK: Look at the exact Action column AND the whole row
        const actionText = tds.eq(6).text().trim().toLowerCase();
        const fullRowText = $(element).text().trim().toLowerCase();
        
        let currentStatus = "Pending";
        
        // If it says "submitted" anywhere in that action cell or row, flag it!
        if (actionText.includes('submitted') || fullRowText.includes('submitted successfully')) {
            currentStatus = "Submitted";
        }

        if (name) {
            tasks.push({ 
                title: name, 
                description, 
                startDate, 
                dueDate, 
                status: currentStatus,
                attachmentUrl: attachmentLink, 
                submissionUrl: uploadLink      
            });
        }
    });
    return tasks;
}

function parseAttendance(htmlText) {
    const $ = cheerio.load(htmlText);
    const attendanceRecords = [];
    
    // 1. Parse all the rows first
    $('table tbody tr').each((index, element) => {
        const tds = $(element).find('td');
        if (tds.length >= 3) {
            const date = tds.eq(1).text().trim();
            let status = tds.eq(2).text().trim();
            
            if (date && date.toLowerCase() !== 'date') { // Ignore headers
                if (status.toLowerCase().includes('leave')) status = 'Absent';
                else if (status.toLowerCase().includes('absent')) status = 'Absent';
                else if (status.toLowerCase().includes('present')) status = 'Present';
                
                attendanceRecords.push({ date, status });
            }
        }
    });

    // 2. Calculate the accurate summary directly from the parsed records
    const totalConducted = attendanceRecords.length;
    const totalAttended = attendanceRecords.filter(r => r.status === 'Present').length;

    // 3. Return the fully computed object to be saved in MongoDB
    return {
        summary: { 
            conducted: totalConducted, 
            attended: totalAttended 
        },
        records: attendanceRecords
    };
}

// --- NEW UCP DATA ROUTES FOR REACT FRONTEND ---
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

// --- SPECIFIC COURSE DATA FETCHING ---
app.get('/api/course-records/:courseName', auth, async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);
    const userId = req.user.id;

    // Fetch all three simultaneously using the courseName
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching course records" });
  }
});

// ==========================================
// EXTENSION SYNC ROUTE
// ==========================================
app.post('/api/extension-sync', express.json(), auth, async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch (e) {
    session = null;
  }

  try {
    const { gradesData, historyData, statsData, timetableData, portalId } = req.body;
    const userId = req.user.id;
    
    const userQuery = User.findById(userId);
    if (session) userQuery.session(session);
    const user = await userQuery;

    if (!portalId) throw new Error("Student ID not detected.");
    if (user.portalId && user.portalId.toUpperCase() !== portalId.toUpperCase()) {
      throw new Error(`Mismatch! Linked to ${user.portalId}, but found ${portalId}.`);
    }
    if (!user.portalId) user.portalId = portalId.toUpperCase();

    // --- GRADES ---
    if (gradesData && gradesData.length > 0) {
      await Grade.deleteMany({ userId }, { session });
      for (const grade of gradesData) {
        await Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...grade, userId, lastUpdated: new Date() }, { upsert: true, new: true, session });
      }
    }

    // --- HISTORY ---
    if (historyData && historyData.length > 0) {
      await ResultHistory.deleteMany({ userId }, { session });
      for (const sem of historyData) {
        await ResultHistory.findOneAndUpdate({ term: sem.term, userId }, { ...sem, userId, lastUpdated: new Date() }, { upsert: true, session });
      }
    }

    // --- STATS ---
    if (statsData && statsData.cgpa) {
      await StudentStats.findOneAndUpdate({ userId }, { ...statsData, userId, lastUpdated: new Date() }, { upsert: true, session });
    }

    // --- TIMETABLE ---
    if (timetableData && timetableData.length > 0) {
      await Timetable.deleteMany({ userId }, { session });
      for (const classItem of timetableData) {
        const { id, ...classData } = classItem;
        const newTimeTable = new Timetable({ ...classData, userId, lastUpdated: new Date() });
        await newTimeTable.save({ session });
      }
    }

    // --- UNIVERSAL COURSE ENGINE ---
    const courseMap = new Map();
    if (timetableData && timetableData.length > 0) {
      timetableData.forEach(item => {
        if (!item.courseName) return;
        if (!courseMap.has(item.courseName)) {
          courseMap.set(item.courseName, { name: item.courseName, code: item.courseCode || '', color: item.color || '#3498db', instructors: new Set(), rooms: new Set() });
        }
        const course = courseMap.get(item.courseName);
        if (item.instructor && !item.instructor.includes('Unknown')) course.instructors.add(item.instructor);
        if (item.room && !item.room.includes('Unknown')) course.rooms.add(item.room);
      });
    }

    if (gradesData && gradesData.length > 0) {
      gradesData.forEach(g => {
        if (!g.courseName) return;
        if (!courseMap.has(g.courseName)) {
          courseMap.set(g.courseName, { name: g.courseName, code: '', color: '#3498db', instructors: new Set(), rooms: new Set() });
        }
      });
    }

    for (const [courseName, data] of courseMap.entries()) {
      await Course.findOneAndUpdate(
        { userId, name: courseName },
        { $set: { userId, name: data.name, type: 'university', code: data.code || '', color: data.color || '#3498db', instructors: Array.from(data.instructors), rooms: Array.from(data.rooms) } },
        { upsert: true, new: true, session }
      );
    }

    user.isPortalConnected = true;
    user.lastSyncAt = new Date();
    await user.save({ session });

    if (session) { await session.commitTransaction(); session.endSession(); }
    res.json({ message: "Sync complete securely!" });

  } catch (error) {
    if (session) { await session.abortTransaction(); session.endSession(); }
    const statusCode = error.message.includes('Mismatch') || error.message.includes('not detected') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
});

// ==========================================
// CLOUDINARY & MULTER CONFIGURATION
// ==========================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'MyPortal_Keynotes', 
    resource_type: 'auto',
    use_filename: true,    
    unique_filename: true  
  },
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

// ==========================================
// CLOUDINARY UPLOAD ROUTE
// ==========================================
app.post('/api/upload', auth, (req, res) => {
  upload.array('files', 10)(req, res, function (err) {
    if (err) {
      console.error("🚨 Cloudinary Upload Error:", err);
      return res.status(500).json({ error: "Upload failed", details: err.message });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const urls = req.files.map(file => file.path);
      res.status(200).json({ message: 'Upload successful', urls: urls });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process files after upload' });
    }
  });
});

// ==========================================
// KEYNOTES / SNAPS MANAGEMENT
// ==========================================
app.get('/api/keynotes', auth, async (req, res) => {
  try {
    const keynotes = await Keynote.find({ userId: req.user.id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json(keynotes);
  } catch (error) { res.status(500).json({ message: "Error fetching keynotes" }); }
});

app.post('/api/keynotes', auth, async (req, res) => {
  try {
    const savedKeynote = await new Keynote({ ...req.body, userId: req.user.id }).save();
    res.json(savedKeynote);
  } catch (error) { res.status(500).json({ message: "Error saving keynote" }); }
});

app.put('/api/keynotes/:id/read', auth, async (req, res) => {
  try {
    const keynote = await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: true }, { new: true });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error updating keynote" }); }
});

app.put('/api/keynotes/:id', auth, async (req, res) => {
  try {
    const { title, content, courseName, mediaUrls, type } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const keynote = await Keynote.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        title: title.trim(), 
        content: content?.trim() || "", 
        courseName: courseName || "General",
        mediaUrls: mediaUrls || [],  
        type: type || 'mixed'        
      },
      { new: true, runValidators: true }
    );
    
    if (!keynote) return res.status(404).json({ message: "Keynote not found" });
    res.json(keynote);
  } catch (error) { 
    res.status(500).json({ message: "Error updating keynote" }); 
  }
});

app.put('/api/keynotes/:id/unread', auth, async (req, res) => {
  try {
    const keynote = await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isRead: false }, { new: true });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error updating keynote" }); }
});

app.put('/api/keynotes/:id/delete', auth, async (req, res) => {
  try {
    const keynote = await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error moving keynote to bin" }); }
});

app.put('/api/keynotes/:id/restore', auth, async (req, res) => {
  try {
    const keynote = await Keynote.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(keynote);
  } catch (error) { res.status(500).json({ message: "Error restoring keynote" }); }
});

app.delete('/api/keynotes/:id', auth, async (req, res) => {
  try {
    await Keynote.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error deleting keynote permanently" }); }
});

// --- ADMIN ROUTES ---
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
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

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
      Course.deleteMany({ userId }),
      Note.deleteMany({ user: userId }),
      Keynote.deleteMany({ userId }),
      FocusSession.deleteMany({ userId }),
      Attendance.deleteMany({ userId }),
      Submission.deleteMany({ userId }),
      Announcement.deleteMany({ userId })
    ]);
    res.json({ message: "User deleted permanently." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- DEBTS & LOANS ---
app.get('/api/debts', auth, async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) { res.status(500).json({ message: "Error fetching debts" }); }
});

app.post('/api/debts', auth, async (req, res) => {
  try {
    const savedDebt = await new Debt({ ...req.body, userId: req.user.id }).save();
    res.json(savedDebt);
  } catch (error) { res.status(500).json({ message: "Error creating debt" }); }
});

app.put('/api/debts/:id/status', auth, async (req, res) => {
  try {
    const debt = await Debt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id }, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(debt);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/debts/:id/delete', auth, async (req, res) => {
  try {
    const debt = await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(debt);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/debts/:id/restore', auth, async (req, res) => {
  try {
    const debt = await Debt.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(debt);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/debts/:id', auth, async (req, res) => {
  try {
    await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error deleting debt" }); }
});

app.post('/api/debts/:id/pay', auth, async (req, res) => {
  try {
    const { amount, date, description, type, category } = req.body;
    const paymentAmount = Number(amount);

    const debt = await Debt.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!debt) return res.status(404).json({ message: "Debt not found" });
    if (paymentAmount > debt.amount) return res.status(400).json({ message: "Payment exceeds active debt amount" });

    debt.amount -= paymentAmount;
    if (debt.amount === 0) {
      debt.status = 'paid';
    }
    await debt.save();

    const newTransaction = new Transaction({
      userId: req.user.id,
      type: type, 
      amount: paymentAmount,
      category: category, 
      description: description || `Payment for: ${debt.person}`,
      date: date || new Date().toISOString()
    });

    await newTransaction.save();
    res.json({ success: true, debt, transaction: newTransaction });
    
  } catch (error) {
    console.error("🚨 CRASH IN DEBT PAY:", error); 
    res.status(500).json({ message: error.message || "Server crashed while paying debt" });
  }
});

// --- NOTES MANAGEMENT ---
app.post('/api/notes', auth, async (req, res) => {
  try {
    const { _id, title, courseId, content, referenceFiles } = req.body;
    
    if (_id) { 
      const updatedNote = await Note.findByIdAndUpdate(
        _id, 
        { title, courseId, content, referenceFiles }, 
        { new: true, runValidators: true } 
      );
      return res.json(updatedNote);
    }

    const newNote = new Note({ 
      user: req.user.id, 
      title, 
      courseId, 
      content: content || " ", 
      referenceFiles 
    });
    
    await newNote.save();
    res.json(newNote);

  } catch (error) { 
    res.status(500).json({ error: "Server Error", details: error.message }); 
  }
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
    const defaultCourseExists = await Course.findOne({ userId: req.user.id, name: 'General Course' });
    if (!defaultCourseExists) {
      const defaultCourse = new Course({ 
        userId: req.user.id, 
        name: 'General Course', 
        type: 'general' 
      });
      await defaultCourse.save();
    }

    const courses = await Course.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(courses);
  } catch (error) { 
    res.status(500).json({ message: "Error fetching courses" }); 
  }
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
    const courseId = req.params.id;
    const course = await Course.findOne({ _id: courseId, userId: req.user.id });
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const normalizedName = course.name.toLowerCase().trim();
    if (normalizedName === 'general' || normalizedName === 'general course' || normalizedName === 'general-task') {
      return res.status(403).json({ message: "The General course is permanent and cannot be deleted." });
    }

    await Course.findByIdAndDelete(courseId);

    await Task.updateMany(
      { userId: req.user.id, course: course.name },
      { $set: { course: "General" } }
    );

    res.json({ message: "Course safely removed. Associated tasks moved to General." });
  } catch (err) {
    console.error("Safe Delete Error:", err);
    res.status(500).json({ message: "Server error during deletion." });
  }
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

// --- PUSH TOKEN ROUTE ---
app.post('/api/user/push-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user.id, { pushToken: token });
    res.json({ success: true, message: "Push token updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update push token" });
  }
});

// --- PREFERENCES ROUTE ---
app.put('/api/user/preferences', auth, async (req, res) => {
  try {
    const { prayerNotifs } = req.body;
    await User.findByIdAndUpdate(req.user.id, { prayerNotifs });
    res.json({ success: true, message: "Preferences updated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update preferences" });
  }
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
    await User.findByIdAndUpdate(req.user.id, { 
        portalId: null, 
        isPortalConnected: false, 
        lastSyncAt: null 
    });

    await Promise.all([
      Grade.deleteMany({ userId: req.user.id }),
      ResultHistory.deleteMany({ userId: req.user.id }),
      StudentStats.deleteMany({ userId: req.user.id }),
      Timetable.deleteMany({ userId: req.user.id }),
      Course.deleteMany({ userId: req.user.id, type: 'university' }) 
    ]);

    res.json({ success: true, message: "Portal account removed." });
  } catch (error) { 
    console.error("🚨 UNLINK PORTAL CRASH:", error);
    res.status(500).json({ message: error.message || "Server crashed while unlinking." }); 
  }
});

app.get('/api/user/portal-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ isConnected: !!user.portalId && user.isPortalConnected, portalId: user.portalId });
  } catch (error) { res.status(500).json({ message: "Error checking status" }); }
});

// ==========================================
// UNIVERSAL DATA GETTERS
// ==========================================
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
// UNIVERSAL ENTITY ROUTES
// ==========================================

// --- HYPER FOCUS SESSIONS ---
app.get('/api/focus-sessions', auth, async (req, res) => {
  try {
    const sessions = await FocusSession.find({ userId: req.user.id }).sort({ completedAt: -1 });
    res.json(sessions);
  } catch (error) { res.status(500).json({ message: "Error fetching focus sessions" }); }
});

app.post('/api/focus-sessions', auth, async (req, res) => {
  try {
    const savedSession = await new FocusSession({ ...req.body, userId: req.user.id }).save();
    res.json(savedSession);
  } catch (error) { res.status(500).json({ message: "Error saving focus session" }); }
});

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

app.put('/api/tasks/:id/acknowledge', auth, async (req, res) => {
  try {
    await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { acknowledged: true });
    res.json({ success: true });
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
    
    habit.checkIns.push(new Date());
    
    const uniqueDays = new Set(habit.checkIns.map(d => new Date(d).setHours(0,0,0,0)));
    if (uniqueDays.size > habit.longestStreak) {
      habit.longestStreak = uniqueDays.size;
    }
    
    await habit.save();
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

app.get('/', (req, res) => {
  res.json({ message: "API is running 🚀" });
});

// ==========================================
// 🔔 THE CRON ENGINE (Runs every minute)
// ==========================================

let cachedPrayerTimes = null;
let lastFetchDate = null;

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    now.setSeconds(0, 0); 
    
    const target15Start = new Date(now.getTime() + 15 * 60000);
    const target15End = new Date(target15Start.getTime() + 60000);
    
    const targetExactStart = new Date(now.getTime());
    const targetExactEnd = new Date(now.getTime() + 60000);

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const orConditions = [];

    orConditions.push({ triggerAt: { $gte: target15Start, $lt: target15End } });
    orConditions.push({ triggerAt: { $gte: targetExactStart, $lt: targetExactEnd } });

    if (currentMinute === 0 && [9, 12, 15, 19].includes(currentHour)) {
      orConditions.push({ date: todayStr, time: null });
    }

    if (orConditions.length > 0) {
      const upcomingTasks = await Task.find({
        completed: false,
        isDeleted: false,
        acknowledged: false,
        $or: orConditions
      }).populate('userId');

      let taskMessages = [];

      for (let task of upcomingTasks) {
        if (!task.userId || !task.userId.pushToken) continue;
        const pushToken = task.userId.pushToken;
        
        if (Expo.isExpoPushToken(pushToken)) {
          let bodyText = `Task: ${task.name}`;
          
          if (task.time && new Date(task.triggerAt) > now) {
            bodyText = `Starts in 15 mins: ${task.name}`;
          } else if (task.time && new Date(task.triggerAt) <= now) {
            bodyText = `It is time for: ${task.name}`;
          } else {
            bodyText = `Daily Reminder: ${task.name}`;
          }

          console.log(`[TASK ENGINE] 🎯 Found task: "${task.name}" for user ${task.userId.email}`);
          taskMessages.push({
            to: pushToken,
            sound: 'default',
            categoryId: "smart-alert", 
            title: `Task Reminder: ${task.course || 'General'} 📌`,
            body: bodyText,
            data: { taskId: task._id, type: 'task' },
          });
        }
      }

      if (taskMessages.length > 0) {
        let chunks = expo.chunkPushNotifications(taskMessages);
        for (let chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
      }
    }
  } catch (error) {
    console.error(`[TASK ENGINE] ❌ Critical Error:`, error);
  }

  // ---------------------------------------------------------
  // ENGINE 2: LIVE PRAYER ALERTS (LAHORE, PKT)
  // ---------------------------------------------------------
  try {
    const nowLahoreStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
    const lahoreDateObj = new Date(nowLahoreStr);
    
    const todayStr = `${lahoreDateObj.getDate()}-${lahoreDateObj.getMonth() + 1}-${lahoreDateObj.getFullYear()}`;
    const currentLahoreTime = lahoreDateObj.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit' });

    if (lastFetchDate !== todayStr || !cachedPrayerTimes) {
      const response = await axios.get('https://api.aladhan.com/v1/timingsByCity?city=Lahore&country=Pakistan&method=1');
      const timings = response.data.data.timings;
      
      cachedPrayerTimes = {
        Fajr: timings.Fajr,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha
      };
      lastFetchDate = todayStr;

      console.log(`[PRAYER ENGINE] 🔄 Fetched fresh Lahore Prayer Times for ${todayStr}:`, cachedPrayerTimes);
    }

    let currentPrayer = null;
    for (const [prayer, time] of Object.entries(cachedPrayerTimes)) {
      if (time === currentLahoreTime) {
        currentPrayer = prayer;
        break;
      }
    }

    if (currentPrayer) {
      console.log(`[PRAYER ENGINE] ⏰ It is exactly time for ${currentPrayer}! Scanning for opted-in users...`);
      const prayerUsers = await User.find({ prayerNotifs: true, pushToken: { $ne: null } });
      let prayerMessages = [];

      for (let user of prayerUsers) {
        if (Expo.isExpoPushToken(user.pushToken)) {
          prayerMessages.push({
            to: user.pushToken,
            title: `🕌 ${currentPrayer} Prayer Time`,
            body: `It is time for ${currentPrayer} prayer. Please take a moment to pray.`,
            categoryId: "smart-alert", 
            channelId: "prayer-channel-live", 
            data: { type: 'prayer', eventId: `prayer_${currentPrayer}_${todayStr}` },
          });
        }
      }

      if (prayerMessages.length > 0) {
        console.log(`[PRAYER ENGINE] 🚀 Dispatching ${currentPrayer} alert to ${prayerMessages.length} users!`);
        let chunks = expo.chunkPushNotifications(prayerMessages);
        for (let chunk of chunks) {
          try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log(`[PRAYER ENGINE] ✅ Successfully sent ${currentPrayer} chunk! Expo Tickets:`, ticketChunk);
          } catch (error) {
            console.error(`[PRAYER ENGINE] ❌ Error sending ${currentPrayer} chunk:`, error);
          }
        }
      } else {
         console.log(`[PRAYER ENGINE] ⚠️ It is time for ${currentPrayer}, but no users have prayer alerts enabled.`);
      }
    }
  } catch (error) {
    console.error(`[PRAYER ENGINE] ❌ Critical Error:`, error);
  }

  // ---------------------------------------------------------
  // ENGINE 3: CLASS REMINDERS (BULLETPROOF EDITION)
  // ---------------------------------------------------------
  try {
    const nowPktStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
    const pktNow = new Date(nowPktStr);
    
    const targetTime = new Date(pktNow.getTime() + 5 * 60000);
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const targetDay = days[targetTime.getDay()];
    const targetHours = targetTime.getHours();
    const targetMinutes = targetTime.getMinutes();

    const todaysClasses = await Timetable.find({ day: targetDay }).populate('userId').catch(err => {
        console.error("[CLASS ENGINE] DB Query Error:", err.message);
        return [];
    });

    let classMessages = [];

    for (let cls of todaysClasses) {
      if (!cls || !cls.userId || !cls.userId.pushToken || !cls.startTime) continue;

      let classHours = -1;
      let classMinutes = -1;
      
      const timeString = String(cls.startTime).trim();
      const timeMatch = timeString.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
      
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

      if (classHours === targetHours && classMinutes === targetMinutes) {
        const pushToken = cls.userId.pushToken;
        
        if (Expo.isExpoPushToken(pushToken)) {
          const instructorName = (cls.instructor && !String(cls.instructor).includes('Unknown')) 
            ? cls.instructor 
            : "Your teacher";
          
          const roomInfo = (cls.room && !String(cls.room).includes('Unknown')) 
            ? ` (Room: ${cls.room})` 
            : "";
          
          console.log(`[CLASS ENGINE] 🎓 Found class: "${cls.courseName}" for user ${cls.userId.email}`);
          
          classMessages.push({
            to: pushToken,
            sound: 'default',
            categoryId: "smart-alert", 
            title: `Upcoming Class: ${cls.courseName} 📚`,
            body: `${instructorName} is starting the lecture in 5 mins${roomInfo}`,
            data: { type: 'class', classId: cls._id },
          });
        }
      }
    }

    if (classMessages.length > 0) {
      let chunks = expo.chunkPushNotifications(classMessages);
      for (let chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
    }

  } catch (error) {
    console.error(`[CLASS ENGINE] ❌ Critical Error:`, error.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));