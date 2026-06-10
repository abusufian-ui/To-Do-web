const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.REACT_APP_MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error("REACT_APP_MONGODB_URI not found in env!");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected");

  // Models
  const CourseMaterial = mongoose.model('CourseMaterial', new mongoose.Schema({
    courseCode: String,
    sectionCode: String,
    normalizedFileName: String,
    semester: String,
    b2Key: String
  }, { collection: 'coursematerials' }));

  const CourseVaultFile = mongoose.model('CourseVaultFile', new mongoose.Schema({
    courseCode: String,
    teacherName: String,
    normalizedFileName: String,
    b2Key: String
  }, { collection: 'coursevaultfiles' }));

  const CourseVaultBucket = mongoose.model('CourseVaultBucket', new mongoose.Schema({
    courseCode: String,
    name: String
  }, { collection: 'coursevaultbuckets' }));

  const getGlobalCode = (code) => {
    if (!code) return '';
    return code.split('-')[0].trim();
  };

  // 1. CourseMaterial Migration
  console.log("\n📦 Migrating CourseMaterial...");
  const materials = await CourseMaterial.find({}).lean();
  console.log(`Loaded ${materials.length} records.`);

  const materialMap = new Map();
  const materialIdsToDelete = [];
  const materialUpdates = [];

  for (const doc of materials) {
    const globalCode = getGlobalCode(doc.courseCode);
    const key = `${globalCode}_${doc.sectionCode}_${doc.normalizedFileName}_${doc.semester}`;

    if (materialMap.has(key)) {
      materialIdsToDelete.push(doc._id);
    } else {
      materialMap.set(key, doc);
      if (globalCode !== doc.courseCode) {
        materialUpdates.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { courseCode: globalCode } }
          }
        });
      }
    }
  }

  if (materialIdsToDelete.length > 0) {
    console.log(`Deleting ${materialIdsToDelete.length} duplicates...`);
    const delRes = await CourseMaterial.deleteMany({ _id: { $in: materialIdsToDelete } });
    console.log(`Deleted ${delRes.deletedCount} documents.`);
  }

  if (materialUpdates.length > 0) {
    console.log(`Updating ${materialUpdates.length} records with global code...`);
    const updateRes = await CourseMaterial.bulkWrite(materialUpdates, { ordered: false });
    console.log(`Updated ${updateRes.modifiedCount} records.`);
  }

  // 2. CourseVaultFile Migration
  console.log("\n📁 Migrating CourseVaultFile...");
  const vaultFiles = await CourseVaultFile.find({}).lean();
  console.log(`Loaded ${vaultFiles.length} records.`);

  const vaultMap = new Map();
  const vaultIdsToDelete = [];
  const vaultUpdates = [];

  for (const doc of vaultFiles) {
    const globalCode = getGlobalCode(doc.courseCode);
    const key = `${globalCode}_${doc.teacherName}_${doc.normalizedFileName}`;

    if (vaultMap.has(key)) {
      vaultIdsToDelete.push(doc._id);
    } else {
      vaultMap.set(key, doc);
      if (globalCode !== doc.courseCode) {
        vaultUpdates.push({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { courseCode: globalCode } }
          }
        });
      }
    }
  }

  if (vaultIdsToDelete.length > 0) {
    console.log(`Deleting ${vaultIdsToDelete.length} duplicates...`);
    const delRes = await CourseVaultFile.deleteMany({ _id: { $in: vaultIdsToDelete } });
    console.log(`Deleted ${delRes.deletedCount} documents.`);
  }

  if (vaultUpdates.length > 0) {
    console.log(`Updating ${vaultUpdates.length} records with global code...`);
    const updateRes = await CourseVaultFile.bulkWrite(vaultUpdates, { ordered: false });
    console.log(`Updated ${updateRes.modifiedCount} records.`);
  }

  // 3. CourseVaultBucket Migration
  console.log("\n🪣 Migrating CourseVaultBucket...");
  const buckets = await CourseVaultBucket.find({ courseCode: { $regex: '-' } }).lean();
  console.log(`Found ${buckets.length} buckets to update.`);

  const bucketUpdates = [];
  for (const doc of buckets) {
    const globalCode = getGlobalCode(doc.courseCode);
    if (globalCode !== doc.courseCode) {
      bucketUpdates.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { courseCode: globalCode } }
        }
      });
    }
  }

  if (bucketUpdates.length > 0) {
    const updateRes = await CourseVaultBucket.bulkWrite(bucketUpdates, { ordered: false });
    console.log(`Updated ${updateRes.modifiedCount} buckets.`);
  }

  await mongoose.connection.close();
  console.log("\n🏁 Migration completed successfully.");
}

run().catch(console.error);
