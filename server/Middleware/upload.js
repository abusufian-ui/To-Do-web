const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // FIX for PDF access: Force "raw" type for documents
    if (file.originalname.match(/\.(pdf|doc|docx)$/i)) {
      return {
        folder: 'portal_uploads',
        resource_type: 'raw', 
      };
    }
    return {
      folder: 'portal_uploads',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] 
    };
  },
});

// THIS LINE WAS MISSING OR BROKEN
const upload = multer({ storage: storage });

module.exports = upload;