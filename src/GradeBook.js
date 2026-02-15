import React, { useState, useEffect } from 'react';
import {
  Book, Clock, ChevronDown, ChevronUp,
  GraduationCap, TrendingUp, AlertCircle, BookOpen
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Helper to check if score is below average
const isBelowAverage = (obtained, average) => {
  const obt = parseFloat(obtained);
  const avg = parseFloat(average);
  if (isNaN(obt) || isNaN(avg)) return false;
  return obt < avg;
};

const GradeBook = () => {
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({ cgpa: "0.00", credits: "0", inprogressCr: "0" });
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'x-auth-token': token 
      };

      const [gradesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/grades`, { headers }),
        fetch(`${API_BASE}/api/student-stats`, { headers })
      ]);

      const gradesData = await gradesRes.json();
      const statsData = await statsRes.json();

      if (Array.isArray(gradesData)) {
        setGrades(gradesData);
      } else {
        setGrades([]); 
      }

      if (statsData && !statsData.message) {
        setStats(statsData);
      }

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

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading Grade Book...</div>;

  return (
    <div className="p-8 w-full h-full overflow-y-auto animate-fadeIn custom-scrollbar pb-24 relative">

      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">Academic Performance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your CGPA, credits, and detailed assessment results.
          </p>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: CGPA */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap size={100} /></div>
          <div className="relative z-10">
            <h3 className="text-blue-100 font-bold text-xs uppercase tracking-wider mb-1">Current CGPA</h3>
            <div className="text-4xl font-extrabold">{stats.cgpa || "0.00"}</div>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp size={14} /> Cumulative Grade Point Average
            </div>
          </div>
        </div>

        {/* Card 2: Inprogress Credits */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-6 shadow-sm relative">
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
            <Clock size={20} />
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Inprogress Credits</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inprogressCr || "0"}</div>
          <p className="text-xs text-gray-400 mt-2">Currently Enrolled</p>
        </div>

        {/* Card 3: COMPLETED CREDITS */}
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-6 shadow-sm relative">
          <div className="absolute top-4 right-4 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
            <BookOpen size={20} />
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider mb-2">Completed Credits</h3>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.credits || "0"}</div>
          <p className="text-xs text-gray-400 mt-2">Total Earned</p>
        </div>
      </div>

      {/* 3. COURSE LIST */}
      {grades.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#121212] rounded-2xl border border-dashed border-gray-300 dark:border-[#333]">
          <p className="text-gray-500 font-medium">No grades found.</p>
          <p className="mt-2 text-brand-blue text-sm font-bold">Please ensure your Chrome Extension is active and synced.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {grades.map((course) => (
            <div key={course._id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm overflow-hidden flex flex-col">

              {/* Course Header */}
              <div className="p-5 border-b border-gray-100 dark:border-[#2C2C2C] bg-gray-50/50 dark:bg-[#252525] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#333] border border-gray-200 dark:border-[#444] flex items-center justify-center text-brand-blue shadow-sm">
                    <Book size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{course.courseName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <Clock size={12} /> Last Updated: {new Date(course.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {course.totalPercentage && course.totalPercentage !== "0" && (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Total</span>
                    <span className="text-xl font-bold text-brand-blue">{course.totalPercentage}%</span>
                  </div>
                )}
              </div>

              {/* Course Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white dark:bg-[#1E1E1E] border-b border-gray-100 dark:border-[#2C2C2C]">
                    <tr>
                      <th className="px-6 py-4 font-bold text-gray-400 uppercase text-xs tracking-wider">Assessment</th>
                      <th className="px-6 py-4 font-bold text-center text-gray-400 uppercase text-xs tracking-wider">Weight</th>
                      <th className="px-6 py-4 font-bold text-right text-gray-400 uppercase text-xs tracking-wider">Score</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
                    {course.assessments.map((item, idx) => {
                      const isExpanded = expandedRows[`${course._id}-${idx}`];
                      const hasDetails = item.details && item.details.length > 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr
                            onClick={() => hasDetails && toggleRow(course._id, idx)}
                            className={`transition-colors ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525]' : ''}`}
                          >
                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                            <td className="px-6 py-4 text-center">
                              {item.weight && (
                                <span className="text-[10px] font-bold bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                  {item.weight}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{item.percentage}</td>
                            <td className="pr-4 text-gray-400 text-right">
                              {hasDetails && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </td>
                          </tr>

                          {/* DETAILED CHILD TABLE */}
                          {isExpanded && (
                            <tr className="bg-gray-5 dark:bg-[#151515] animate-fadeIn">
                              <td colSpan="4" className="p-4">
                                <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#1E1E1E] shadow-inner">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-100 dark:bg-[#252525] text-gray-500 uppercase border-b border-gray-200 dark:border-[#333]">
                                      <tr>
                                        <th className="px-4 py-3 text-left font-bold">Item Name</th>
                                        <th className="px-4 py-3 text-center font-bold">Max Marks</th>
                                        <th className="px-4 py-3 text-center font-bold">Obtained</th>
                                        <th className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">Avg</th>
                                        <th className="px-4 py-3 text-right font-bold">%</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                                      {item.details.map((detail, dIdx) => {
                                        const isLowScore = isBelowAverage(detail.obtainedMarks, detail.classAverage);
                                        return (
                                          <tr key={dIdx} className="hover:bg-gray-50 dark:hover:bg-[#252525]">
                                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{detail.name}</td>
                                            <td className="px-4 py-3 text-center text-gray-500">{detail.maxMarks}</td>
                                            <td className={`px-4 py-3 text-center font-bold ${isLowScore ? 'text-red-500 flex items-center justify-center gap-1' : 'text-gray-800 dark:text-white'}`}>
                                              {isLowScore && <AlertCircle size={12} />}
                                              {detail.obtainedMarks}
                                            </td>
                                            <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-medium">{detail.classAverage}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{detail.percentage}%</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradeBook;