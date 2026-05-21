import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, ChevronDown, ChevronUp,
  GraduationCap, TrendingUp, AlertCircle, BookOpen, Target, Sparkles, Award, Trophy, Users, AlertTriangle
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const isBelowAverage = (obtained, average) => {
  const obt = parseFloat(obtained);
  const avg = parseFloat(average);
  if (isNaN(obt) || isNaN(avg)) return false;
  return obt < avg;
};

const getAssessmentName = (item) => {
  if (item.name && item.name.trim() !== "") return item.name;
  if (item.details && item.details.length > 0 && item.details[0].name) {
    return item.details[0].name.replace(/\s*\d+$/, '').trim();
  }
  return "Assessment";
};

const getAbsoluteGrade = (pct) => {
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
};

// --- Helper to strictly calculate weighted score from an array of assessments ---
const calculateTrueScore = (assessments) => {
  let marked = 0;
  let earned = 0;
  (assessments || []).forEach(cat => {
    const w = parseFloat(cat.weight) || 0;
    const p = parseFloat(cat.percentage) || 0;
    marked += w;
    earned += (p / 100) * w;
  });
  return marked > 0 ? (earned / marked) * 100 : 0;
};

const GradeCategoryRow = ({ category, onBestOfChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  let displayName = category.name;
  if (!displayName || displayName === "Unknown" || displayName.trim() === "") {
    if (category.details && category.details.length > 0 && category.details[0]?.name) {
      displayName = category.details[0].name.replace(/\s*\d+$/, '').trim();
    } else {
      displayName = "Assessment";
    }
  }

  const sortedDetails = [...(category.details || [])]
    .map((d, i) => ({ ...d, originalIndex: i, pct: parseFloat(d.maxMarks) > 0 ? (parseFloat(d.obtainedMarks) / parseFloat(d.maxMarks)) : 0 }))
    .filter(d => !isNaN(d.pct))
    .sort((a, b) => b.pct - a.pct);

  const countedIndices = new Set(sortedDetails.slice(0, category.bestOf).map(d => d.originalIndex));

  return (
    <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200 dark:border-gray-800/80 overflow-hidden shadow-sm mb-4 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 pr-6">
          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <Award size={18} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 truncate">{displayName}</h3>
              {category.weight && (
                <span className="inline-block text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-[#1A1A1D] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
                  {category.weight} Weight
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${category.calculatedPercentage}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{category.calculatedPercentage.toFixed(1)}%</p>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">Category Score</p>
          </div>
          <div className={`p-1.5 rounded-full bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800/80 bg-white dark:bg-[#121214] overflow-x-auto pb-2">
          {category.isConfigurable && category.totalItems > 1 && (
            <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-500/5 border-b border-indigo-100 dark:border-indigo-500/10 flex items-center justify-between animate-fadeIn">
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 whitespace-nowrap">
                <Target size={14} className="text-indigo-500" /> Evaluation Rule
              </span>
              <select
                className="bg-white dark:bg-[#1A1A1D] border border-indigo-200 dark:border-indigo-500/30 text-sm font-bold text-indigo-700 dark:text-indigo-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer"
                value={category.bestOf}
                onChange={(e) => onBestOfChange(category.name, parseInt(e.target.value))}
              >
                <option value={category.totalItems}>Count All ({category.totalItems})</option>
                {Array.from({ length: category.totalItems - 1 }, (_, i) => category.totalItems - 1 - i).map(num => (
                  <option key={num} value={num}>Best {num}</option>
                ))}
              </select>
            </div>
          )}

          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/80">
                <th className="py-3 px-6 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Assessment</th>
                <th className="py-3 px-6 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Score</th>
                <th className="py-3 px-6 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center text-blue-500 whitespace-nowrap">Class Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {category.details?.map((det, j) => {
                const isUnmarked = !det.obtainedMarks || det.obtainedMarks.trim() === '' || det.obtainedMarks === '-';
                const isLowScore = !isUnmarked && isBelowAverage(det.obtainedMarks, det.classAverage);
                const isDropped = category.isConfigurable && !countedIndices.has(j) && !isUnmarked;

                return (
                  <tr key={j} className={`transition-colors ${isDropped || isUnmarked ? 'bg-gray-50/50 dark:bg-[#161618] opacity-70' : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.01]'}`}>
                    <td className={`py-4 px-6 text-[13px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 ${isDropped ? 'line-through' : ''}`}>
                      {det.name}
                      {isUnmarked && <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded no-underline">Pending</span>}
                      {isDropped && <span className="text-[9px] font-black uppercase text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded no-underline">Dropped</span>}
                    </td>

                    <td className={`py-4 px-6 text-center ${isDropped ? 'line-through' : ''}`}>
                      {isUnmarked ? (
                        <span className="text-[14px] font-black text-gray-400 dark:text-gray-600">-</span>
                      ) : (
                        <span className={`text-[14px] font-black flex items-center justify-center gap-1.5 ${isLowScore && !isDropped ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {isLowScore && !isDropped && <AlertCircle size={14} className="text-red-500" />}
                          {det.obtainedMarks} <span className="text-[11px] font-medium text-gray-400 dark:text-gray-600">/ {det.maxMarks}</span>
                        </span>
                      )}
                    </td>

                    <td className={`py-4 px-6 text-[13px] font-bold text-center ${isUnmarked ? 'text-gray-400 dark:text-gray-600' : 'text-blue-500 dark:text-blue-400'} ${isDropped ? 'line-through' : ''}`}>
                      {isUnmarked ? '-' : det.classAverage}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


const GradeBook = ({ courses, isMainSidebarOpen }) => {
  const [allGrades, setAllGrades] = useState([]);
  const [stats, setStats] = useState({ cgpa: "0.00", credits: "0", inprogressCr: "0" });
  const [loading, setLoading] = useState(true);
  
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [gradingMode, setGradingMode] = useState('relative');
  const [expandedRows, setExpandedRows] = useState({});

  // Leaderboard & Settings states
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [bestOfConfigs, setBestOfConfigs] = useState({});

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'x-auth-token': token };

      const [gradesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/grades`, { headers }),
        fetch(`${API_BASE}/api/student-stats`, { headers })
      ]);

      const gradesData = await gradesRes.json();
      const statsData = await statsRes.json();

      if (Array.isArray(gradesData)) {
        setAllGrades(gradesData);
      }
      if (statsData && !statsData.message) setStats(statsData);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filter ONLY university courses that exist in the synced `courses` array
  const grades = useMemo(() => {
    if (!courses || courses.length === 0) return allGrades;
    const uniCourseNames = new Set(courses.filter(c => c.type === 'uni').map(c => c.name));
    return allGrades.filter(g => uniCourseNames.has(g.courseName));
  }, [allGrades, courses]);

  useEffect(() => {
    if (grades.length > 0 && !selectedCourseId) {
      setSelectedCourseId(grades[0]._id);
    }
  }, [grades, selectedCourseId]);

  const toggleRow = (courseId, idx) => {
    const key = `${courseId}-${idx}`;
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedCourse = useMemo(() => {
    return grades.find(c => c._id === selectedCourseId) || grades[0];
  }, [grades, selectedCourseId]);

  const matchingCourseInfo = useMemo(() => {
    if (!selectedCourse || !courses) return null;
    return courses.find(c => c.name === selectedCourse.courseName);
  }, [selectedCourse, courses]);

  // ─── LEADERBOARD DATA FETCHER ───
  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedCourse || !matchingCourseInfo || !matchingCourseInfo.code || !matchingCourseInfo.section) {
        setLeaderboard([]);
        return;
      }
      setLeaderboardLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/course/${encodeURIComponent(matchingCourseInfo.code)}/section/${encodeURIComponent(matchingCourseInfo.section)}/leaderboard`, {
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(Array.isArray(data) ? data : []);
        } else {
          setLeaderboard([]);
        }
      } catch (err) {
        setLeaderboard([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [selectedCourse, matchingCourseInfo]);

  const handleBestOfChange = (categoryName, newBestOf) => {
    setBestOfConfigs(prev => ({ ...prev, [`${selectedCourse._id}_${categoryName}`]: newBestOf }));
  };

  // ─── PROCESSED GRADEBOOK ENGINE (Handles "Best of X") ───
  const processedGradebook = useMemo(() => {
    if (!selectedCourse || !selectedCourse.assessments) return [];
    return selectedCourse.assessments.map((cat) => {
      const isConfigurable = /assignment|quiz|participation/i.test(cat.name || "");
      const validDetails = cat.details?.filter(d => !isNaN(parseFloat(d.obtainedMarks)) && !isNaN(parseFloat(d.maxMarks))) || [];

      let finalPct = parseFloat(cat.percentage) || 0;
      const configKey = `${selectedCourse._id}_${cat.name}`;
      const bestOf = bestOfConfigs[configKey] ?? validDetails.length;

      if (isConfigurable && bestOf < validDetails.length && bestOf > 0) {
        const sorted = [...validDetails].sort((a, b) => {
          return (parseFloat(b.obtainedMarks) / parseFloat(b.maxMarks)) - (parseFloat(a.obtainedMarks) / parseFloat(a.maxMarks));
        });
        const selected = sorted.slice(0, bestOf);
        const sumObt = selected.reduce((sum, d) => sum + parseFloat(d.obtainedMarks), 0);
        const sumMax = selected.reduce((sum, d) => sum + parseFloat(d.maxMarks), 0);
        finalPct = sumMax > 0 ? (sumObt / sumMax) * 100 : 0;
      }

      return {
        ...cat,
        calculatedPercentage: finalPct,
        isConfigurable,
        totalItems: validDetails.length,
        bestOf: bestOf
      };
    });
  }, [selectedCourse, bestOfConfigs]);

  const courseGradingStats = useMemo(() => {
    let totalMarkedWeight = 0;
    let totalEarnedWeight = 0;
    processedGradebook.forEach(cat => {
      const wNum = parseFloat(cat.weight) || 0;
      totalMarkedWeight += wNum;
      totalEarnedWeight += (cat.calculatedPercentage / 100) * wNum;
    });
    const currentStandingPct = totalMarkedWeight > 0 ? (totalEarnedWeight / totalMarkedWeight) * 100 : 0;
    return { totalMarkedWeight, totalEarnedWeight, currentStandingPct };
  }, [processedGradebook]);

  // ─── DYNAMIC LEADERBOARD GENERATOR (Live Local Merge) ───
  const combinedLeaderboard = useMemo(() => {
    const myScore = courseGradingStats.currentStandingPct;

    let list = [...leaderboard];
    let closestIndex = list.findIndex(s => s.isMe);

    if (closestIndex === -1 && list.length > 0) {
       let minDiff = Infinity;
       list.forEach((s, idx) => {
         const diff = Math.abs(s.score - myScore);
         if (diff < minDiff) { minDiff = diff; closestIndex = idx; }
       });
       if (minDiff > 5) closestIndex = -1; 
    }

    if (closestIndex !== -1 && list.length > 0) {
      list[closestIndex].isMe = true;
      list[closestIndex].score = myScore;
      list[closestIndex].name = "You";
    }

    list.sort((a, b) => b.score - a.score);
    const total = list.length;

    return list.map((s, idx) => {
      const pctile = (idx / total) * 100;
      let grade = 'F';
      if (pctile < 10) grade = 'A';
      else if (pctile < 20) grade = 'A-';
      else if (pctile < 35) grade = 'B+';
      else if (pctile < 50) grade = 'B';
      else if (pctile < 65) grade = 'B-';
      else if (pctile < 80) grade = 'C';
      else if (pctile < 95) grade = 'D';

      return { ...s, rank: idx + 1, grade };
    });
  }, [leaderboard, courseGradingStats]);

  const myRankData = useMemo(() => combinedLeaderboard.find(s => s.isMe), [combinedLeaderboard]);

  // Ensure every course has a projected grade, falling back to absolute if relative is missing
  const activeProjectedGrade = myRankData ? myRankData.grade : getAbsoluteGrade(courseGradingStats.currentStandingPct).grade;

  // ─── PROJECTED CGPA CALCULATOR (CREDIT-AWARE) ───
  const projectedCgpa = useMemo(() => {
    if (!grades.length || !stats) return parseFloat(stats.cgpa || "0");

    let totalPredictedQualityPoints = 0;
    let totalInProgressCredits = 0;

    grades.forEach(courseGrade => {
        // Find matching course to get credits
        const cInfo = courses.find(c => c.name === courseGrade.courseName);
        const credits = cInfo?.creditHours || 3; // Use real credits or fallback to 3

        const cScore = calculateTrueScore(courseGrade.assessments);
        
        // Use relative predicted grade if available in leaderboard, else absolute
        const absoluteGradeInfo = getAbsoluteGrade(cScore);
        const gradePoints = absoluteGradeInfo.points; 
        
        totalPredictedQualityPoints += (gradePoints * credits);
        totalInProgressCredits += credits;
    });

    const predictedTermGPA = totalInProgressCredits > 0 ? (totalPredictedQualityPoints / totalInProgressCredits) : 0;
    
    const currentCGPA = parseFloat(stats.cgpa || "0");
    const completedCr = parseFloat(stats.credits || "0");
    const inProgressCr = totalInProgressCredits > 0 ? totalInProgressCredits : parseFloat(stats.inprogressCr || "0"); // Trust live calculated credits if available

    if (completedCr + inProgressCr === 0) return predictedTermGPA;

    const projected = ((currentCGPA * completedCr) + (predictedTermGPA * inProgressCr)) / (completedCr + inProgressCr);
    return projected || 0.0;
  }, [grades, stats, courses]);

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full">
       <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Syncing Academic Data...</p>
       </div>
    </div>
  );

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B] relative">
      
      {/* 🚀 COURSES SIDEBAR (Always Visible & Displays Credit Hours) */}
      <div className="w-72 md:w-80 shrink-0 h-full bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-gray-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] flex flex-col z-30">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800/50 shrink-0 bg-white dark:bg-[#121214] z-10 sticky top-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" /> University Courses
          </h3>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar pb-20">
          {grades.length === 0 ? (
            <p className="text-gray-500 text-sm text-center mt-10">No university courses found.</p>
          ) : (
            grades.map((course) => {
              const isActive = course._id === selectedCourseId;
              
              // 🚀 Calculating live score & fetching exact credit hours
              const totalScore = calculateTrueScore(course.assessments);
              const courseInfo = courses.find(c => c.name === course.courseName);
              const credits = courseInfo?.creditHours || 3;
              
              return (
                <button
                  key={course._id}
                  onClick={() => setSelectedCourseId(course._id)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex flex-col gap-2 border ${
                    isActive 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 p-1.5 ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                      <UCPLogo color={isActive ? "#ffffff" : (document.documentElement.classList.contains('dark') ? '#60A5FA' : '#2563EB')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{course.courseName}</p>
                      
                      {/* 🚀 BUG FIXED: Shows exact Score AND Credit Hours */}
                      <p className={`text-[10px] font-semibold tracking-wider uppercase mt-1 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                        {totalScore > 0 ? `Score: ${totalScore.toFixed(1)}%` : 'Active'} • {credits} Cr. Hrs
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 🚀 OVERLAY FADE: Dim GradeBook if Main Portal Sidebar opens */}
      <div className={`flex-1 h-full overflow-y-auto custom-scrollbar p-4 md:p-8 transition-all duration-300 relative ${isMainSidebarOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        <div className="w-full max-w-7xl mx-auto pb-24">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-500/20">
                <Sparkles size={12} /> Academic Hub
              </div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Grade Book</h1>
              </div>
            </div>
          </div>

          {/* BENTO BOX STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 border border-white/10 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center gap-2 text-blue-100 font-medium text-sm tracking-wide">
                  <GraduationCap size={18} /> Current CGPA
                </div>
                <div className="mt-4">
                  <span className="text-6xl font-black tracking-tighter">{stats.cgpa || "0.00"}</span>
                  <span className="text-xl text-blue-200 font-medium ml-2">/ 4.00</span>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800/60 flex flex-col justify-between hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{projectedCgpa.toFixed(2)}</div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Projected CGPA</div>
              </div>
            </div>
            <div className="bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800/60 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Target size={20} />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.inprogressCr || "0"}</div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">In Progress Credits</div>
              </div>
            </div>
          </div>

          {grades.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#121214] rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
              <p className="text-gray-500 font-medium">No university courses synced yet.</p>
            </div>
          ) : selectedCourse && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-4 rounded-3xl border border-gray-200 dark:border-gray-800/80 shadow-sm">
                
                {/* 🚀 TOP HEADER WITH BADGE FOR CREDIT HOURS */}
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 ml-2 flex items-center gap-2">
                  <Award size={18} className="text-blue-500" /> {selectedCourse.courseName}
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20 shadow-sm whitespace-nowrap">
                    {matchingCourseInfo?.creditHours || 3} Cr. Hrs
                  </span>
                </h3>

                <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                  <button
                    onClick={() => setGradingMode('absolute')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${gradingMode === 'absolute' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    Absolute
                  </button>
                  <button
                    onClick={() => setGradingMode('relative')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${gradingMode === 'relative' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                    Relative
                  </button>
                </div>
              </div>

              {/* Absolute View Dashboard */}
              {gradingMode === 'absolute' && (
                <div className="bg-gradient-to-br from-blue-900 to-slate-900 dark:from-blue-950 dark:to-black rounded-3xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden border border-blue-800/30">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                  <div className="relative z-10 w-full md:w-auto text-center md:text-left">
                    <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest mb-1">Current Standing</p>
                    <div className="flex items-baseline justify-center md:justify-start gap-2">
                      <span className="text-5xl font-black">{courseGradingStats.currentStandingPct.toFixed(1)}%</span>
                      <span className="text-blue-200 font-medium mb-1">/ 100%</span>
                    </div>
                    <p className="text-sm text-blue-100/80 mt-2">Based on {courseGradingStats.totalMarkedWeight.toFixed(1)}% marked assessments</p>
                  </div>
                  <div className="relative z-10 w-full md:w-auto flex justify-center">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-center min-w-[140px]">
                      <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-2 whitespace-nowrap">Est. Grade</p>
                      <p className={`text-6xl font-black ${getAbsoluteGrade(courseGradingStats.currentStandingPct).color} drop-shadow-sm`}>
                        {courseGradingStats.totalMarkedWeight > 0 ? getAbsoluteGrade(courseGradingStats.currentStandingPct).grade : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Relative View Dashboard & Leaderboard */}
              {gradingMode === 'relative' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl p-4 flex gap-3 items-start">
                    <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-sm font-bold text-red-800 dark:text-red-400">Projected grade is not final</h4>
                      <p className="text-xs text-red-600 dark:text-red-500/80 mt-1">
                        The curve is set by your instructor at the end of the course. This is an estimation based on current class averages.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-600 to-violet-800 dark:from-indigo-900 dark:to-violet-950 rounded-3xl p-6 md:p-8 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden border border-indigo-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="relative z-10 w-full md:w-auto text-center md:text-left">
                      {/* 🚀 BUG FIXED: Whitespace nowrap keeps labels from breaking on small screens */}
                      <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mb-1 whitespace-nowrap">Relative Grading Mode</p>
                      <h2 className="text-3xl font-black mb-2 whitespace-nowrap">Class Curve Projection</h2>
                      <p className="text-sm text-indigo-100/90 max-w-md">Your grade is evaluated against the class average and curve set by the instructor.</p>
                    </div>
                    <div className="relative z-10 w-full md:w-auto flex justify-center flex-wrap gap-4">
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[100px]">
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Score</p>
                        <p className="text-3xl font-black">{courseGradingStats.currentStandingPct.toFixed(1)}<span className="text-sm opacity-70">%</span></p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[100px]">
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1 whitespace-nowrap">Class Rank</p>
                        <p className="text-3xl font-black">{myRankData ? `#${myRankData.rank}` : '-'}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center min-w-[100px]">
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1 whitespace-nowrap">Proj. Grade</p>
                        {/* 🚀 BUG FIXED: Always guaranteed to have a fallback projected grade */}
                        <p className="text-3xl font-black text-emerald-300 drop-shadow-sm">
                          {activeProjectedGrade}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* LEADERBOARD TABLE */}
                  <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-gray-800/80 rounded-3xl overflow-hidden shadow-sm mt-8">
                    <div 
                      className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                          <Users size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Live Section Leaderboard</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">See where you stand among your peers</p>
                        </div>
                      </div>
                      <ChevronDown size={20} className={`transition-transform duration-300 ${isLeaderboardExpanded ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`} />
                    </div>

                    {isLeaderboardExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-800/50 p-4">
                        {leaderboardLoading ? (
                          <div className="flex flex-col items-center justify-center py-10 space-y-3">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Syncing live data from section...</p>
                          </div>
                        ) : combinedLeaderboard.length === 0 ? (
                          <div className="bg-gray-50 dark:bg-[#161618] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 shadow-sm">
                            <Users className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                            <p className="font-bold text-gray-600 dark:text-gray-300">No Class Data Found</p>
                            <p className="text-xs mt-1">Waiting for backend connection to populate leaderboard.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/80">
                                  <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-24 text-center">Rank</th>
                                  <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Student Details</th>
                                  <th className="py-4 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Course Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                {combinedLeaderboard.map((student, i) => {
                                  const isTop3 = student.rank && student.rank <= 3;
                                  return (
                                    <tr key={i} className={`transition-all duration-300 relative ${student.isMe ? 'bg-indigo-50/80 dark:bg-indigo-500/10 shadow-[inset_4px_0_0_0_#4f46e5]' : 'hover:bg-gray-50/80 dark:hover:bg-white/[0.01]'}`}>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center justify-center">
                                          {student.rank === 1 ? <Trophy size={20} className="text-amber-400 fill-amber-400/20" /> :
                                            student.rank === 2 ? <Trophy size={20} className="text-gray-400 fill-gray-400/20" /> :
                                            student.rank === 3 ? <Trophy size={20} className="text-amber-700 fill-amber-700/20" /> :
                                            <span className={`text-sm font-bold ${student.isMe ? 'text-indigo-600' : 'text-gray-400'}`}>#{student.rank}</span>}
                                        </div>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                          <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 ${student.isMe ? 'border-indigo-400 shadow-sm' : 'border-gray-100 dark:border-gray-800'}`}>
                                            <img src={student.pic} alt={student.name} className="w-full h-full object-cover" />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className={`text-sm font-bold ${student.isMe ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {student.name}
                                              </p>
                                              {student.isMe && <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded">You</span>}
                                            </div>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{student.id}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6 text-right">
                                        <span className={`text-[15px] font-black ${isTop3 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                                          {student.score.toFixed(1)}<span className="text-[11px] font-semibold text-gray-400">%</span>
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assessments Details List */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between pl-2 pr-2">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Marked Assessments</h4>
                </div>
                {processedGradebook.length === 0 ? (
                  <p className="text-sm text-gray-500 pl-2">No assessments graded yet.</p>
                ) : (
                  processedGradebook.map((category, i) => (
                    <GradeCategoryRow key={i} category={category} onBestOfChange={handleBestOfChange} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeBook;