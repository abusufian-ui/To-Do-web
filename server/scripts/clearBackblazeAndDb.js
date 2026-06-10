const mongoose = require('mongoose');
const path = require('path');
const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.REACT_APP_MONGODB_URI;

async function run() {
  // 1. Clear database
  if (!MONGO_URI) {
    console.error("REACT_APP_MONGODB_URI not found in env!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const CourseMaterial = mongoose.model('CourseMaterial', new mongoose.Schema({}, { strict: false }), 'coursematerials');
  const CourseVaultFile = mongoose.model('CourseVaultFile', new mongoose.Schema({}, { strict: false }), 'coursevaultfiles');
  const CourseVaultBucket = mongoose.model('CourseVaultBucket', new mongoose.Schema({}, { strict: false }), 'coursevaultbuckets');
  const MaterialLink = mongoose.model('MaterialLink', new mongoose.Schema({}, { strict: false }), 'materiallinks');

  console.log("🗑️ Clearing MongoDB course material collections...");
  const d1 = await CourseMaterial.deleteMany({});
  const d2 = await CourseVaultFile.deleteMany({});
  const d3 = await CourseVaultBucket.deleteMany({});
  const d4 = await MaterialLink.deleteMany({});

  console.log(`Deleted:
  - CourseMaterial: ${d1.deletedCount} records
  - CourseVaultFile: ${d2.deletedCount} records
  - CourseVaultBucket: ${d3.deletedCount} records
  - MaterialLink: ${d4.deletedCount} records`);

  await mongoose.connection.close();

  // 2. Clear BackBlaze B2
  console.log("\n☁️ Connecting to Backblaze B2...");
  const { b2, B2_BUCKET } = require('../utils/b2Client');

  let deletedTotal = 0;
  let isTruncated = true;
  let nextContinuationToken = undefined;

  while (isTruncated) {
    const listCommand = new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      ContinuationToken: nextContinuationToken
    });

    const listRes = await b2.send(listCommand);
    const objects = listRes.Contents || [];

    if (objects.length > 0) {
      console.log(`Found ${objects.length} files in this batch. Deleting...`);
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: B2_BUCKET,
        Delete: {
          Objects: objects.map(o => ({ Key: o.Key }))
        }
      });

      const delRes = await b2.send(deleteCommand);
      deletedTotal += (delRes.Deleted || []).length;
      console.log(`Deleted batch of ${(delRes.Deleted || []).length} files.`);
    }

    isTruncated = listRes.IsTruncated;
    nextContinuationToken = listRes.NextContinuationToken;
  }

  console.log(`\n✅ Backblaze B2 cleanup complete! Deleted a total of ${deletedTotal} files.`);
  console.log("🏁 All environments are now clean and ready for a fresh portal sync test.");
}

run().catch(console.error);
