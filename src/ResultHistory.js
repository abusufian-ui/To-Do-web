import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, BookOpen, Clock, Award, 
  TrendingUp, Star, Layout, RefreshCw
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const ResultHistory = () => {
  const [semesters, setSemesters] = useState([]);
  const [studentStats, setStudentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 
          'Content-Type': 'application/json',
          'x-auth-token': token 
      };

      const [historyRes, statsRes] = await Promise.all([
          fetch('/api/results-history', { headers }),
          fetch('/api/student-stats', { headers })
      ]);

      const historyData = await historyRes.json();
      const statsData = await statsRes.json();
      
      if (Array.isArray(historyData)) setSemesters(historyData);
      if (statsData) setStudentStats(statsData);

    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/sync-grades', {
        method: 'POST',
        headers: { 'x-auth-token': token }
      });
      await fetchData();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- HELPER: Determine Color for Grades ---
  const getGradeColor = (grade) => {
    // Grades considered "Less than C"
    const dangerGrades = ['C-', 'D+', 'D', 'F', 'W']; 
    if (dangerGrades.includes(grade)) return 'text-red-500';
    return 'text-blue-500';
  };

  const stats = useMemo(() => {
    if (!Array.isArray(semesters) || semesters.length === 0) return null;

    const parse = (val) => parseFloat(val) || 0.0;

    const currentCGPA = studentStats?.cgpa 
        ? parse(studentStats.cgpa) 
        : parse(semesters[semesters.length - 1]?.cgpa);

    let best = { sgpa: -1, term: '' };
    let worst = { sgpa: 5.0, term: '' };
    let totalCredits = 0;

    semesters.forEach(sem => {
        const s = parse(sem.sgpa);
        if (s > best.sgpa) best = { sgpa: s, term: sem.term };
        if (s < worst.sgpa) worst = { sgpa: s, term: sem.term };
        totalCredits += parse(sem.earnedCH);
    });

    const displayCredits = studentStats?.credits ? parse(studentStats.credits) : totalCredits;

    return { currentCGPA, best, worst, totalCredits: displayCredits, totalSemesters: semesters.length };
  }, [semesters, studentStats]);

  const DEGREE_TOTAL_CREDITS = 133;
  const progressPercentage = stats ? Math.min((stats.totalCredits / DEGREE_TOTAL_CREDITS) * 100, 100) : 0;

  if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading Academic Profile...</div>;

  return (
    <div className="p-8 w-full h-full overflow-y-auto animate-fadeIn pb-24 custom-scrollbar bg-gray-50/50 dark:bg-[#0c0c0c]">
      
      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Academic Performance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">Track your CGPA, credits, and detailed assessment results.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Portal'}
        </button>
      </div>

      {/* STATS GRID */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          
          {/* CURRENT CGPA CARD */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
               <Award size={120} />
            </div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Current CGPA</p>
            <h2 className="text-5xl font-extrabold tracking-tight">{stats.currentCGPA.toFixed(2)}</h2>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp size={14} /> Cumulative
            </div>
          </div>

          {/* BEST PERFORMANCE CARD */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between relative overflow-hidden group">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Best Performance</p>
                   <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.best.sgpa} <span className="text-sm text-gray-400 font-normal">GPA</span></h3>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                   <Star size={20} fill="currentColor" />
                </div>
             </div>
             <p className="text-xs text-gray-500 font-medium mt-3">Achieved in <span className="text-gray-800 dark:text-white font-bold">{stats.best.term}</span></p>
          </div>

          {/* CREDITS EARNED CARD */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between relative overflow-hidden">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Credits Earned</p>
                   <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalCredits}</h3>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
                   <BookOpen size={20} />
                </div>
             </div>
             <div className="mt-4">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold">
                   <span>PROGRESS</span>
                   <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-[#333] h-2 rounded-full overflow-hidden">
                   <div 
                     className="bg-orange-500 h-full transition-all duration-1000 ease-out" 
                     style={{ width: `${progressPercentage}%` }}
                   ></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">Degree Total: {DEGREE_TOTAL_CREDITS} Cr</p>
             </div>
          </div>

          {/* SEMESTERS CARD */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Semesters</p>
                   <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalSemesters}</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                   <Layout size={20} />
                </div>
             </div>
             <p className="text-xs text-gray-500 font-medium mt-3">Completed successfully</p>
          </div>
        </div>
      )}

      {/* SEMESTER LIST */}
      <div className="space-y-4">
        {semesters.map((sem, idx) => {
          const sgpa = parseFloat(sem.sgpa) || 0;
          const isBest = stats && sgpa === parseFloat(stats.best.sgpa);
          
          return (
            <div key={idx} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all">
              
              <div 
                onClick={() => toggle(idx)}
                className="p-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-[#252525] transition-colors grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-6 items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300">
                    <UCPLogo className="w-8 h-8 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sem.term}</h3>
                      {isBest && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800">BEST GPA</span>}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1 font-medium">
                      <span className="flex items-center gap-1.5"><BookOpen size={14}/> {sem.courses?.length || 0} Courses</span>
                      <span className="flex items-center gap-1.5"><Clock size={14}/> {sem.earnedCH} Cr</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 md:justify-center">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">SGPA</p>
                    <p className={`text-xl font-extrabold ${sgpa >= 3.5 ? 'text-emerald-600' : 'text-gray-800 dark:text-white'}`}>{sem.sgpa}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-[#333]"></div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">CGPA</p>
                    <p className="text-xl font-extrabold text-blue-500">{sem.cgpa}</p>
                  </div>
                </div>

                <div className="text-gray-300">
                  {expanded[idx] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {expanded[idx] && (
                <div className="border-t border-gray-100 dark:border-[#2C2C2C] bg-gray-50/30 dark:bg-[#151515] p-0 animate-slideDown">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-100/50 dark:bg-[#202020] border-b border-gray-200 dark:border-[#333]">
                      <tr>
                        <th className="px-6 py-3.5 font-bold">Course Name</th>
                        <th className="px-4 py-3.5 font-bold text-center">Cr. Hrs</th>
                        <th className="px-4 py-3.5 font-bold text-center">Points</th>
                        <th className="px-6 py-3.5 font-bold text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                      {sem.courses?.map((course, cIdx) => (
                        <tr key={cIdx} className="hover:bg-white dark:hover:bg-[#1E1E1E] transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{course.name}</td>
                          <td className="px-4 py-4 text-center text-gray-500">{course.creditHours}</td>
                          <td className="px-4 py-4 text-center text-gray-500">{course.gradePoints}</td>
                          <td className={`px-6 py-4 text-right font-bold ${getGradeColor(course.finalGrade)}`}>
                            {course.finalGrade}
                          </td>
                        </tr>
                      ))}
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
};

export default ResultHistory;