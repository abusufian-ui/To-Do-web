require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function runTest() {
  console.log("Cloudinary Configuration:");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
  console.log("API Key:", process.env.CLOUDINARY_API_KEY);
  console.log("API Secret Length:", process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.length : 0);

  const testFile = path.join(__dirname, 'test_raw.apk');
  fs.writeFileSync(testFile, 'This is a test raw upload to verify Cloudinary credentials.');

  try {
    console.log("\nAttempting to upload raw resource...");
    const result = await cloudinary.uploader.upload(testFile, {
      resource_type: 'raw',
      folder: 'myportal/test_apk'
    });
    console.log("Success! Uploaded URL:", result.secure_url);
  } catch (error) {
    console.error("Upload failed with error:", error);
  } finally {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  }
}

runTest();
