import React, { useState, useEffect } from 'react';
import {
  Clock, ChevronDown, ChevronUp,
  GraduationCap, TrendingUp, AlertCircle, BookOpen, Target, Sparkles
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const isBelowAverage = (obtained, average) => {
  const obt = parseFloat(obtained);
  const avg = parseFloat(average);
  if (isNaN(obt) || isNaN(avg)) return false;
  return obt < avg;
};

// Our smart helper from earlier
const getAssessmentName = (item) => {
  if (item.name && item.name.trim() !== "") return item.name;
  if (item.details && item.details.length > 0 && item.details[0].name) {
    return item.details[0].name.replace(/\s*\d+$/, '').trim();
  }
  return "Assessment";
};

const GradeBook = () => {
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({ cgpa: "0.00", credits: "0", inprogressCr: "0" });
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});

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

      if (Array.isArray(gradesData)) setGrades(gradesData);
      if (statsData && !statsData.message) setStats(statsData);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleRow = (courseId, idx) => {
    const key = `${courseId}-${idx}`;
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full">
       <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Syncing Academic Data...</p>
       </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 w-full h-full overflow-y-auto animate-fadeIn custom-scrollbar pb-24 bg-[#FAFAFA] dark:bg-[#09090B]">

      {/* 1. SLEEK HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-500/20">
            <Sparkles size={12} /> Academic Hub
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Grade Book</h1>
        </div>
      </div>

      {/* 2. BENTO BOX STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        {/* Main CGPA Hero Card (Takes 2 columns) */}
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

        {/* Secondary Stats (1 column each) */}
        <div className="bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800/60 flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
            <Target size={20} />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.inprogressCr || "0"}</div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">In Progress Credits</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800/60 flex flex-col justify-between hover:border-orange-500/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stats.credits || "0"}</div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed Credits</div>
          </div>
        </div>
      </div>

      {/* 3. COURSE MODULES */}
      {grades.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#121214] rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
          <p className="text-gray-500 font-medium">No academic data synced yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grades.map((course) => {
            const totalScore = parseFloat(course.totalPercentage) || 0;
            
            return (
              <div key={course._id} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-gray-800/80 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md dark:hover:border-gray-700">
                
                {/* Module Header */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 dark:border-gray-800/50 relative overflow-hidden group">
                  
                  {/* NEW: Ambient glow replacing the solid blue strip */}
                  <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-500/10 dark:bg-blue-600/20 rounded-full blur-[40px] group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-all duration-700 pointer-events-none"></div>

                  <div className="flex items-center gap-5 pl-2 relative z-10">
                    {/* NEW: Unboxed, zoomed-in logo with a soft drop shadow and hover effect */}
                    <UCPLogo className="w-14 h-14 text-blue-600 dark:text-blue-500 shrink-0 drop-shadow-md transform transition-transform duration-500 group-hover:scale-110" />
                    
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight">{course.courseName}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-1.5">
                        <Clock size={12} /> Sync: {new Date(course.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Visual Course Total */}
                  {totalScore > 0 && (
                    <div className="flex items-center gap-4 bg-gray-50/80 dark:bg-[#18181B]/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-gray-100 dark:border-white/5 relative z-10">
                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Score</div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalScore.toFixed(2)}<span className="text-lg text-gray-400">%</span></div>
                      </div>
                      {/* Mini circular progress indicator */}
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 transform -rotate-90 drop-shadow-sm">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 dark:text-gray-800" />
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * totalScore) / 100} className="text-blue-500 transition-all duration-1000 ease-out" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assessments Visual List */}
                <div className="p-2 md:p-4">
                  {course.assessments.map((item, idx) => {
                    const isExpanded = expandedRows[`${course._id}-${idx}`];
                    const hasDetails = item.details && item.details.length > 0;
                    const itemName = getAssessmentName(item);
                    const itemScore = parseFloat(item.percentage) || 0;
                    const weightVal = parseFloat(item.weight) || 0;
                    
                    // Calculate visual fill based on if they got full marks for that section
                    const fillPercentage = weightVal > 0 ? Math.min((itemScore / weightVal) * 100, 100) : 0;

                    return (
                      <div key={idx} className="mb-2 last:mb-0">
                        {/* Parent Assessment Row */}
                        <div 
                          onClick={() => hasDetails && toggleRow(course._id, idx)}
                          className={`group flex flex-col md:flex-row items-start md:items-center p-4 rounded-2xl transition-all ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]' : ''}`}
                        >
                          <div className="flex-1 w-full flex items-center justify-between md:justify-start gap-4 mb-3 md:mb-0">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 w-1/3 min-w-[150px] truncate">{itemName}</div>
                            {item.weight && (
                              <div className="px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold tracking-widest uppercase border border-gray-200 dark:border-gray-700">
                                W: {item.weight}
                              </div>
                            )}
                          </div>

                          {/* Visual Progress Bar */}
                          <div className="flex-1 w-full flex items-center gap-4">
                            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${fillPercentage >= 90 ? 'bg-emerald-500' : fillPercentage >= 70 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                style={{ width: `${fillPercentage}%` }}
                              ></div>
                            </div>
                            <div className="font-black text-gray-900 dark:text-white w-16 text-right">
                              {item.percentage}
                            </div>
                            <div className="w-6 flex justify-end text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                              {hasDetails && (isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />)}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Child Details - Flattened & Sleek */}
                        {isExpanded && hasDetails && (
                          <div className="mt-1 mb-3 ml-4 md:ml-8 pl-4 border-l-2 border-gray-100 dark:border-gray-800 animate-fadeIn overflow-x-auto">
                            <table className="w-full text-xs min-w-[500px]">
                              <thead className="text-gray-400 dark:text-gray-500 font-semibold text-left">
                                <tr>
                                  <th className="py-2 px-4 w-1/3">Item Detail</th>
                                  <th className="py-2 px-4 text-center">Max</th>
                                  <th className="py-2 px-4 text-center">Obtained</th>
                                  <th className="py-2 px-4 text-center text-blue-500">Class Avg</th>
                                  <th className="py-2 px-4 text-right">%</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {item.details.map((detail, dIdx) => {
                                  const isLowScore = isBelowAverage(detail.obtainedMarks, detail.classAverage);
                                  return (
                                    <tr key={dIdx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">{detail.name}</td>
                                      <td className="py-3 px-4 text-center text-gray-500">{detail.maxMarks}</td>
                                      <td className={`py-3 px-4 text-center font-bold ${isLowScore ? 'text-red-500 flex items-center justify-center gap-1.5' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {isLowScore && <AlertCircle size={14} className="text-red-500" />}
                                        {detail.obtainedMarks}
                                      </td>
                                      <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400">{detail.classAverage}</td>
                                      <td className="py-3 px-4 text-right font-medium text-gray-500">{detail.percentage}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradeBook;