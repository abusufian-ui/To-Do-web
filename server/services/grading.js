'use strict';

/**
 * Get absolute grade based on percentage score
 * @param {number} pct 
 */
function getAbsoluteGrade(pct) {
  if (pct >= 86) return { grade: 'A', points: 4.0, color: 'text-emerald-400' };
  if (pct >= 82) return { grade: 'A-', points: 3.67, color: 'text-emerald-500' };
  if (pct >= 78) return { grade: 'B+', points: 3.33, color: 'text-blue-400' };
  if (pct >= 74) return { grade: 'B', points: 3.0, color: 'text-blue-500' };
  if (pct >= 70) return { grade: 'B-', points: 2.67, color: 'text-indigo-400' };
  if (pct >= 66) return { grade: 'C+', points: 2.33, color: 'text-amber-400' };
  if (pct >= 62) return { grade: 'C', points: 2.0, color: 'text-amber-500' };
  if (pct >= 58) return { grade: 'C-', points: 1.67, color: 'text-orange-500' };
  if (pct >= 54) return { grade: 'D+', points: 1.33, color: 'text-rose-400' };
  if (pct >= 50) return { grade: 'D', points: 1.0, color: 'text-rose-500' };
  return { grade: 'F', points: 0.0, color: 'text-red-600' };
}

/**
 * Get smart-curve grade based on student score and class average
 * @param {number} myScore 
 * @param {number} classAverage 
 */
function getSmartCurveGrade(myScore, classAverage) {
  if (classAverage === 0) return getAbsoluteGrade(myScore);
  const diff = myScore - classAverage;
  if (diff >= 15) return { grade: 'A', points: 4.0, color: 'text-emerald-400' };
  if (diff >= 10) return { grade: 'A-', points: 3.67, color: 'text-emerald-500' };
  if (diff >= 5) return { grade: 'B+', points: 3.33, color: 'text-blue-400' };
  if (diff >= 0) return { grade: 'B', points: 3.0, color: 'text-blue-500' };
  if (diff >= -5) return { grade: 'B-', points: 2.67, color: 'text-indigo-400' };
  if (diff >= -10) return { grade: 'C+', points: 2.33, color: 'text-amber-400' };
  if (diff >= -15) return { grade: 'C', points: 2.0, color: 'text-amber-500' };
  if (diff >= -20) return { grade: 'C-', points: 1.67, color: 'text-orange-500' };
  if (diff >= -25) return { grade: 'D+', points: 1.33, color: 'text-rose-400' };
  if (diff >= -30) return { grade: 'D', points: 1.0, color: 'text-rose-500' };
  return { grade: 'F', points: 0.0, color: 'text-red-600' };
}

/**
 * Calculate the true score of a student including Best-N configs
 * @param {Array} assessments 
 * @param {Object} bestOfConfigs 
 * @param {string|null} courseId
 */
function calculateTrueScore(assessments, bestOfConfigs = {}, courseId = null) {
  let totalMarkedWeight = 0;
  let totalEarnedWeight = 0;
  
  (assessments || []).forEach(cat => {
    const wNum = parseFloat(cat.weight) || 0;
    let finalPct = parseFloat(cat.percentage) || 0;
    
    const catNameLower = (cat.name || '').toLowerCase();
    const configKey = courseId ? `${courseId.toString()}_${catNameLower}` : null;
    const bestOfLimit = (configKey && bestOfConfigs[configKey] !== undefined)
      ? bestOfConfigs[configKey]
      : bestOfConfigs[catNameLower];
    
    const isConfigurable = /assignment|quiz|participation|lab/i.test(cat.name || "");
    const validDetails = cat.details?.filter(d => !isNaN(parseFloat(d.obtainedMarks)) && !isNaN(parseFloat(d.maxMarks))) || [];
    
    if (isConfigurable && typeof bestOfLimit === 'number' && bestOfLimit < validDetails.length && bestOfLimit > 0) {
      const sorted = [...validDetails].sort((a, b) => {
        return (parseFloat(b.obtainedMarks) / parseFloat(b.maxMarks)) - (parseFloat(a.obtainedMarks) / parseFloat(a.maxMarks));
      });
      const selected = sorted.slice(0, bestOfLimit);
      const sumObt = selected.reduce((sum, d) => sum + parseFloat(d.obtainedMarks), 0);
      const sumMax = selected.reduce((sum, d) => sum + parseFloat(d.maxMarks), 0);
      finalPct = sumMax > 0 ? (sumObt / sumMax) * 100 : 0;
    }
    
    totalMarkedWeight += wNum;
    totalEarnedWeight += (finalPct / 100) * wNum;
  });
  
  const percentage = totalMarkedWeight > 0 ? (totalEarnedWeight / totalMarkedWeight) * 100 : 0;
  return { marked: totalMarkedWeight, earned: totalEarnedWeight, percentage };
}

/**
 * Calculate the class average score for a course including Best-N configs
 * @param {Array} assessments 
 * @param {Object} bestOfConfigs 
 * @param {string|null} courseId
 */
function calculateClassAverageScore(assessments, bestOfConfigs = {}, courseId = null) {
  let marked = 0;
  let earnedAvg = 0;
  
  (assessments || []).forEach(cat => {
    const w = parseFloat(cat.weight) || 0;
    
    const catNameLower = (cat.name || '').toLowerCase();
    const configKey = courseId ? `${courseId.toString()}_${catNameLower}` : null;
    const bestOfLimit = (configKey && bestOfConfigs[configKey] !== undefined)
      ? bestOfConfigs[configKey]
      : bestOfConfigs[catNameLower];
    
    const isConfigurable = /assignment|quiz|participation|lab/i.test(cat.name || "");
    const validDetails = cat.details?.filter(d => !isNaN(parseFloat(d.maxMarks)) && d.classAverage && d.classAverage !== '-' && d.classAverage !== '') || [];
    
    let selected = validDetails;
    if (isConfigurable && typeof bestOfLimit === 'number' && bestOfLimit < validDetails.length && bestOfLimit > 0) {
      const sorted = [...validDetails].sort((a, b) => {
        const aObt = parseFloat(a.obtainedMarks) || 0;
        const aMax = parseFloat(a.maxMarks) || 1;
        const bObt = parseFloat(b.obtainedMarks) || 0;
        const bMax = parseFloat(b.maxMarks) || 1;
        return (bObt / bMax) - (aObt / aMax);
      });
      selected = sorted.slice(0, bestOfLimit);
    }
    
    const sumAvg = selected.reduce((sum, d) => sum + parseFloat(d.classAverage), 0);
    const sumMax = selected.reduce((sum, d) => sum + parseFloat(d.maxMarks), 0);
    
    if (sumMax > 0 && w > 0) {
      marked += w;
      earnedAvg += (sumAvg / sumMax) * w;
    }
  });
  
  const percentage = marked > 0 ? (earnedAvg / marked) * 100 : 0;
  return { marked, earnedAvg, percentage };
}

/**
 * Get projected grade for a course
 * @param {Object} grade 
 * @param {string} mode - 'absolute' or 'relative'
 * @param {Object} bestOfConfigs 
 */
function getProjectedGradeForCourse(grade, mode = 'relative', bestOfConfigs = {}) {
  const myScore = calculateTrueScore(grade.assessments, bestOfConfigs, grade._id).percentage;
  if (mode === 'absolute') {
    return getAbsoluteGrade(myScore);
  } else {
    const classAvg = calculateClassAverageScore(grade.assessments, bestOfConfigs, grade._id).percentage;
    return getSmartCurveGrade(myScore, classAvg);
  }
}

/**
 * Compute the overall projected CGPA and per-course grades
 */
function computeProjection({ grades, courses, stats, mode = 'relative', bestOfConfigs = {} }) {
  const currentCGPA = parseFloat(stats?.cgpa || "0");
  const completedCr = parseFloat(stats?.credits || "0");
  let inProgressCr = parseFloat(stats?.inprogressCr || "0");
  
  let totalPredictedQualityPoints = 0;
  let totalInProgressCredits = 0;
  
  const perCourse = (grades || []).map(courseGrade => {
    const courseName = courseGrade.courseName;
    const cInfo = (courses || []).find(c => c.name === courseName);
    const creditHours = cInfo ? (cInfo.creditHours || 3) : 3; // default 3
    
    const trueScore = calculateTrueScore(courseGrade.assessments, bestOfConfigs, courseGrade._id).percentage;
    const classAverage = calculateClassAverageScore(courseGrade.assessments, bestOfConfigs, courseGrade._id).percentage;
    
    const proj = getProjectedGradeForCourse(courseGrade, mode, bestOfConfigs);
    
    totalPredictedQualityPoints += (proj.points * creditHours);
    totalInProgressCredits += creditHours;
    
    return {
      courseName,
      creditHours,
      score: trueScore,
      classAverage,
      grade: proj.grade,
      points: proj.points,
      color: proj.color
    };
  });
  
  if (inProgressCr === 0) {
    inProgressCr = totalInProgressCredits;
  }
  
  const predictedTermGPA = totalInProgressCredits > 0 ? (totalPredictedQualityPoints / totalInProgressCredits) : 0;
  
  const denominator = completedCr + inProgressCr;
  const projectedCgpaRaw = denominator > 0 
    ? (((currentCGPA * completedCr) + (predictedTermGPA * inProgressCr)) / denominator)
    : currentCGPA;
    
  return {
    projectedCgpa: projectedCgpaRaw.toFixed(2),
    projectedCgpaRaw,
    predictedTermGPA: predictedTermGPA.toFixed(2),
    predictedTermGPARaw: predictedTermGPA,
    perCourse,
    inputs: {
      currentCGPA,
      completedCr,
      inProgressCr,
      totalInProgressCredits,
      totalPredictedQualityPoints
    }
  };
}

module.exports = {
  getAbsoluteGrade,
  getSmartCurveGrade,
  calculateTrueScore,
  calculateClassAverageScore,
  getProjectedGradeForCourse,
  computeProjection
};
