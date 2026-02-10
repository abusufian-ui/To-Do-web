require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron'); 

// Import the Robot
const runScraper = require('./scraper')

const Task = require('./models/Task');
const Course = require('./models/Course');
const Grade = require('./models/Grade');

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

console.log("🔗 Connecting to MyPortal...");

mongoose.connect(dbLink)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log(err));

// --- AUTOMATION SCHEDULER ---
cron.schedule('*/30 * * * *', () => {
  console.log('⏰ Running scheduled grade sync...');
  runScraper();
});

// --- MANUAL ROUTE (UPDATED) ---
// We added 'async' and 'await' so the response waits for the robot
app.post('/api/sync-grades', async (req, res) => {
  console.log('👆 Manual grade sync triggered');
  try {
    await runScraper(); // <--- SERVER NOW WAITS HERE
    res.json({ message: 'Sync complete' }); // Sent ONLY when robot finishes
  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).json({ message: 'Sync failed' });
  }
});

// --- API ROUTES ---

app.get('/api/grades', async (req, res) => {
  try {
    const grades = await Grade.find().sort({ lastUpdated: -1 });
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));