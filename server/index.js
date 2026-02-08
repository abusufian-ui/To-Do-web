const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Task = require('./models/Task');
const Course = require('./models/Course');

const app = express();

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---

// WE ARE USING THE "LONG LINK" MANUALLY TO BYPASS THE BLOCK
// This connects directly to your new "MyPortal" servers
const dbLink = "mongodb://admin_rs:Sufian56@ac-lebwcdg-shard-00-00.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-01.t1ps9ec.mongodb.net:27017,ac-lebwcdg-shard-00-02.t1ps9ec.mongodb.net:27017/?ssl=true&authSource=admin&retryWrites=true&w=majority";

console.log("🔗 Connecting to MyPortal (Direct Mode)...");

mongoose.connect(dbLink)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => {
    console.log("❌ Connection Error:");
    console.log(err);
  });

// --- API ROUTES ---

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

app.get('/api/bin', async (req, res) => {
  const tasks = await Task.find({ isDeleted: true }).sort({ deletedAt: -1 });
  res.json(tasks);
});

app.put('/api/tasks/:id/restore', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
  res.json(task);
});

app.delete('/api/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

app.delete('/api/bin/empty', async (req, res) => {
  await Task.deleteMany({ isDeleted: true });
  res.json({ message: "Emptied" });
});

app.put('/api/bin/restore-all', async (req, res) => {
  await Task.updateMany({ isDeleted: true }, { isDeleted: false, deletedAt: null });
  res.json({ message: "Restored" });
});

app.get('/api/courses', async (req, res) => {
  const courses = await Course.find();
  res.json(courses);
});

app.post('/api/courses', async (req, res) => {
  const newCourse = new Course(req.body);
  await newCourse.save();
  res.json(newCourse);
});

app.delete('/api/courses/:id', async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));