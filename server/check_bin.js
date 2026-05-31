const mongoose = require('mongoose');
const Task = require('./models/Task');
const Note = require('./models/Note');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const deletedTasks = await Task.find({ isDeleted: true });
  console.log("DELETED TASKS COUNT:", deletedTasks.length);
  deletedTasks.forEach(t => {
    console.log(`- Task: ${t.name}, ID: ${t._id}, UserID: ${t.userId}, isDeleted: ${t.isDeleted}`);
  });
  
  const deletedNotes = await Note.find({ isDeleted: true });
  console.log("DELETED NOTES COUNT:", deletedNotes.length);
  deletedNotes.forEach(n => {
    console.log(`- Note: ${n.title}, ID: ${n._id}, User: ${n.user}, isDeleted: ${n.isDeleted}`);
  });
  
  process.exit(0);
});
