const mongoose = require('mongoose');
const Grade = require('./models/Grade');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.REACT_APP_MONGODB_URI).then(async () => {
  const grades = await Grade.find({ userId: { $in: ['6a1a0edb208583201ef6c495', '698d82ecfd7fe29835c9a7e8'] }, courseName: /Automata/i });
  console.log('Grades:', grades.length);
  process.exit(0);
});
