/**
 * Change Detector Module
 * Compares freshly scraped portal data with stored data to detect meaningful changes.
 * Returns structured change objects for targeted notifications and WebSocket events.
 */

/**
 * Detects changes between old and new attendance data.
 * @param {Object} oldAtt - The existing attendance record from DB
 * @param {Object} newAtt - The freshly scraped attendance record
 * @returns {Object|null} Change object or null if no change
 */
const detectAttendanceChanges = (oldAtt, newAtt) => {
  if (!oldAtt || !oldAtt.summary || !newAtt || !newAtt.summary) return null;
  const oldAbsents = oldAtt.summary.conducted - oldAtt.summary.attended;
  const newAbsents = newAtt.summary.conducted - newAtt.summary.attended;
  const oldConducted = oldAtt.summary.conducted;
  const newConducted = newAtt.summary.conducted;

  if (newConducted > oldConducted || newAbsents > oldAbsents) {
    return {
      type: 'ATTENDANCE_UPDATE',
      courseName: newAtt.courseName,
      courseUrl: newAtt.courseUrl,
      oldAbsents,
      newAbsents,
      oldConducted,
      newConducted,
      isCritical: newAbsents >= 10 && oldAbsents < 10,
      isNewAbsent: newAbsents > oldAbsents,
    };
  }
  return null;
};

/**
 * Detects changes between old and new announcement data.
 */
const detectAnnouncementChanges = (oldAnn, newAnn) => {
  if (!oldAnn || !oldAnn.news || !newAnn || !newAnn.news) return null;
  if (newAnn.news.length > oldAnn.news.length) {
    // Find the new announcements by comparing
    const oldSubjects = new Set(oldAnn.news.map(n => `${n.subject}_${n.date}`));
    const newAnnouncements = newAnn.news.filter(n => !oldSubjects.has(`${n.subject}_${n.date}`));
    if (newAnnouncements.length > 0) {
      return {
        type: 'ANNOUNCEMENT_UPDATE',
        courseName: newAnn.courseName,
        courseUrl: newAnn.courseUrl,
        newCount: newAnnouncements.length,
        latestSubject: newAnnouncements[0].subject,
      };
    }
  }
  return null;
};

/**
 * Detects changes between old and new submission data.
 */
const detectSubmissionChanges = (oldSub, newSub) => {
  if (!newSub || !newSub.tasks) return null;
  const oldTasks = (oldSub && oldSub.tasks) ? oldSub.tasks : [];
  const oldFingerprints = new Set(oldTasks.map(t => `${(t.title || '').trim().toLowerCase()}_${(t.dueDate || '').trim()}`));
  const newTasks = newSub.tasks.filter(t => {
    const fp = `${(t.title || '').trim().toLowerCase()}_${(t.dueDate || '').trim()}`;
    return !oldFingerprints.has(fp);
  });

  if (newTasks.length > 0) {
    return {
      type: 'SUBMISSION_UPDATE',
      courseName: newSub.courseName,
      courseUrl: newSub.courseUrl,
      newCount: newTasks.length,
      newTasks: newTasks.map(t => ({ title: t.title, dueDate: t.dueDate, status: t.status })),
    };
  }
  return null;
};

/**
 * Detects changes between old and new grade data.
 */
const detectGradeChanges = (oldGrade, newGrade) => {
  if (!oldGrade || !newGrade) return null;
  const oldPct = parseFloat(oldGrade.totalPercentage) || 0;
  const newPct = parseFloat(newGrade.totalPercentage) || 0;

  if (newPct !== oldPct && newPct > 0) {
    return {
      type: 'GRADE_UPDATE',
      courseName: newGrade.courseName,
      courseUrl: newGrade.courseUrl,
      oldPercentage: oldPct.toFixed(1),
      newPercentage: newPct.toFixed(1),
      increased: newPct > oldPct,
    };
  }
  return null;
};

module.exports = {
  detectAttendanceChanges,
  detectAnnouncementChanges,
  detectSubmissionChanges,
  detectGradeChanges,
};
