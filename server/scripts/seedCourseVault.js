'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { uploadToB2, getMimeType } = require('../utils/b2Client');
const { detectPaperType } = require('../utils/vaultClassifier');
const CourseVaultFile = require('../models/CourseVaultFile');

const LOCAL_DATA_DIR = 'C:\\Course Data';

const normStr = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');

async function seedCourseVault() {
  console.log('🚀 Starting Course Vault Local Seeding Script...');
  
  const mongoUri = process.env.REACT_APP_MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ FATAL: REACT_APP_MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.');

  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    console.error(`❌ FATAL: Directory "${LOCAL_DATA_DIR}" does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(LOCAL_DATA_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📂 Found ${files.length} PDF files in ${LOCAL_DATA_DIR}`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const fileNameRegex = /^(.+?)\s+\(([A-Za-z0-9\-]+)\)\s+(.+)\.pdf$/i;

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(LOCAL_DATA_DIR, fileName);

    try {
      const match = fileName.match(fileNameRegex);
      let courseName = '';
      let rawAbbr = '';
      let displayName = '';

      if (match) {
        courseName = match[1].trim();
        rawAbbr = match[2].trim();
        displayName = match[3].trim();
      } else {
        // Fallback parsing if parentheses missing
        displayName = fileName.replace(/\.pdf$/i, '');
        courseName = displayName;
        rawAbbr = 'COURSE';
      }

      let abbreviation = rawAbbr;
      if (courseName.toLowerCase().includes('-lab') || courseName.toLowerCase().includes(' lab')) {
        if (!abbreviation.toLowerCase().endsWith('-lab')) {
          abbreviation = `${abbreviation}-Lab`;
        }
      }

      const buffer = fs.readFileSync(filePath);
      const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check if hash already exists in DB
      const existingHash = await CourseVaultFile.findOne({ contentHash });
      if (existingHash) {
        console.log(`[${i + 1}/${files.length}] ⏭️ Skipped (duplicate hash): "${fileName}"`);
        skippedCount++;
        continue;
      }

      const courseSlug = normStr(courseName);
      const safeDisplay = displayName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const b2Key = `course-vault-papers/${courseSlug}/${Date.now()}_${safeDisplay}.pdf`;

      await uploadToB2(b2Key, buffer, 'application/pdf');

      const paperType = detectPaperType(displayName);

      await CourseVaultFile.create({
        courseCode: abbreviation,
        courseName,
        abbreviation,
        displayName,
        teacherName: '',
        category: 'past_paper',
        paperType,
        contentHash,
        source: 'local_seed',
        status: 'published',
        fileName,
        normalizedFileName: normStr(fileName),
        b2Key,
        fileType: 'pdf',
        fileSize: buffer.length
      });

      console.log(`[${i + 1}/${files.length}] ✅ Uploaded & Created: [${abbreviation}] ${courseName} -> "${displayName}" (${paperType})`);
      uploadedCount++;
    } catch (err) {
      console.error(`[${i + 1}/${files.length}] ❌ Error processing "${fileName}":`, err.message);
      errorCount++;
    }
  }

  console.log('\n================ SUMMARY ================');
  console.log(`Total Files Processed: ${files.length}`);
  console.log(`Successfully Uploaded: ${uploadedCount}`);
  console.log(`Skipped (Duplicates): ${skippedCount}`);
  console.log(`Errors:               ${errorCount}`);
  console.log('=========================================\n');

  await mongoose.disconnect();
  console.log('👋 MongoDB disconnected. Seeding complete!');
  process.exit(0);
}

seedCourseVault();
