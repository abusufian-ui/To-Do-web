//if (process.env.NODE_ENV !== 'production') {
//    require('dotenv').config();
//  }

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const si = require('systeminformation');
const { encrypt, decrypt } = require('./utils/encryption');
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

const runScraper = require('./scraper');

// --- MODELS ---
const User = require('./models/User');
const Task = require('./models/Task');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const { Transaction, Budget } = require('./models/Transaction');

// --- NEW: COURSE MODEL (For Manual/General Courses) ---
const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'general' }, // 'general' or 'manual'
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
  origin: [
    'http://localhost:3000', // Keeps your local computer working
    'https://myportalucp.online' // Front end domain
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ADDED: OPTIONS to clear preflight requests
  credentials: true 
}));
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = process.env.REACT_APP_MONGODB_URI;

console.log("🔗 Connecting to MyPortal Database...");

mongoose.connect(dbLink)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully!");
  })
  .catch(err => console.log(err));

// --- CRON JOBS ---
cron.schedule('0 8-20 * * *', async () => {
  console.log("⏰ CRON: Starting Hourly Auto-Sync...");
  try {
    const users = await User.find({ isPortalConnected: true });
    for (let i = 0; i < users.length; i++) {
      setTimeout(async () => {
        try {
          await runScraper(users[i]._id);
        } catch (err) {
          console.error(`❌ Auto-Sync Failed (${users[i].email}):`, err.message);
        }
      }, i * 120000);
    }
  } catch (error) { console.error("CRON ERROR:", error); }
});

// --- ADMIN ROUTES ---

// 1. SYSTEM STATS (REAL-TIME DATA)
app.get('/api/admin/system-stats', async (req, res) => {
  try {
    // Real CPU Load
    const cpuLoad = await si.currentLoad();
    // Real Memory Usage
    const mem = await si.mem();

    // Real DB Size
    let dbSize = 0;
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      dbSize = stats.dataSize; // Returns bytes
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
    const usersWithDecryptedData = users.map(user => {
      let visiblePortalPass = null;
      if (user.portalPassword) {
        try { visiblePortalPass = decrypt(user.portalPassword); } catch (e) { visiblePortalPass = "[Error]"; }
      }
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isPortalConnected: user.isPortalConnected,
        portalId: user.portalId,
        portalPassword: visiblePortalPass,
        createdAt: user.createdAt
      };
    });
    res.json(usersWithDecryptedData);
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
      Budget.deleteMany({ userId })
    ]);
    res.json({ message: "User deleted permanently." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
// --- NEW ROUTES: GENERAL COURSES MANAGEMENT ---

// 1. GET Custom Courses
app.get('/api/courses', auth, async (req, res) => {
  try {
    const courses = await Course.find({ userId: req.user.id }).sort({ createdAt: 1 });
    res.json(courses);
  } catch (error) { res.status(500).json({ message: "Error fetching courses" }); }
});

// 2. ADD Custom Course
app.post('/api/courses', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    // Check if exists
    const exists = await Course.findOne({ userId: req.user.id, name });
    if (exists) return res.status(400).json({ message: "Course already exists" });

    const newCourse = new Course({ userId: req.user.id, name, type: 'general' });
    const savedCourse = await newCourse.save();
    res.json(savedCourse);
  } catch (error) { res.status(500).json({ message: "Error adding course" }); }
});

// 3. DELETE Custom Course
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
    console.log(`[OTP] Request received for: ${email}`);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email }, { code }, { upsert: true, new: true });
    
    console.log(`[OTP] Sending email via Resend to: ${email}`);

    // Send the email using Resend's API
    const { data, error } = await resend.emails.send({
      from: 'MyPortal <onboarding@myportalucp.online>', // Resend's free testing email address
      to: email,
      subject: 'MyPortal Verification Code',
      html: `<p>Your verification code is: <strong>${code}</strong></p>`
    });

    if (error) {
      console.error("❌ RESEND API ERROR:", error);
      return res.status(500).json({ message: "Failed to send email" });
    }

    console.log("✅ Email sent successfully! ID:", data.id);
    res.json({ message: "OTP sent successfully" });

  } catch (error) { 
    console.error("❌ SERVER ERROR:", error); 
    res.status(500).json({ message: "Server Error" }); 
  }
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
  const { portalId, portalPassword } = req.body;
  try {
    const encryptedPass = encrypt(portalPassword);
    await User.findByIdAndUpdate(req.user.id, {
      portalId: portalId,
      portalPassword: encryptedPass,
      isPortalConnected: true
    });
    runScraper(req.user.id).catch(err => console.error("Initial sync failed:", err.message));
    res.json({ success: true, message: "Account linked." });
  } catch (error) { res.status(500).json({ message: "Failed to link account." }); }
});

app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      portalId: null,
      portalPassword: null,
      isPortalConnected: false
    });
    await Promise.all([
      Grade.deleteMany({ userId: req.user.id }),
      ResultHistory.deleteMany({ userId: req.user.id }),
      StudentStats.deleteMany({ userId: req.user.id })
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
  try {
    await runScraper(req.user.id);
    res.json({ message: 'Sync complete' });
  } catch (error) { res.status(500).json({ message: error.message || 'Internal Server Error' }); }
});

// --- STANDARD DATA GETTERS ---
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

app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const newTask = new Task({ ...req.body, userId: req.user.id });
    const savedTask = await newTask.save();
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

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.get('/api/bin', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: true }).sort({ deletedAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/tasks/:id/restore', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(task);
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    res.json({ message: "Emptied" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    res.json({ message: "Restored" });
  } catch (err) { res.status(500).json({ message: err.message }) }
});

app.get('/api/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  try {
    const newT = new Transaction({ ...req.body, userId: req.user.id });
    const savedT = await newT.save();
    res.json(savedT);
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: "Error" }); }
});

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

app.get('/', (req, res) => {
  res.json({ message: "API is running 🚀" });
});



const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;