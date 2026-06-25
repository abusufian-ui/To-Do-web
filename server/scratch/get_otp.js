require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const dbUri = process.env.REACT_APP_MONGODB_URI || 'mongodb://localhost:27017/todo';

const otpSchema = new mongoose.Schema({
  email: String,
  code: String
}, { collection: 'otps' });

const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected to database.');
    const otps = await OTP.find({});
    console.log('Active OTPs:');
    otps.forEach(o => {
      console.log(`- ${o.email}: ${o.code}`);
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
  });
