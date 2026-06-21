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
  
  const oldTaskMap = new Map(oldTasks.map(t => [
    (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase(),
    t
  ]));

  const newTasks = [];
  const updatedTasks = [];

  for (const t of newSub.tasks) {
    const title = (t.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const existing = oldTaskMap.get(title);
    if (!existing) {
      newTasks.push(t);
    } else {
      const oldDueDate = (existing.dueDate || '').trim();
      const newDueDate = (t.dueDate || '').trim();
      if (oldDueDate !== newDueDate) {
        updatedTasks.push(t);
      }
    }
  }

  if (newTasks.length > 0 || updatedTasks.length > 0) {
    return {
      type: 'SUBMISSION_UPDATE',
      courseName: newSub.courseName,
      courseUrl: newSub.courseUrl,
      newCount: newTasks.length + updatedTasks.length,
      newTasks: [...newTasks, ...updatedTasks].map(t => ({ title: t.title, dueDate: t.dueDate, status: t.status })),
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

  // Also detect when a new assessment item is graded even if total percentage hasn't changed yet
  const countItems = (grade) => (grade.assessments || []).reduce((sum, a) => sum + (a.details || []).length, 0);
  const oldCount = countItems(oldGrade);
  const newCount = countItems(newGrade);

  if ((newPct !== oldPct || newCount > oldCount) && newPct > 0) {
    return {
      type: 'GRADE_UPDATE',
      courseName: newGrade.courseName,
      courseUrl: newGrade.courseUrl,
      oldPercentage: oldPct.toFixed(1),
      newPercentage: newPct.toFixed(1),
      increased: newPct > oldPct,
      newItemsGraded: newCount > oldCount ? newCount - oldCount : 0,
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
