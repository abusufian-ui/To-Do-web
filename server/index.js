require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 
const { encrypt, decrypt } = require('./utils/encryption');

// --- CONFIGURATION ---
const SUPER_ADMIN_EMAIL = "ranasuffyan9@gmail.com"; 

// --- NODEMAILER CONFIGURATION (OTP SYSTEM) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ranasuffyan9@gmail.com', 
    pass: 'vpoz szsz aave zyba' // Integrated your specific App Password
  }
});

// --- MIDDLEWARE ---
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
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

// --- OTP MODEL (Temporary Storage) ---
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete after 5 mins
});
const OTP = mongoose.model('OTP', otpSchema);

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

console.log("🔗 Connecting to MyPortal...");

mongoose.connect(dbLink)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully!");

    // --- AUTO-CLEANUP: Remove the old dummy admin ---
    try {
      const oldAdmin = await User.findOneAndDelete({ email: "admin@portal.com" });
      if (oldAdmin) {
        console.log("🗑️ CLEANUP: Removed old 'admin@portal.com' account.");
        await Promise.all([
            Grade.deleteMany({ userId: oldAdmin._id }),
            ResultHistory.deleteMany({ userId: oldAdmin._id }),
            StudentStats.deleteMany({ userId: oldAdmin._id }),
            Task.deleteMany({ userId: oldAdmin._id })
        ]);
      }
    } catch (e) { console.log("Cleanup check skipped."); }

  })
  .catch(err => console.log(err));

// --- SMART HOURLY AUTOSYNC (8 AM - 8 PM) ---
cron.schedule('0 8-20 * * *', async () => {
  console.log("⏰ CRON: Starting Hourly Auto-Sync...");
  try {
    const users = await User.find({ isPortalConnected: true });
    console.log(`   Queuing sync for ${users.length} users...`);

    for (let i = 0; i < users.length; i++) {
      setTimeout(async () => {
        try {
          console.log(`   🔄 Auto-Syncing: ${users[i].email}`);
          await runScraper(users[i]._id);
        } catch (err) {
          console.error(`   ❌ Auto-Sync Failed (${users[i].email}):`, err.message);
        }
      }, i * 120000); 
    }
  } catch (error) { console.error("CRON ERROR:", error); }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    const usersWithDecryptedData = users.map(user => {
      let visiblePortalPass = null;
      if (user.portalPassword) {
        try {
          visiblePortalPass = decrypt(user.portalPassword);
        } catch (e) {
          visiblePortalPass = "[Error Decrypting]";
        }
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ message: "You cannot delete yourself (The Super Admin)!" });
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

    console.log(`🚨 ADMIN: Deleted user ${user.email}`);
    res.json({ message: "User deleted permanently." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// --- AUTH ROUTES ---

// 1. SEND OTP ROUTE
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already registered" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndUpdate({ email }, { code }, { upsert: true, new: true });

    const mailOptions = {
      from: '"MyPortal Support" <ranasuffyan9@gmail.com>',
      to: email,
      subject: 'Verification Code: ' + code,
      text: `Your verification code for MyPortal is: ${code}. This code will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("SMTP Error:", error);
        return res.status(500).json({ message: "Failed to send email" });
      }
      res.json({ message: "OTP sent successfully" });
    });

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. REGISTER ROUTE
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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
    
    res.json({ 
        token, 
        user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } 
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. LOGIN ROUTE (Includes Auto-Upgrade and Sync Logic)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && !user.isAdmin) {
        console.log(`👑 Upgrading ${user.email} to Admin...`);
        user.isAdmin = true;
        await user.save();
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
    
    if (user.isPortalConnected) {
        StudentStats.findOne({ userId: user.id }).then(stats => {
            const lastUpdate = stats ? new Date(stats.lastUpdated) : new Date(0);
            const hoursSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60);
            if (hoursSinceUpdate > 1) {
                runScraper(user.id).catch(err => console.log(`Login Sync Skipped: ${err.message}`));
            }
        });
    }

    res.json({ 
        token, 
        user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } 
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.put('/api/user/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name }, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
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
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
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

    console.log(`🔗 New Portal Linked for ${req.user.id}. Starting initial sync...`);
    runScraper(req.user.id).catch(err => console.error("Initial sync failed:", err.message));
    
    res.json({ success: true, message: "Account linked. Sync started in background." });
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
    console.log(`🗑️ Portal Unlinked: Data wiped for user ${req.user.id}`);

    res.json({ success: true, message: "Portal account removed and data cleared." });
  } catch (error) { res.status(500).json({ message: "Failed to unlink account." }); }
});

app.get('/api/user/portal-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ 
      isConnected: !!user.portalId && user.isPortalConnected, 
      portalId: user.portalId 
    });
  } catch (error) { res.status(500).json({ message: "Error checking status" }); }
});

// --- DATA ROUTES ---
app.post('/api/sync-grades', auth, async (req, res) => {
  console.log(`👆 Manual sync triggered by user ${req.user.id}`);
  try {
    await runScraper(req.user.id); 
    res.json({ message: 'Sync complete' }); 
  } catch (error) {
    if (error.message === "PORTAL_DOWN") res.status(503).json({ message: 'Portal is down.' });
    else if (error.message === "ROBOT_BUSY") res.status(429).json({ message: 'Sync in progress.' });
    else if (error.message === "LOGIN_FAILED") res.status(401).json({ message: 'Login failed. Check credentials.' });
    else res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
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

// --- TASKS / BIN / CASH ROUTES ---
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: false }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const newTask = new Task({ ...req.body, userId: req.user.id });
    const savedTask = await newTask.save();
    res.json(savedTask);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const updatedTask = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { $set: req.body }, { new: true });
    res.json(updatedTask);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.put('/api/tasks/:id/delete', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: true, deletedAt: new Date() }, { new: true });
    res.json(task);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.get('/api/bin', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id, isDeleted: true }).sort({ deletedAt: -1 });
    res.json(tasks);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.put('/api/tasks/:id/restore', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { isDeleted: false, deletedAt: null }, { new: true });
    res.json(task);
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.delete('/api/bin/empty', auth, async (req, res) => {
  try {
    await Task.deleteMany({ userId: req.user.id, isDeleted: true });
    res.json({ message: "Emptied" });
  } catch (err) { res.status(500).json({message: err.message}) }
});

app.put('/api/bin/restore-all', auth, async (req, res) => {
  try {
    await Task.updateMany({ userId: req.user.id, isDeleted: true }, { isDeleted: false, deletedAt: null });
    res.json({ message: "Restored" });
  } catch (err) { res.status(500).json({message: err.message}) }
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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));