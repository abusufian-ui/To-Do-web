require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function runRawTest() {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = 'myportal/apk';
  
  // Mimic backend signature generation
  const params = {
    timestamp,
    folder
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  const testFile = path.join(__dirname, 'test_apk.zip');
  fs.writeFileSync(testFile, 'This is a mock APK binary data for testing signed raw upload.');

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile));
    formData.append('api_key', process.env.CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    console.log("Sending POST request to Cloudinary...");
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );
    console.log("Upload Success! Response Data:");
    console.log(response.data);
  } catch (error) {
    console.error("Upload Failed!");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error Message:", error.message);
    }
  } finally {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
}

runRawTest();
