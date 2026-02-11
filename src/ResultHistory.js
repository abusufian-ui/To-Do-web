import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, ChevronUp, BookOpen, Clock, Award, 
  TrendingUp, TrendingDown, Star, Layout 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const ResultHistory = () => {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch('/api/results-history')
      .then(res => res.json())
      .then(data => {
        setSemesters(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  }, []);

  const toggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    if (semesters.length === 0) return null;

    // Helper to parse float safely
    const parse = (val) => parseFloat(val) || 0.0;

    // 1. Current CGPA (Latest semester's CGPA)
    // Assuming API returns list; usually last item is latest, or we check terms. 
    // We'll trust the latest entry in the array has the latest CGPA.
    const latest = semesters[semesters.length - 1]; 
    const currentCGPA = parse(latest?.cgpa);

    // 2. Best & Worst SGPA
    let best = { sgpa: -1, term: '' };
    let worst = { sgpa: 5.0, term: '' };
    let totalCredits = 0;

    semesters.forEach(sem => {
        const s = parse(sem.sgpa);
        if (s > best.sgpa) best = { sgpa: s, term: sem.term };
        if (s < worst.sgpa) worst = { sgpa: s, term: sem.term };
        // If cumulativeCH is reliable per semester, we can just take the latest.
        // Otherwise, sum earnedCH. Let's use the latest cumulativeCH.
    });
    
    totalCredits = latest?.cumulativeCH || 0;

    return { currentCGPA, best, worst, totalCredits, totalSemesters: semesters.length };
  }, [semesters]);

  if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading Academic Profile...</div>;

  return (
    <div className="p-8 w-full h-full overflow-y-auto animate-fadeIn pb-24 custom-scrollbar bg-gray-50/50 dark:bg-[#0c0c0c]">
      
      {/* --- HEADER & TITLE --- */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Academic Performance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">Comprehensive archive of your GPA and results.</p>
        </div>
      </div>

      {/* --- STATS GRID (MODERN DASHBOARD) --- */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          
          {/* 1. CGPA CARD */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Award size={80} /></div>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Current CGPA</p>
            <h2 className="text-4xl font-extrabold tracking-tight">{stats.currentCGPA.toFixed(2)}</h2>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-medium bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <TrendingUp size={14} /> Cumulative
            </div>
          </div>

          {/* 2. BEST SEMESTER */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Best Performance</p>
                   <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.best.sgpa} <span className="text-sm text-gray-400 font-normal">GPA</span></h3>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                   <Star size={20} fill="currentColor" />
                </div>
             </div>
             <p className="text-xs text-gray-500 font-medium mt-3">Achieved in <span className="text-gray-800 dark:text-white font-bold">{stats.best.term}</span></p>
          </div>

          {/* 3. TOTAL CREDITS */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between">
   <div className="flex items-start justify-between">
      <div>
         <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Credits Earned</p>
         {/* Updated to show current / total format */}
         <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
           {stats.totalCredits} <span className="text-sm text-gray-400 font-normal">/ 133</span>
         </h3>
      </div>
      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
         <BookOpen size={20} />
      </div>
   </div>
   
   {/* --- UPDATED PROGRESS BAR --- */}
   <div className="w-full bg-gray-100 dark:bg-[#333] h-1.5 rounded-full mt-3 overflow-hidden">
      <div 
        className="bg-orange-500 h-full transition-all duration-500" 
        style={{ width: `${Math.min((stats.totalCredits / 133) * 100, 100)}%` }}
      ></div>
   </div>
   <p className="text-[10px] text-gray-400 mt-2 font-medium">
     {((stats.totalCredits / 133) * 100).toFixed(1)}% of degree completed
   </p>
</div>

          {/* 4. TOTAL SEMESTERS */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex flex-col justify-between">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Semesters</p>
                   <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalSemesters}</h3>
                </div>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                   <Layout size={20} />
                </div>
             </div>
             <p className="text-xs text-gray-500 font-medium mt-3">Completed successfully</p>
          </div>
        </div>
      )}

      {/* --- SEMESTER LIST --- */}
      <div className="space-y-5">
        {semesters.map((sem, idx) => {
          const sgpa = parseFloat(sem.sgpa) || 0;
          const isBest = stats && sgpa === parseFloat(stats.best.sgpa);
          
          return (
            <div key={idx} className={`bg-white dark:bg-[#1E1E1E] border ${isBest ? 'border-emerald-500/30 ring-1 ring-emerald-500/20' : 'border-gray-200 dark:border-[#2C2C2C]'} rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all`}>
              
              {/* HEADER */}
              <div 
                onClick={() => toggle(idx)}
                className="p-5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-[#252525] transition-colors grid grid-cols-1 md:grid-cols-[1.5fr_1fr_auto] gap-6 items-center"
              >
                {/* 1. IDENTITY */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 shadow-inner">
                    <UCPLogo className="w-8 h-8 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{sem.term}</h3>
                      {isBest && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">BEST GPA</span>}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 mt-1 font-medium">
                      <span className="flex items-center gap-1.5"><BookOpen size={14}/> {sem.courses?.length || 0} Courses</span>
                      <span className="flex items-center gap-1.5"><Clock size={14}/> {sem.earnedCH} Cr</span>
                    </div>
                  </div>
                </div>

                {/* 2. STATS (SGPA/CGPA) */}
                <div className="flex items-center gap-8 md:justify-center">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">SGPA</p>
                    <p className={`text-xl font-extrabold ${sgpa >= 3.5 ? 'text-emerald-600' : 'text-gray-800 dark:text-white'}`}>{sem.sgpa}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-[#333]"></div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">CGPA</p>
                    <p className="text-xl font-extrabold text-brand-blue">{sem.cgpa}</p>
                  </div>
                </div>

                {/* 3. ARROW */}
                <div className="text-gray-300">
                  {expanded[idx] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {/* CHILD TABLE */}
              {expanded[idx] && (
                <div className="border-t border-gray-100 dark:border-[#2C2C2C] bg-gray-50/30 dark:bg-[#151515] p-0 animate-slideDown">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-100/50 dark:bg-[#202020] border-b border-gray-200 dark:border-[#333]">
                      <tr>
                        <th className="px-6 py-3 font-bold">Course Name</th>
                        <th className="px-4 py-3 font-bold text-center">Cr. Hrs</th>
                        <th className="px-4 py-3 font-bold text-center">Points</th>
                        <th className="px-6 py-3 font-bold text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                      {sem.courses.map((course, cIdx) => (
                        <tr key={cIdx} className="hover:bg-white dark:hover:bg-[#1E1E1E] transition-colors group">
                          <td className="px-6 py-3.5 font-medium text-gray-700 dark:text-gray-300">{course.name}</td>
                          <td className="px-4 py-3.5 text-center text-gray-500">{course.creditHours}</td>
                          <td className="px-4 py-3.5 text-center text-gray-500">{course.gradePoints}</td>
                          <td className={`px-6 py-3.5 text-right font-bold ${['A', 'A-', 'B+'].includes(course.finalGrade) ? 'text-emerald-600' : 'text-brand-blue'}`}>
                            {course.finalGrade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-6 py-3 border-t border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50 dark:bg-[#1a1a1a]">
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Semester Summary</span>
                     <div className="flex gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
                        <span>Attempted: {sem.attemptedCH}</span>
                        <span>Earned: {sem.earnedCH}</span>
                        <span>Points: {sem.gradePoints}</span>
                     </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {semesters.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-200 dark:border-[#2C2C2C]">
            <div className="p-4 bg-gray-100 dark:bg-[#252525] rounded-full mb-3">
              <Award size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No results history found.</p>
            <p className="text-xs text-gray-400 mt-1">Go to Settings and click "Sync Now" to fetch your records.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultHistory;