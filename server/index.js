require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encrypt, decrypt } = require('./utils/encryption');

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

const runScraper = require('./scraper');

// --- MODELS ---
const User = require('./models/User');
const Task = require('./models/Task');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const { Transaction, Budget } = require('./models/Transaction');

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

console.log("🔗 Connecting to MyPortal...");

mongoose.connect(dbLink)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log(err));

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- PORTAL CONNECTION ROUTES ---

app.post('/api/user/link-portal', auth, async (req, res) => {
  const { portalId, portalPassword } = req.body;
  try {
    const encryptedPass = encrypt(portalPassword);
    
    await User.findByIdAndUpdate(req.user.id, {
      portalId: portalId,
      portalPassword: encryptedPass,
      isPortalConnected: true
    });
    
    res.json({ success: true, message: "Portal account linked securely." });
  } catch (error) {
    res.status(500).json({ message: "Failed to link account." });
  }
});

app.post('/api/user/unlink-portal', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      portalId: null,
      portalPassword: null,
      isPortalConnected: false
    });
    res.json({ success: true, message: "Portal account removed." });
  } catch (error) {
    res.status(500).json({ message: "Failed to unlink account." });
  }
});

app.get('/api/user/portal-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ 
      isConnected: !!user.portalId && user.isPortalConnected, 
      portalId: user.portalId 
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking status" });
  }
});

// --- DATA ROUTES ---

app.post('/api/sync-grades', auth, async (req, res) => {
  console.log(`👆 Manual sync triggered by user ${req.user.id}`);
  try {
    await runScraper(req.user.id); 
    res.json({ message: 'Sync complete' }); 
  } catch (error) {
    console.error("Sync failed:", error.message);
    if (error.message === "PORTAL_DOWN") {
        res.status(503).json({ message: 'University Portal is currently down (403/502).' });
    } else if (error.message === "ROBOT_BUSY") {
        res.status(429).json({ message: 'Sync already in progress. Please wait.' });
    } else if (error.message === "LOGIN_FAILED") {
        res.status(401).json({ message: 'Portal login failed. Check your saved credentials.' });
    } else if (error.message === "NO_CREDENTIALS") {
        res.status(400).json({ message: 'No portal account linked. Please link it in Settings.' });
    } else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
  }
});

app.get('/api/student-stats', auth, async (req, res) => {
  try {
    const stats = await StudentStats.findOne({ userId: req.user.id });
    // Return saved data from DB, only returning defaults if no record exists
    res.json(stats || { cgpa: "0.00", credits: "0", inprogressCr: "0" });
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
});

app.get('/api/grades', auth, async (req, res) => {
  try {
    const grades = await Grade.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(grades);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
});

app.get('/api/results-history', auth, async (req, res) => {
  try {
    // Ensure history is scoped to the current user and sorted by semester
    const history = await ResultHistory.find({ userId: req.user.id }).sort({ lastUpdated: 1 });
    res.json(history);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
});

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

// Cash Manager
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