const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.REACT_APP_MONGODB_URI;

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

async function fixAllUserSemesters() {
  if (!MONGO_URI) {
    console.error('❌ REACT_APP_MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  const User = mongoose.model('User', new mongoose.Schema({ email: String, name: String, currentSemester: String }, { collection: 'users' }));
  const Course = mongoose.model('Course', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, name: String, type: String, code: String, semester: String }, { collection: 'courses' }));
  const ResultHistory = mongoose.model('ResultHistory', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, term: String }, { collection: 'resulthistories' }));

  const users = await User.find({}).lean();
  console.log(`📋 Processing ${users.length} total users...\n`);
  let updatedCount = 0;

  for (let i = 0; i < users.length; i += 20) {
    const chunk = users.slice(i, i + 20);
    await Promise.all(chunk.map(async (u) => {
      const courses = await Course.find({ userId: u._id, type: 'university' }).lean();
      if (!courses.length) return;

      const history = await ResultHistory.find({ userId: u._id }).lean();
      const historyTerms = new Set(history.map(h => normalizeSemesterTerm(h.term)));
      const activeSemesters = courses.map(c => c.semester).filter(s => s && !historyTerms.has(normalizeSemesterTerm(s)));

      let detectedCurrent = '';
      if (activeSemesters.length > 0) {
        const freq = {};
        activeSemesters.forEach(s => freq[s] = (freq[s] || 0) + 1);
        detectedCurrent = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
      } else {
        const courseSemesters = Array.from(new Set(courses.map(c => c.semester).filter(Boolean)));
        if (courseSemesters.length > 0) detectedCurrent = courseSemesters[courseSemesters.length - 1];
      }

      if (detectedCurrent && normalizeSemesterTerm(u.currentSemester) !== normalizeSemesterTerm(detectedCurrent)) {
        console.log(`  👤 ${u.name || u.email}: was="${u.currentSemester || '(empty)'}" → correct="${detectedCurrent}"`);
        await User.updateOne({ _id: u._id }, { currentSemester: detectedCurrent });
        updatedCount++;
      }
    }));
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`🏁 Complete! Updated user.currentSemester for ${updatedCount} users.`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.connection.close();
}

fixAllUserSemesters().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
