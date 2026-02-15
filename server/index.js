require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const si = require('systeminformation');
const { Resend } = require('resend');

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = "ranasuffyan9@gmail.com";
const resend = new Resend(process.env.RESEND_API_KEY);

// --- MIDDLEWARE ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET);
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

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'general' }, 
  createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }
});
const OTP = mongoose.model('OTP', otpSchema);

const app = express();

// --- SECURE CORS CONFIGURATION ---
app.use(cors({
  origin: ['http://localhost:3000', 'https://myportalucp.online'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  credentials: true 
}));
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = process.env.REACT_APP_MONGODB_URI;
console.log("🔗 Connecting to MyPortal Database...");
mongoose.connect(dbLink)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log(err));

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
    res.json({ cpu: Math.round(cpuLoad.currentLoad), memory: { active: mem.active, total: mem.total }, dbSize });
  } catch (error) { res.status(500).json({ message: "Failed to fetch stats" }); }
});

app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
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
      User.findByIdAndDelete(userId), Grade.deleteMany({ userId }), ResultHistory.deleteMany({ userId }),
      StudentStats.deleteMany({ userId }), Task.deleteMany({ userId }), Transaction.deleteMany({ userId }), Budget.deleteMany({ userId })
    ]);
    res.json({ message: "User deleted permanently." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- NEW EXTENSION SYNC ROUTE ---
app.post('/api/extension-sync', auth, async (req, res) => {
  try {
    const { gradesData, historyData, statsData } = req.body;
    const userId = req.user.id;

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

    if (statsData && statsData.cgpa) {
      await StudentStats.findOneAndUpdate(
        { userId },
        { ...statsData, userId, lastUpdated: new Date() },
        { upsert: true }
      );
    }
    res.json({ message: 'Sync complete via Extension!' });
  } catch (error) { 
    res.status(500).json({ message: error.message || 'Internal Server Error' }); 
  }
});

// --- COURSES, AUTH & USER ROUTES ---
// ... (Keep all your existing /api/courses, /api/register, /api/login routes here exactly as they were) ...

// UPDATE: Link Portal no longer needs or stores a password!
app.post('/api/user/link-portal', auth, async (req, res) => {
  const { portalId } = req.body; // Password removed for security
  try {
    await User.findByIdAndUpdate(req.user.id, {
      portalId: portalId,
      isPortalConnected: true
    });
    res.json({ success: true, message: "Account linked. Please use the Chrome Extension to sync data." });
  } catch (error) { res.status(500).json({ message: "Failed to link account." }); }
});

app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { portalId: null, isPortalConnected: false });
    await Promise.all([ Grade.deleteMany({ userId: req.user.id }), ResultHistory.deleteMany({ userId: req.user.id }), StudentStats.deleteMany({ userId: req.user.id }) ]);
    res.json({ success: true, message: "Portal account removed." });
  } catch (error) { res.status(500).json({ message: "Failed to unlink account." }); }
});

// ... (Keep all your existing data getters: /api/student-stats, /api/tasks, /api/transactions, etc. exactly as they were) ...

app.get('/', (req, res) => {
  res.json({ message: "API is running 🚀" });
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;