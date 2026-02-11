require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron'); 

const runScraper = require('./scraper');

const Task = require('./models/Task');
const Grade = require('./models/Grade');
const ResultHistory = require('./models/ResultHistory');
const StudentStats = require('./models/StudentStats');
const { Transaction, Budget } = require('./models/Transaction'); // <--- NEW IMPORT

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

console.log("🔗 Connecting to MyPortal...");

mongoose.connect(dbLink)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log(err));

// --- AUTOMATION ---
cron.schedule('*/30 * * * *', () => {
  console.log('⏰ Running scheduled sync...');
  runScraper();
});

// --- SYNC ROUTE ---
app.post('/api/sync-grades', async (req, res) => {
  console.log('👆 Manual sync triggered');
  try {
    await runScraper(); 
    res.json({ message: 'Sync complete' }); 
  } catch (error) {
    console.error("Sync failed:", error.message);
    if (error.message === "PORTAL_DOWN") {
        res.status(503).json({ message: 'University Portal is currently down (403/502).' });
    } else if (error.message === "ROBOT_BUSY") {
        res.status(429).json({ message: 'Sync already in progress.' });
    } else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
  }
});

// --- API ROUTES ---

// 1. GET STUDENT STATS
app.get('/api/student-stats', async (req, res) => {
  try {
    const stats = await StudentStats.findOne().sort({ lastUpdated: -1 });
    res.json(stats || { cgpa: "0.00", credits: "0" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET GRADES
app.get('/api/grades', async (req, res) => {
  try {
    const grades = await Grade.find().sort({ lastUpdated: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. GET HISTORY
app.get('/api/results-history', async (req, res) => {
  try {
    const history = await ResultHistory.find();
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. TASKS CRUD
app.get('/api/tasks', async (req, res) => {
  const tasks = await Task.find({ isDeleted: false }).sort({ createdAt: -1 });
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const newTask = new Task(req.body);
  const savedTask = await newTask.save();
  res.json(savedTask);
});

app.put('/api/tasks/:id', async (req, res) => {
  const updatedTask = await Task.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  res.json(updatedTask);
});

app.put('/api/tasks/:id/delete', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.get('/api/bin', async (req, res) => {
  const tasks = await Task.find({ isDeleted: true }).sort({ deletedAt: -1 });
  res.json(tasks);
});

app.put('/api/tasks/:id/restore', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
  res.json(task);
});

app.delete('/api/bin/empty', async (req, res) => {
  await Task.deleteMany({ isDeleted: true });
  res.json({ message: "Emptied" });
});

app.put('/api/bin/restore-all', async (req, res) => {
  await Task.updateMany({ isDeleted: true }, { isDeleted: false, deletedAt: null });
  res.json({ message: "Restored" });
});

// --- 5. CASH MANAGER ROUTES (NEW) ---

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions" });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const newT = new Transaction(req.body);
    const savedT = await newT.save();
    res.json(savedT);
  } catch (error) {
    res.status(500).json({ message: "Error saving transaction" });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting transaction" });
  }
});

app.get('/api/budgets', async (req, res) => {
  try {
    const budgets = await Budget.find();
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching budgets" });
  }
});

app.post('/api/budgets', async (req, res) => {
  try {
    const { category, limit } = req.body;
    const budget = await Budget.findOneAndUpdate(
      { category },
      { limit },
      { upsert: true, new: true }
    );
    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: "Error saving budget" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));