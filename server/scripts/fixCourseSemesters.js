const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.REACT_APP_MONGODB_URI;

// ─── Fixed semester parser (mirrors scraperEngine.js after Fix #0) ─────────
const parseSemesterFromCourseCode = (courseCode) => {
  if (!courseCode) return null;
  const parts = courseCode.trim().split('-');
  const candidates = parts.length === 1 ? [parts[0]] : (parts.length >= 2 ? [parts[1]] : []);
  for (const candidate of candidates) {
    const cleanPart = candidate.trim();
    const match = cleanPart.match(/^([sSfFuUrR])(\d{2})$/);
    if (match) {
      const seasonChar = match[1].toLowerCase();
      const year = match[2];
      let season = '';
      if (seasonChar === 's') season = 'spring';
      else if (seasonChar === 'f') season = 'fall';
      else if (seasonChar === 'u') season = 'summer';
      else if (seasonChar === 'r') season = 'summer';
      if (season) return `${season} ${year}`;
    }
  }
  return null;
};

// ─── Minimal schemas (no full index.js load) ──────────────────────────────
const CourseSchema = new mongoose.Schema(
  { userId: mongoose.Schema.Types.ObjectId, name: String, type: String, code: String, semester: String },
  { collection: 'courses' }
);
const TimetableSchema = new mongoose.Schema(
  { userId: mongoose.Schema.Types.ObjectId, semester: String },
  { collection: 'timetablemodels' }
);
const UserSchema = new mongoose.Schema(
  { name: String, email: String, isPortalConnected: Boolean, isSemesterCompleted: Boolean, lastCompletedSemester: String, currentSemester: String },
  { collection: 'users' }
);
const ResultHistorySchema = new mongoose.Schema(
  { userId: mongoose.Schema.Types.ObjectId, term: String },
  { collection: 'resulthistories' }
);

// Returns true if semester string is a pre-portal batch-year code (before Spring 2026)
const isBatchYearSemester = (sem) => {
  if (!sem) return false;
  const m = sem.trim().match(/^(spring|summer|fall|winter)\s+(\d{2,4})$/i);
  if (!m) return false;
  const yearStr = m[2];
  const fullYear = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
  const season = m[1].toLowerCase();
  if (fullYear < 2026) return true;
  // Spring 2026 is a valid past semester (portal launched then)
  if (fullYear === 2026 && (season === 'spring' || season === 'summer')) return false;
  return false;
};

const normalizeSemesterTerm = (term) => {
  if (!term) return '';
  let t = term.trim();
  const m = t.match(/^(spring|summer|fall|winter)\s+(\d{2,4})$/i);
  if (m) {
    const season = m[1].toLowerCase();
    const yr = m[2].length === 4 ? m[2].slice(2) : m[2];
    return `${season} ${yr}`;
  }
  return t.toLowerCase();
};

async function run() {
  if (!MONGO_URI) { console.error('❌  REACT_APP_MONGODB_URI not set'); process.exit(1); }

  console.log('🔌  Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected\n');

  const Course        = mongoose.model('MigCourse',        CourseSchema);
  const Timetable     = mongoose.model('MigTimetable',     TimetableSchema);
  const User          = mongoose.model('MigUser',          UserSchema);
  const ResultHistory = mongoose.model('MigResultHistory', ResultHistorySchema);

  let totalCoursesFixed       = 0;
  let totalTimetableDeleted   = 0;
  let totalUsersResetFlag     = 0;
  let totalUserSemestersFixed = 0;

  const users = await User.find({}).lean();
  console.log(`📋  Processing ${users.length} total users...\n`);

  for (const user of users) {
    const userId   = user._id;
    const label    = user.name || user.email || userId.toString();
    const wrongSems = new Set();

    // ── Re-parse every university course semester ────────────────────────
    let courses = await Course.find({ userId, type: 'university' }).lean();
    if (courses.length > 0) {
      const bulkOps = [];
      for (const course of courses) {
        if (!course.code) continue;
        const correct = parseSemesterFromCourseCode(course.code);
        if (!correct) continue;
        if (course.semester === correct) continue;

        console.log(`  👤 ${label}`);
        console.log(`     "${course.name}"  |  code="${course.code}"`);
        console.log(`     was="${course.semester || '(empty)'}"  →  correct="${correct}"`);

        if (course.semester) wrongSems.add(course.semester);

        bulkOps.push({ updateOne: { filter: { _id: course._id }, update: { $set: { semester: correct } } } });
      }

      if (bulkOps.length) {
        const r = await Course.bulkWrite(bulkOps, { ordered: false });
        totalCoursesFixed += r.modifiedCount;
        console.log(`  ✅  Fixed ${r.modifiedCount} course(s)\n`);
        courses = await Course.find({ userId, type: 'university' }).lean();
      }
    }

    // ── Delete orphaned Timetable entries for corrected-away semesters ───
    for (const bad of wrongSems) {
      const d = await Timetable.deleteMany({ userId, semester: bad });
      if (d.deletedCount > 0) {
        console.log(`  🗑️   Deleted ${d.deletedCount} timetable entries (semester="${bad}") for ${label}`);
        totalTimetableDeleted += d.deletedCount;
      }
    }

    // ── Update user.currentSemester on the User collection ────────────────
    const history = await ResultHistory.find({ userId }).lean();
    const historyTerms = new Set(history.map(h => normalizeSemesterTerm(h.term)));
    const activeSemesters = courses.map(c => c.semester).filter(s => s && !historyTerms.has(normalizeSemesterTerm(s)));

    let detectedCurrent = '';
    if (activeSemesters.length > 0) {
      const freq = {};
      activeSemesters.forEach(s => freq[s] = (freq[s] || 0) + 1);
      detectedCurrent = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
    } else if (courses.length > 0) {
      const validSems = Array.from(new Set(courses.map(c => c.semester).filter(Boolean)));
      if (validSems.length > 0) {
        detectedCurrent = validSems[validSems.length - 1];
      }
    }

    if (detectedCurrent && normalizeSemesterTerm(user.currentSemester) !== normalizeSemesterTerm(detectedCurrent)) {
      console.log(`  🔄  Updating user.currentSemester for ${label}: "${user.currentSemester || '(empty)'}" → "${detectedCurrent}"`);
      await User.updateOne({ _id: userId }, { $set: { currentSemester: detectedCurrent } });
      totalUserSemestersFixed++;
    } else if (!user.currentSemester && detectedCurrent) {
      await User.updateOne({ _id: userId }, { $set: { currentSemester: detectedCurrent } });
      totalUserSemestersFixed++;
    }

    // ── Reset isSemesterCompleted if it was triggered by a batch-year ────
    if (user.isSemesterCompleted && isBatchYearSemester(user.lastCompletedSemester)) {
      console.log(`  🔄  Resetting isSemesterCompleted for ${label} (lastCompletedSemester="${user.lastCompletedSemester}" is a batch-year)`);
      await User.updateOne({ _id: userId }, { $set: { isSemesterCompleted: false, lastCompletedSemester: '' } });
      totalUsersResetFlag++;
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('🏁  Migration complete!');
  console.log(`   Courses fixed             : ${totalCoursesFixed}`);
  console.log(`   Timetable entries deleted  : ${totalTimetableDeleted}`);
  console.log(`   User currentSemesters fixed: ${totalUserSemestersFixed}`);
  console.log(`   Users flag reset           : ${totalUsersResetFlag}`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.connection.close();
}

run().catch((err) => { console.error('❌  Migration failed:', err); process.exit(1); });
