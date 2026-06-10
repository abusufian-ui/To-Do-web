app.get('/api/attendance', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(attendance);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/submissions', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(submissions);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/datesheet', auth, async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(exams);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/assessments', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.id }).sort({ dueDate: 1 });
    res.json(assessments);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/assessments', auth, async (req, res) => {
  try {
    const newAssessment = new Assessment({ ...req.body, userId: req.user.id });
    await newAssessment.save();
    res.json(newAssessment);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/assessments/:id/status', auth, async (req, res) => {
  try {
    const updated = await Assessment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/assessments/:id', auth, async (req, res) => {
  try {
    const updated = await Assessment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/assessments/:id', auth, async (req, res) => {
  try {
    await Assessment.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/announcements', auth, async (req, res) => {
  try {
    const announcements = await Announcement.find({ userId: req.user.id }).sort({ lastUpdated: -1 });
    res.json(announcements);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/course-records/:courseName', auth, async (req, res) => {
  try {
    const courseName = decodeURIComponent(req.params.courseName);
    const userId = req.user.id;
    const [announcements, attendance, submissions] = await Promise.all([
      Announcement.findOne({ userId, courseName }),
      Attendance.findOne({ userId, courseName }),
      Submission.findOne({ userId, courseName })
    ]);
    res.json({
      announcements: announcements?.news || [],
      attendance: attendance || { summary: { conducted: 0, attended: 0 }, records: [] },
      submissions: submissions?.tasks || []
    });
  } catch (error) { res.status(500).json({ message: "Error fetching course records" }); }
});

// Helper to compute a consistent content hash for a submissions tasks list
const computeSubmissionsHash = (tasks) => {
  const hash = crypto.createHash('md5');
  const serialized = (tasks || []).map(t => {
    const normalizedDueDate = parseUCPDate(t.dueDate);
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const desc = (t.description || '').replace(/\s+/g, ' ').trim();
    const status = t.status || 'Pending';
    const attachmentUrl = t.attachmentUrl || '';
    const submissionUrl = t.submissionUrl || '';
    return `${title}|${desc}|${normalizedDueDate}|${status}|${attachmentUrl}|${submissionUrl}`;
  }).sort().join('||');
  hash.update(serialized);
  return hash.digest('hex');
};

// Helper to merge newly scraped tasks with existing DB tasks, preserving 'Submitted' statuses
const mergeUserTasks = (existingTasks, incomingTasks) => {
  const existingTasksList = existingTasks || [];
  const existingTaskMap = new Map();
  for (const t of existingTasksList) {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(t.dueDate);
    const fp = `${title}_${normDate}`;
    existingTaskMap.set(fp, t);
  }

  const mergedTasks = [];
  for (const incomingTask of incomingTasks) {
    const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(incomingTask.dueDate);
    const fp = `${title}_${normDate}`;

    if (existingTaskMap.has(fp)) {
      const existingTask = existingTaskMap.get(fp);
      const status = (existingTask.status === 'Submitted' || incomingTask.status === 'Submitted') ? 'Submitted' : 'Pending';
      mergedTasks.push({
        ...incomingTask,
        dueDate: normDate,
        startDate: parseUCPDate(incomingTask.startDate),
        status
      });
    } else {
      mergedTasks.push({
        ...incomingTask,
        dueDate: normDate,
        startDate: parseUCPDate(incomingTask.startDate)
      });
    }
  }

  const incomingFps = new Set(incomingTasks.map(t => {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(t.dueDate);
    return `${title}_${normDate}`;
  }));

  for (const existingTask of existingTasksList) {
    const title = (existingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normDate = parseUCPDate(existingTask.dueDate);
    const fp = `${title}_${normDate}`;

    if (!incomingFps.has(fp)) {
      mergedTasks.push(existingTask);
    }
  }

  return mergedTasks;
};

app.post('/api/extension-sync', auth, async (req, res) => {
  try {
    const { gradesData, historyData, statsData, timetableData, attendanceData, announcementsData, submissionsData, datesheetData, portalId, ucpCookie, courseMap: clientCourseMap, syncMode, studentName, profilePic, syncLogId, materialLinksData } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Default mode is AUTO_SYNC if not explicitly provided
    const mode = syncMode || 'AUTO_SYNC';

    let activePortalId = portalId;
    if ((!activePortalId || activePortalId === "BACKGROUND_SYNC") && user.portalId) {
      activePortalId = user.portalId;
    }

    if (!activePortalId) {
      console.error(`[SYNC] Student ID not detected. portalId provided: ${portalId}, user.portalId: ${user.portalId}`);
      throw new Error("Student ID not detected.");
    }
    if (user.portalId && user.portalId.toUpperCase() !== activePortalId.toUpperCase()) {
      throw new Error(`Mismatch! Linked to ${user.portalId}, but found ${activePortalId}.`);
    }
    if (!user.portalId) user.portalId = activePortalId.toUpperCase();

    // ── Tracker for SyncLog ──
    let changesSummary = {};

    // ── Extract enrolled sections from courseMap and ensure Courses exist ──
    const enrolledSections = [];
    const sectionLookup = {}; 
    const baseCodeLookup = {}; 
    if (clientCourseMap && typeof clientCourseMap === 'object') {
      for (const [url, info] of Object.entries(clientCourseMap)) {
        const fullCode = (info.code || '').trim();
        const courseName = (info.name || '').trim();
        const creditHours = info.creditHours !== undefined ? info.creditHours : 3; 

        let sectionCode = '';
        if (fullCode) {
          const parts = fullCode.split('-');
          const candidate = parts.length > 1 ? parts[parts.length - 1] : fullCode;
          const isValidSection = candidate && 
            !candidate.includes(' ') && 
            !candidate.toLowerCase().includes('credit') && 
            !candidate.toLowerCase().includes('hour') && 
            candidate.length <= 15 &&
            /^[a-zA-Z0-9-]+$/.test(candidate);

          if (isValidSection) {
            sectionCode = candidate;
            enrolledSections.push(sectionCode);
            sectionLookup[url] = sectionCode;
          }
        }

        if (courseName) {
          if (sectionCode) {
            sectionLookup[courseName] = sectionCode;
            if (!sectionLookup[`${courseName} - Lab`]) {
              sectionLookup[`${courseName} - Lab`] = sectionCode;
            }
          }
          if (fullCode) {
            baseCodeLookup[courseName] = fullCode;
            if (!baseCodeLookup[`${courseName} - Lab`]) {
              baseCodeLookup[`${courseName} - Lab`] = fullCode;
            }
          }

          // ✅ Save creditHours + portalUrl + semester to DB dynamically
          const { getCurrentSemesterCode, parseSemesterFromCourseCode } = require('./services/scraperEngine');
          const activeSemester = parseSemesterFromCourseCode(fullCode) || req.body.semester || getCurrentSemesterCode();
          const updatePayload = { userId, name: courseName, type: 'university', creditHours, semester: activeSemester };
          if (fullCode) updatePayload.code = fullCode;
          if (sectionCode) updatePayload.section = sectionCode;
          if (url) updatePayload.portalUrl = url; // Store the full portal URL for nightly scraper

          await Course.findOneAndUpdate(
            { userId, name: courseName },
            { $set: updatePayload },
            { upsert: true }
          );
        }
      }
    }
    
    // ── Attendance Sync & Push Notifications ──
    if (attendanceData && attendanceData.length > 0) {
      for (const att of attendanceData) {
        if (!att.courseUrl || !att.courseName || att.courseName.includes("Unknown")) continue;
        if (att.records) {
          const oldAtt = await Attendance.findOne({ userId, courseUrl: att.courseUrl });
          const changes = detectAttendanceChanges(oldAtt, att);
          
          if (changes) {
            if (changes.isNewAbsent) {
              sendPush(user, `Attendance Alert: ${att.courseName} ⚠️`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
              await createAcademicNotification(userId, 'attendance', `Attendance Alert: ${att.courseName}`, `You have been marked absent! Total absents: ${changes.newAbsents}`);
            }
            if (changes.isCritical) {
              sendPush(user, `CRITICAL: ${att.courseName} 🚨`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
              await createAcademicNotification(userId, 'attendance', `CRITICAL: ${att.courseName}`, `You have hit 10 absents! Avoid further offs to prevent failing.`);
            }
            // Emit granular WebSocket event
            io.to(userId.toString()).emit('attendance_update', changes);
            changesSummary.attendance = changesSummary.attendance || [];
            if (!changesSummary.attendance.includes(att.courseName)) changesSummary.attendance.push(att.courseName);
          }
          await Attendance.findOneAndUpdate({ userId, courseUrl: att.courseUrl }, { ...att, lastUpdated: new Date() }, { upsert: true });
        }
      }
    }

    // ── Announcements Sync ──
    if (announcementsData && announcementsData.length > 0) {
      for (const ann of announcementsData) {
        if (!ann.courseUrl || !ann.courseName || ann.courseName.includes("Unknown")) continue;
        if (ann.news) {
          const oldAnn = await Announcement.findOne({ userId, courseUrl: ann.courseUrl });
          const changes = detectAnnouncementChanges(oldAnn, ann);
          
          if (changes) {
            sendPush(user, `New Announcement: ${ann.courseName} 📢`, changes.latestSubject || "Tap to view details.");
            await createAcademicNotification(userId, 'announcement', `New Announcement: ${ann.courseName}`, changes.latestSubject || "Tap to view details.", ann.courseUrl);
            io.to(userId.toString()).emit('announcement_update', changes);
            changesSummary.announcements = changesSummary.announcements || [];
            if (!changesSummary.announcements.includes(ann.courseName)) changesSummary.announcements.push(ann.courseName);
          }
          await Announcement.findOneAndUpdate({ userId, courseUrl: ann.courseUrl }, { ...ann, lastUpdated: new Date() }, { upsert: true });
        }
      }
    }

    // ── Submissions & Peer Syncing ──
    if (submissionsData && submissionsData.length > 0) {
      for (const sub of submissionsData) {
        if (!sub.courseUrl || !sub.courseName || sub.courseName.includes("Unknown")) continue;

        if (sub.tasks) {
          const oldSub = await Submission.findOne({ userId, courseUrl: sub.courseUrl });
          const mergedTasks = mergeUserTasks(oldSub?.tasks, sub.tasks);
          const changes = detectSubmissionChanges(oldSub, sub);
          
          if (changes) {
            io.to(userId.toString()).emit('submission_update', changes);
            changesSummary.submissions = changesSummary.submissions || [];
            if (!changesSummary.submissions.includes(sub.courseName)) changesSummary.submissions.push(sub.courseName);
          }

          const newHash = computeSubmissionsHash(mergedTasks);
          if (oldSub && oldSub.lastSyncHash === newHash) {
            console.log(`[SYNC] Submissions for ${sub.courseName} unchanged (hash match), skipping save.`);
          } else {
            await Submission.findOneAndUpdate(
              { userId, courseUrl: sub.courseUrl },
              { $set: { courseName: sub.courseName, tasks: mergedTasks, lastSyncHash: newHash, lastUpdated: new Date() } },
              { upsert: true }
            );
          }

          const sectionCode = sectionLookup[sub.courseName] || sectionLookup[sub.courseUrl] || '';
          if (sectionCode) {
            const peerCourseDocs = await Course.find({ name: sub.courseName, section: sectionCode });
            const peerUserIds = peerCourseDocs.map(c => c.userId.toString()).filter(id => id !== userId.toString());
            const uniquePeerIds = [...new Set(peerUserIds)];

            for (const peerId of uniquePeerIds) {
              const peerSub = await Submission.findOne({ userId: peerId, courseName: sub.courseName });
              const existingTasks = peerSub && peerSub.tasks ? peerSub.tasks : [];
              const existingTaskMap = new Map(existingTasks.map(t => {
                const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const normDate = parseUCPDate(t.dueDate);
                return [`${title}_${normDate}`, t];
              }));

              let merged = false;
              let newPeerTasks = [];
              mergedTasks.forEach(incomingTask => {
                const title = (incomingTask.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const normDate = parseUCPDate(incomingTask.dueDate);
                const fingerprint = `${title}_${normDate}`;
                if (!existingTaskMap.has(fingerprint)) {
                  // Force classmate tasks to default to Pending to prevent status contamination
                  const peerTask = { ...incomingTask, status: 'Pending', dueDate: normDate, startDate: parseUCPDate(incomingTask.startDate) };
                  existingTasks.push(peerTask);
                  newPeerTasks.push(peerTask);
                  merged = true;
                }
              });

              if (merged) {
                const peerNewHash = computeSubmissionsHash(existingTasks);
                await Submission.findOneAndUpdate(
                  { userId: peerId, courseName: sub.courseName },
                  { $set: { courseUrl: sub.courseUrl, courseName: sub.courseName, tasks: existingTasks, lastSyncHash: peerNewHash, lastUpdated: new Date() } },
                  { upsert: true }
                );
                // Broadcast to peer as well
                io.to(peerId.toString()).emit('submission_update', {
                  type: 'SUBMISSION_UPDATE',
                  courseName: sub.courseName,
                  newCount: newPeerTasks.length,
                  newTasks: newPeerTasks
                });
              }
            }
          }
        }
      }
    }

    // ── FIXED: Timetable Sync (Pulled OUT of LOGIN_SYNC to allow background updates) ──
    // By using deleteMany on EVERY sync where we have data, we completely wipe out 
    // old makeup classes, dropped courses, and garbage data, ensuring a 1:1 mirror.
    if (timetableData && timetableData.length > 0) {
      const courseMapLocal = new Map();
      const preparedClasses = [];

      for (const classItem of timetableData) {
        const { id, ...classData } = classItem;
        if (!classData.courseName || classData.courseName.includes("Unknown")) continue;

        const isMakeup = classData.isMakeup || (classData.instructor && classData.instructor.toLowerCase().includes('makeup'));
        let expiresAt = undefined;
        
        if (isMakeup) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const targetDayIndex = dayNames.indexOf(classData.day);
          if (targetDayIndex !== -1) {
            const now = new Date();
            const currentDayIndex = now.getDay();
            let daysDiff = targetDayIndex - currentDayIndex;
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + daysDiff);
            targetDate.setHours(23, 59, 59, 999);
            expiresAt = targetDate;
          }
        }

        preparedClasses.push({
          ...classData,
          isMakeup,
          expiresAt,
          userId,
          lastUpdated: new Date()
        });

        if (!courseMapLocal.has(classItem.courseName)) {
          courseMapLocal.set(classItem.courseName, { 
            name: classItem.courseName, 
            code: classItem.courseCode || '', 
            color: classItem.color || '#3498db', 
            instructors: new Set(), 
            rooms: new Set() 
          });
        }
        const course = courseMapLocal.get(classItem.courseName);
        if (classItem.instructor && !classItem.instructor.includes('Unknown')) course.instructors.add(classItem.instructor);
        if (classItem.room && !classItem.room.includes('Unknown') && !classItem.room.includes('TBA')) course.rooms.add(classItem.room);
      }

      await Timetable.deleteMany({ userId });
      if (preparedClasses.length > 0) {
        await Timetable.insertMany(preparedClasses);
      }

      for (const [courseName, data] of courseMapLocal.entries()) {
        const sectionCode = sectionLookup[courseName] || '';
        const fullCode = baseCodeLookup[courseName] || data.code || '';

        const courseUpdatePayload = {
  userId, 
  name: data.name, 
  type: 'university',
  color: data.color || '#3498db'
};

if (fullCode) courseUpdatePayload.code = fullCode;
if (sectionCode) courseUpdatePayload.section = sectionCode;

// 🚨 CRITICAL FIX: Only overwrite instructors/rooms if the scraper actually found them in the timetable
if (data.instructors && data.instructors.size > 0) {
  courseUpdatePayload.instructors = Array.from(data.instructors);
}
if (data.rooms && data.rooms.size > 0) {
  courseUpdatePayload.rooms = Array.from(data.rooms);
}

await Course.findOneAndUpdate(
  { userId, name: courseName },
  { $set: courseUpdatePayload },
  { upsert: true }
);
      }
    }

    // ── Datesheet Sync ──
    if (mode === 'LOGIN_SYNC' || mode === 'FORCE_SYNC') {
      if (datesheetData && datesheetData.length > 0) {
        await Exam.deleteMany({ userId });
        for (const exam of datesheetData) {
          await new Exam({ ...exam, userId, lastUpdated: new Date() }).save();
        }
      }
    }

    // ── Grades Sync ──
    if (gradesData && gradesData.length > 0) {
      if (mode === 'LOGIN_SYNC') await Grade.deleteMany({ userId });
      for (const grade of gradesData) {
        if (!grade.courseUrl || !grade.courseName || grade.courseName.includes("Unknown")) continue;
        
        const oldGrade = await Grade.findOne({ userId, courseUrl: grade.courseUrl });
        const changes = detectGradeChanges(oldGrade, grade);
        if (changes) {
          sendPush(user, `Grade Update: ${grade.courseName} 📊`, `Your total weight is now ${changes.newPercentage}%`);
          await createAcademicNotification(userId, 'marks', `Grade Update: ${grade.courseName}`, `Your total weight is now ${changes.newPercentage}%`, grade.courseUrl);
          io.to(userId.toString()).emit('grade_update', changes);
          changesSummary.grades = changesSummary.grades || [];
          if (!changesSummary.grades.includes(grade.courseName)) changesSummary.grades.push(grade.courseName);
        }
        await Grade.findOneAndUpdate({ courseUrl: grade.courseUrl, userId }, { ...grade, userId, lastUpdated: new Date() }, { upsert: true });
      }
    }

    // ── History Sync ──
    if (historyData && historyData.length > 0) {
      if (mode === 'LOGIN_SYNC') await ResultHistory.deleteMany({ userId });
      for (const sem of historyData) {
        if (!sem.term) continue;

        const existing = await ResultHistory.findOne({ userId, term: sem.term });
        if (existing) {
          const updateDoc = {};
          if (sem.cgpa && (sem.cgpa !== "0.00" || existing.cgpa === "0.00")) {
            updateDoc.cgpa = sem.cgpa;
          }
          if (sem.sgpa && (sem.sgpa !== "0.00" || existing.sgpa === "0.00")) {
            updateDoc.sgpa = sem.sgpa;
          }
          if (sem.earnedCH !== undefined && sem.earnedCH !== null) {
            updateDoc.earnedCH = sem.earnedCH;
          }
          if (sem.courses && sem.courses.length > 0) {
            updateDoc.courses = sem.courses;
          }
          updateDoc.lastUpdated = new Date();
          
          await ResultHistory.findOneAndUpdate(
            { term: sem.term, userId },
            { $set: updateDoc },
            { upsert: true }
          );
        } else {
          await ResultHistory.findOneAndUpdate(
            { term: sem.term, userId },
            { ...sem, userId, lastUpdated: new Date() },
            { upsert: true }
          );
        }
      }
    }

    // ── Stats Sync ──
    if (statsData && Object.keys(statsData).length > 0) {
      const existingStats = await StudentStats.findOne({ userId });
      const updatePayload = { ...statsData, userId, lastUpdated: new Date() };

      // Safety: Don't overwrite valid CGPA with 0.00
      if (existingStats && statsData.cgpa === "0.00" && existingStats.cgpa !== "0.00") {
        delete updatePayload.cgpa;
      }

      await StudentStats.findOneAndUpdate(
        { userId },
        { $set: updatePayload },
        { upsert: true }
      );
    }

    // ── User Profile Sync ──
    const updateFields = {
      isPortalConnected: true,
      lastSyncAt: new Date(),
      lastScrapedAt: new Date(),
      portalId: user.portalId,
      ucpCookie: ucpCookie || user.ucpCookie,
      ...(enrolledSections.length > 0 ? { enrolledSections } : {})
    };
    if (studentName && studentName !== 'UCP Student') updateFields.name = studentName;
    if (profilePic) updateFields.portalProfilePic = profilePic;

    await User.updateOne({ _id: userId }, {
      $set: updateFields
    });

    if (syncLogId) {
      // Clean up empty changesSummary
      if (Object.keys(changesSummary).length === 0) changesSummary = null;

      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: 'SUCCESS',
        endTime: new Date(),
        changesSummary: changesSummary
      });
    }


    // ── 🗂️ Material Links: Stage + Immediately Trigger Processing ──
    // Session-bound download URLs expire when cookie expires.
    // Process IMMEDIATELY while session is live. Even duplicate links trigger a re-run
    // so any newly added files by the teacher are picked up.
    if (materialLinksData && Array.isArray(materialLinksData) && materialLinksData.length > 0) {
      const liveCookie = ucpCookie || user.ucpCookie;
      if (liveCookie) {
        let stagedCount = 0;
        for (const item of materialLinksData) {
          if (!item.courseUrl || !item.links || item.links.length === 0) continue;

          // Derive section and teacher from context already parsed above
          const itemSectionCode = sectionLookup[item.courseUrl] || sectionLookup[item.courseName] || '';
          const courseDoc = await Course.findOne({ userId, name: item.courseName }).lean();
          const itemTeacherName = (courseDoc?.instructors || [])[0] || '';

          // Always upsert with fresh links + reset processed = false
          // so the processor always re-checks for new files
          const { getCurrentSemesterCode, parseSemesterFromCourseCode } = require('./services/scraperEngine');
          const activeSemester = parseSemesterFromCourseCode(item.courseCode) || req.body.semester || getCurrentSemesterCode();

          await MaterialLink.findOneAndUpdate(
            { userId, courseUrl: item.courseUrl },
            {
              $set: {
                courseName: item.courseName || '',
                courseCode: item.courseCode || '',
                sectionCode: itemSectionCode,
                teacherName: itemTeacherName,
                links: item.links.map(l => ({
                  fileName: l.fileName || '',
                  description: l.description || '',
                  downloadUrl: l.downloadUrl || '',
                  token: l.token || '',
                  processed: false
                })),
                lastScrapedAt: new Date(),
                processed: false,
                semester: activeSemester
              }
            },
            { upsert: true }
          );
          stagedCount++;
        }

        if (stagedCount > 0) {
          console.log(`[SYNC] 📥 Staged ${stagedCount} material link sets. Firing processor immediately.`);
          // Fire immediately in background — session cookie is live right now
          setTimeout(() => processUserMaterials(userId.toString(), liveCookie), 200);
        }
      }
    }

    res.json({ message: "Sync & Diffing complete securely!" });

  } catch (error) {
    const { syncLogId } = req.body;
    if (syncLogId) {
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: 'FAILED',
        error: error.message,
        endTime: new Date()
      });
    }
    const statusCode = error.message.includes('Mismatch') || error.message.includes('not detected') ? 400 : 500;
    res.status(statusCode).json({ message: error.message });
  }
});

app.post('/api/force-server-sync', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || !user.ucpCookie || !user.portalId) {
      return res.status(400).json({ message: "No cookie or portalId found. Please login again." });
    }

    // Create pending SyncLog
    const syncLog = new SyncLog({
      userId: user._id,
      portalId: user.portalId,
      mode: 'MANUAL_FULL',
      status: 'PENDING',
      startTime: new Date()
    });
    await syncLog.save();

    // Acknowledge immediately to prevent mobile app timeouts
    res.json({ message: "Server-side scraping triggered successfully." });

    // Run the scrape in the background
    setTimeout(async () => {
      const startTime = Date.now();
      try {
        const { scrapeServerSide } = require('./services/scraperEngine');
        const scrapedPayload = await scrapeServerSide(user.ucpCookie, 'FULL', user.portalId);

        // Append log ID to payload so extension-sync can mark it as success
        scrapedPayload.syncLogId = syncLog._id.toString();

        const jwt = require('jsonwebtoken');
        const axios = require('axios');
        const token = jwt.sign({ id: user.id }, process.env.REACT_APP_JWT_SECRET || 'secret_key_123', { expiresIn: '1h' });
        const syncUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/extension-sync`;
        
        await axios.post(syncUrl, scrapedPayload, {
          headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error("[FORCE SYNC BACKGROUND ERROR]", error.message);
        syncLog.status = 'FAILED';
        syncLog.error = error.message;
        syncLog.endTime = new Date();
        syncLog.durationMs = Date.now() - startTime;
        await syncLog.save();
      }
    }, 100);

  } catch (error) {
    console.error("[FORCE SYNC ERROR]", error.message);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
});
