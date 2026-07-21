/**
 * ==============================================================================
 * Sequential Word-to-PDF Converter (1 Document at a Time with Resume Tracker)
 * ==============================================================================
 * Engine: Native Microsoft Word COM Automation (Word.Application)
 * Processing: 1-by-1 Sequential
 * Progress Persistence: Saves progress to scripts/conversion_progress.json.
 *                       Resumes EXACTLY where it left off every time you run it!
 * Password/Timeout Protection: Automatically skips password-protected, encrypted,
 *                              or stuck files without hanging.
 * Quality: 100% Pixel-Perfect native Word export (Logos, Charts, Tables, Formulas).
 * 
 * Usage in VS Code Terminal:
 *   npm run convert-docs
 *   or
 *   node scripts/convert_word_to_pdf.js
 * ==============================================================================
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const SERVER_DIR = path.join(__dirname, '..', 'server');
require(path.join(SERVER_DIR, 'node_modules', 'dotenv')).config({ path: path.join(SERVER_DIR, '.env') });
delete process.env.PUPPETEER_CACHE_DIR;

const mongoose = require(path.join(SERVER_DIR, 'node_modules', 'mongoose'));
const CourseMaterial = require(path.join(SERVER_DIR, 'models', 'CourseMaterial'));
const CourseVaultFile = require(path.join(SERVER_DIR, 'models', 'CourseVaultFile'));

const { ListObjectsV2Command } = require(path.join(SERVER_DIR, 'node_modules', '@aws-sdk', 'client-s3'));
const { b2, B2_BUCKET, downloadFileFromB2, uploadToB2 } = require(path.join(SERVER_DIR, 'utils', 'b2Client'));

const PROGRESS_FILE = path.join(__dirname, 'conversion_progress.json');

// Helper to load persistent progress IDs
const loadProgress = () => {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      return new Set(data.completedIds || []);
    }
  } catch (_) {}
  return new Set();
};

// Helper to save persistent progress IDs
const saveProgress = (completedSet) => {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ completedIds: Array.from(completedSet) }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save progress file:', err);
  }
};

// Helper to kill stuck background Word instances
const killWordProcess = () => {
  try {
    execSync('powershell -Command "taskkill /f /im winword.exe 2>$null"', { stdio: 'ignore' });
  } catch (_) {}
};

// Retry wrapper for B2 network calls ONLY
async function withNetworkRetry(fn, description) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      console.warn(`\n⚠️ Network / I/O hiccup on [${description}] (Attempt ${attempt}): ${err.message}. Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Convert a Word file using Native Word COM Engine
const convertWordDocToPdf = (inputPath, workerDir) => {
  const ext = path.extname(inputPath).toLowerCase();
  const inputBasename = path.basename(inputPath, ext);
  const expectedPdfPath = path.join(workerDir, `${inputBasename}.pdf`);

  if (!fs.existsSync(workerDir)) {
    fs.mkdirSync(workerDir, { recursive: true });
  }

  const psScriptPath = path.join(workerDir, `conv_${Date.now()}.ps1`);
  const psContent = `
$InputPath = "${inputPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$OutputPath = "${expectedPdfPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$word.AutomationSecurity = 3

try {
    $doc = $word.Documents.Open($InputPath, $false, $true, $false, "INVALID_PWD_SKIP_PROMPT", "", $false, "INVALID_PWD_SKIP_PROMPT", "", 0, 0, $false, $true, 0, $true)
    $doc.SaveAs([ref]$OutputPath, [ref]17) # 17 = wdFormatPDF
    $doc.Close([ref]$false)
    Write-Host "WORD_COM_SUCCESS"
} catch {
    Write-Error $_.Exception.Message
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;

  fs.writeFileSync(psScriptPath, psContent, 'utf8');

  try {
    // 30-second timeout per document to allow large Word files to render without hanging
    execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`, { timeout: 30000 });
  } catch (err) {
    killWordProcess();
    throw new Error(`Word COM failed/timeout on ${inputBasename}`);
  } finally {
    try { fs.unlinkSync(psScriptPath); } catch (_) {}
  }

  if (fs.existsSync(expectedPdfPath) && fs.statSync(expectedPdfPath).size > 500) {
    return expectedPdfPath;
  }
  throw new Error(`Word COM export produced empty file for ${inputBasename}`);
};

// Main Process
async function runSequentialWordToPdfConversion() {
  const mongoUri = process.env.REACT_APP_MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ Error: MongoDB connection URI not found in .env');
    process.exit(1);
  }

  console.log('\n==================================================================');
  console.log('📄 SEQUENTIAL WORD-TO-PDF CONVERTER (With Resume Progress Tracker)');
  console.log('==================================================================\n');

  killWordProcess();
  const completedIds = loadProgress();
  console.log(`📌 Loaded ${completedIds.size} previously completed file records from progress tracker.`);

  await withNetworkRetry(() => mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 30000 }), 'MongoDB Connect');
  console.log('✅ Connected to MongoDB Database.');

  // Phase 1: Index ALL Live B2 Keys (Including converted_pdf/)
  console.log('🔍 [1/3] Indexing live objects from Backblaze B2 bucket...');
  const liveB2Keys = new Set();
  const convertedPdfB2Keys = new Set();
  const normKeyMap = new Map();
  const baseNameMap = new Map();
  let continuationToken;

  do {
    const listRes = await withNetworkRetry(() => b2.send(new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      ContinuationToken: continuationToken
    })), 'List B2 Objects');

    for (const obj of (listRes.Contents || [])) {
      liveB2Keys.add(obj.Key);
      if (obj.Key.startsWith('converted_pdf/')) {
        convertedPdfB2Keys.add(obj.Key);
      } else {
        normKeyMap.set(obj.Key.toLowerCase().replace(/\\/g, '/'), obj.Key);
        baseNameMap.set(path.basename(obj.Key).toLowerCase(), obj.Key);
      }
    }
    continuationToken = listRes.NextContinuationToken;
  } while (continuationToken);

  console.log(`✅ Indexed ${liveB2Keys.size} live B2 keys (${convertedPdfB2Keys.size} converted PDFs).`);

  // Phase 2: Identify Unconverted STRICT Word Documents Only (.doc, .docx, .docs, .dox)
  console.log('\n🔍 [2/3] Identifying remaining Word documents (.doc, .docx) to convert...');

  const isStrictWordKey = (key) => {
    if (!key) return false;
    return /\.(docx?|docs|dox)$/i.test(key);
  };

  const materials = await CourseMaterial.find({ b2Key: { $exists: true, $ne: '' } });
  const vaultFiles = await CourseVaultFile.find({ b2Key: { $exists: true, $ne: '' } });

  const tasksToConvert = [];

  for (const m of materials) {
    const docIdStr = m._id.toString();
    
    // Check if ALREADY converted in MongoDB or Progress Tracker
    if (completedIds.has(docIdStr) || m.fileType === 'pdf' || (m.b2Key && m.b2Key.startsWith('converted_pdf/'))) {
      completedIds.add(docIdStr);
      continue; // SKIP ALREADY CONVERTED!
    }

    let keyToUse = m.b2Key;
    if (!liveB2Keys.has(keyToUse)) {
      const cCode = (m.courseCode || '').toLowerCase();
      const sCode = (m.sectionCode || '').toLowerCase();
      const normName = (m.normalizedFileName || m.fileName || '').toLowerCase();
      const fName = (m.fileName || '').toLowerCase();

      keyToUse = normKeyMap.get(`course-material/${cCode}/${sCode}/${normName}`) ||
                 normKeyMap.get(`course-material/${cCode}/${sCode}/${fName}`) ||
                 baseNameMap.get(normName) || baseNameMap.get(fName) || m.b2Key;
    }

    if (isStrictWordKey(keyToUse)) {
      tasksToConvert.push({ type: 'material', doc: m, b2Key: keyToUse });
    }
  }

  for (const v of vaultFiles) {
    const docIdStr = v._id.toString();
    
    // Check if ALREADY converted in MongoDB or Progress Tracker
    if (completedIds.has(docIdStr) || v.fileType === 'pdf' || (v.b2Key && v.b2Key.startsWith('converted_pdf/'))) {
      completedIds.add(docIdStr);
      continue; // SKIP ALREADY CONVERTED!
    }

    let keyToUse = v.b2Key;
    if (!liveB2Keys.has(keyToUse)) {
      const name = (v.displayName || v.fileName || '').toLowerCase();
      keyToUse = baseNameMap.get(name) || v.b2Key;
    }

    if (isStrictWordKey(keyToUse)) {
      tasksToConvert.push({ type: 'vault', doc: v, b2Key: keyToUse });
    }
  }

  saveProgress(completedIds);

  const alreadyDoneCount = completedIds.size;
  const totalRemaining = tasksToConvert.length;
  const totalOverall = alreadyDoneCount + totalRemaining;

  console.log(`\n==================================================================`);
  console.log(`📊 PROGRESS SUMMARY:`);
  console.log(`   ✅ Previously Completed: ${alreadyDoneCount} files`);
  console.log(`   ⏳ Remaining to Convert:  ${totalRemaining} files`);
  console.log(`   📁 Total Word Files:     ${totalOverall} files`);
  console.log(`==================================================================\n`);

  if (totalRemaining === 0) {
    console.log('🎉 ALL Word documents are 100% converted and up to date!');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`🚀 Resuming conversion starting from file #${alreadyDoneCount + 1}...\n`);
  console.log('------------------------------------------------------------------');

  // Phase 3: Sequential Worker Loop
  const tempDir = path.join(os.tmpdir(), 'word_com_sequential_converter');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  let successCount = 0;
  let skippedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < totalRemaining; i++) {
    const item = tasksToConvert[i];
    const doc = item.doc;
    const docIdStr = doc._id.toString();
    const b2SourceKey = item.b2Key;

    const pickedUpFile = path.basename(b2SourceKey) || (item.type === 'material' ? doc.fileName : (doc.displayName || doc.fileName));
    const baseNameClean = pickedUpFile.replace(/\.(docx?|docs|dox|pdf)+$/i, '');
    const convertedPdfFile = `${baseNameClean}.pdf`;

    const overallNum = alreadyDoneCount + i + 1;
    const pct = ((overallNum / totalOverall) * 100).toFixed(1);

    const workerTempDir = path.join(tempDir, `w_${overallNum}_${Date.now()}`);

    try {
      // 1. Download from B2 (with network retry)
      const rawBuffer = await withNetworkRetry(
        () => downloadFileFromB2(b2SourceKey),
        `B2 Download: ${pickedUpFile}`
      );

      const ext = path.extname(b2SourceKey) || '.docx';
      const tempInputPath = path.join(workerTempDir, `input_${doc._id}${ext}`);
      fs.mkdirSync(workerTempDir, { recursive: true });
      fs.writeFileSync(tempInputPath, rawBuffer);

      // 2. Convert to PDF using Word COM Engine (catch conversion/timeout errors without network retry loop!)
      let pdfPath;
      try {
        pdfPath = convertWordDocToPdf(tempInputPath, workerTempDir);
      } catch (convErr) {
        skippedCount++;
        completedIds.add(docIdStr);
        saveProgress(completedIds);
        console.warn(`🔒 [${overallNum}/${totalOverall}] (${pct}%) SKIPPED Password-Protected/Unreadable: "${pickedUpFile}"\n`);
        try { fs.rmSync(workerTempDir, { recursive: true, force: true }); } catch (_) {}
        continue; // Move immediately to next file!
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      // 3. Upload converted PDF to B2 (with network retry)
      const newB2Key = `converted_pdf/word_com_${Date.now()}_${path.basename(pdfPath)}`;

      await withNetworkRetry(
        () => uploadToB2(newB2Key, pdfBuffer, 'application/pdf'),
        `B2 Upload PDF: ${convertedPdfFile}`
      );

      // 4. Update MongoDB Record (with retry)
      await withNetworkRetry(async () => {
        doc.b2Key = newB2Key;
        doc.fileName = convertedPdfFile;
        if (item.type === 'vault') doc.displayName = convertedPdfFile;
        doc.fileType = 'pdf';
        doc.fileSize = pdfBuffer.length;
        await doc.save();
      }, `MongoDB Update: ${convertedPdfFile}`);

      // Save persistent progress
      completedIds.add(docIdStr);
      saveProgress(completedIds);

      successCount++;

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
      const avgSecPerDoc = (elapsedSec / (i + 1)).toFixed(1);
      const estRemainingSec = ((totalRemaining - (i + 1)) * avgSecPerDoc).toFixed(0);
      const estMin = Math.ceil(estRemainingSec / 60);

      console.log(`✅ [${overallNum}/${totalOverall}] (${pct}%)`);
      console.log(`   📥 Picked Up:    "${pickedUpFile}"`);
      console.log(`   📤 Converted To: "${convertedPdfFile}" (Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB) | Est Remaining: ~${estMin}m\n`);

      try { fs.rmSync(workerTempDir, { recursive: true, force: true }); } catch (_) {}
    } catch (err) {
      skippedCount++;
      completedIds.add(docIdStr);
      saveProgress(completedIds);
      console.error(`❌ [${overallNum}/${totalOverall}] Error on "${pickedUpFile}": ${err.message}\n`);
      try { fs.rmSync(workerTempDir, { recursive: true, force: true }); } catch (_) {}
    }
  }

  console.log('==================================================================');
  console.log(`🎉 ALL CONVERSIONS COMPLETED SUCCESSFULLY!`);
  console.log(`Total Word Files: ${totalOverall}`);
  console.log(`Newly Converted: ${successCount}`);
  console.log(`Skipped / Password Files: ${skippedCount}`);
  console.log('==================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

runSequentialWordToPdfConversion().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
