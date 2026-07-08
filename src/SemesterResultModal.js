import React, { useMemo } from 'react';
import { X, Award, BookOpen, TrendingUp, TrendingDown, PieChart, Star, Activity, Clock } from 'lucide-react';

const SemesterResultModal = ({ isOpen, onClose, onViewFullHistory, semesterStatus }) => {
  const latest = semesterStatus?.latestResult;
  const previous = semesterStatus?.previousResult;

  const termName = latest?.term || "Semester";
  const sgpa = parseFloat(latest?.sgpa) || 0.00;
  const cgpa = parseFloat(latest?.cgpa) || 0.00;
  const earnedCH = latest?.earnedCH || "0";
  const courses = latest?.courses;

  // 1. Calculate Grade Distribution for Donut Chart
  const gradeDistribution = useMemo(() => {
    const list = courses || [];
    const counts = {};
    list.forEach((c) => {
      const g = c.finalGrade || "Other";
      counts[g] = (counts[g] || 0) + 1;
    });

    const colors = {
      'A': '#22c55e',
      'A-': '#0d9488',
      'B+': '#3b82f6',
      'B': '#f59e0b',
      'B-': '#ef4444',
      'C+': '#8b5cf6',
      'C': '#6366f1',
      'Other': '#9ba1a6'
    };

    const total = list.length || 1;
    let accumulatedPercent = 0;

    return Object.entries(counts).map(([grade, count]) => {
      const percentage = (count / total) * 100;
      const strokeDashoffset = 282.6 - (282.6 * percentage) / 100;
      const strokeDasharray = 282.6;
      const rotationAngle = (accumulatedPercent * 3.6);
      accumulatedPercent += percentage;
      return {
        grade,
        count,
        percentage,
        color: colors[grade] || colors['Other'],
        strokeDashoffset,
        strokeDasharray,
        rotationAngle
      };
    });
  }, [courses]);

  // 2. Find best course
  const topCourse = useMemo(() => {
    const list = courses || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => {
      const aGp = parseFloat(a.gradePoints) || 0;
      const bGp = parseFloat(b.gradePoints) || 0;
      return bGp - aGp;
    })[0];
  }, [courses]);

  // 3. Comparison math
  const prevSgpa = previous ? (parseFloat(previous.sgpa) || 0.00) : 0.00;
  const gpaDiff = sgpa - prevSgpa;
  const isImproved = gpaDiff >= 0;

  if (!isOpen || !semesterStatus || !semesterStatus.latestResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
      <div className="bg-[#151718] border border-gray-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-black text-[#ECEDEE] tracking-tight">{termName} Results Audit</h2>
            <p className="text-xs text-[#9BA1A6] font-semibold mt-1">Semester Completed • {earnedCH} Credit Hours Earned</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1E1E1E] border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Stat Pills */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1E1E1E] border border-green-500/30 rounded-2xl p-5 flex flex-col items-center">
              <span className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-wider mb-1">SGPA</span>
              <span className="text-4xl font-extrabold text-green-500">{sgpa.toFixed(2)}</span>
            </div>
            <div className="bg-[#1E1E1E] border border-blue-500/30 rounded-2xl p-5 flex flex-col items-center">
              <span className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-wider mb-1">CGPA</span>
              <span className="text-4xl font-extrabold text-blue-500">{cgpa.toFixed(2)}</span>
            </div>
          </div>

          {/* Section 2: Course Breakdown */}
          <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} className="text-blue-500" />
              <h3 className="text-sm font-bold text-[#ECEDEE]">Course Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 pb-2">
                    <th className="text-[10px] font-bold text-[#9BA1A6] uppercase pb-2">Course Name</th>
                    <th className="text-[10px] font-bold text-[#9BA1A6] uppercase pb-2 text-center">Grade</th>
                    <th className="text-[10px] font-bold text-[#9BA1A6] uppercase pb-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, index) => {
                    const grade = c.finalGrade || "W";
                    const isGood = ['A', 'A-', 'B+'].includes(grade);
                    const gradeColor = isGood ? 'text-green-500' : 'text-amber-500';
                    return (
                      <tr key={index} className="border-b border-gray-800/40 last:border-none">
                        <td className="py-3 text-xs font-bold text-[#ECEDEE]">{c.name}</td>
                        <td className={`py-3 text-xs font-extrabold text-center ${gradeColor}`}>{grade}</td>
                        <td className="py-3 text-xs text-[#9BA1A6] font-semibold text-right">{c.gradePoints || "0.00"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Semester Comparison & Grade Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comparison */}
            {previous && (
              <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={18} className="text-green-500" />
                    <h3 className="text-sm font-bold text-[#ECEDEE]">vs Last Semester ({previous.term})</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#9BA1A6] mb-1">
                        <span>{termName} SGPA</span>
                        <span>{sgpa.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-[#2c2c2c] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(sgpa / 4) * 100}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-[#9BA1A6] mb-1">
                        <span>{previous.term} SGPA</span>
                        <span>{prevSgpa.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-[#2c2c2c] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(prevSgpa / 4) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 mt-4 px-3 py-2 rounded-lg self-start ${isImproved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {isImproved ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-xs font-bold">
                    {isImproved ? `+${gpaDiff.toFixed(2)}` : `${gpaDiff.toFixed(2)}`} SGPA Change
                  </span>
                </div>
              </div>
            )}

            {/* Donut Chart */}
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={18} className="text-amber-500" />
                <h3 className="text-sm font-bold text-[#ECEDEE]">Grade Distribution</h3>
              </div>

              <div className="flex items-center justify-around">
                <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#2C2C2C" strokeWidth="8" />
                  {gradeDistribution.map((item, index) => (
                    <circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="8"
                      strokeDasharray={item.strokeDasharray}
                      strokeDashoffset={item.strokeDashoffset}
                      transform={`rotate(${item.rotationAngle} 50 50)`}
                    />
                  ))}
                </svg>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {gradeDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-[#ECEDEE] font-bold">{item.grade} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {topCourse && (
              <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-4 flex flex-col">
                <Award size={20} className="text-blue-500 mb-2" />
                <span className="text-[10px] font-bold text-[#9BA1A6] mb-1">Top Course</span>
                <span className="text-xs font-black text-[#ECEDEE] truncate" title={topCourse.name}>{topCourse.name}</span>
                <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">Grade {topCourse.finalGrade}</span>
              </div>
            )}

            <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-4 flex flex-col">
              <Clock size={20} className="text-green-500 mb-2" />
              <span className="text-[10px] font-bold text-[#9BA1A6] mb-1">Credit Hours</span>
              <span className="text-sm font-black text-[#ECEDEE]">{earnedCH} CH</span>
              <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">Earned this semester</span>
            </div>

            <div className="bg-[#1E1E1E] border border-gray-800 rounded-2xl p-4 flex flex-col">
              <Star size={20} className="text-amber-500 mb-2" />
              <span className="text-[10px] font-bold text-[#9BA1A6] mb-1">Performance</span>
              <span className="text-sm font-black text-[#ECEDEE]">{isImproved ? "Improving" : "Stable"}</span>
              <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">{sgpa.toFixed(2)} SGPA</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800 bg-[#151718]">
          <button
            onClick={onViewFullHistory}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-extrabold transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            View Full History
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-[#1E1E1E] hover:bg-gray-800 text-[#ECEDEE] border border-gray-800 rounded-xl text-sm font-bold transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default SemesterResultModal;
