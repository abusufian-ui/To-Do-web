import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, TrendingUp, TrendingDown, PieChart, Star, Activity, Clock, ArrowRight } from 'lucide-react';

const SemesterResultPage = ({ semesterStatus, onViewFullHistory, onDismiss }) => {
  const latest = semesterStatus?.latestResult;
  const previous = semesterStatus?.previousResult;

  const termName = latest?.term || "Semester";
  const sgpa = parseFloat(latest?.sgpa) || 0.00;
  const cgpa = parseFloat(latest?.cgpa) || 0.00;
  const earnedCH = latest?.earnedCH || "0";
  const courses = useMemo(() => latest?.courses || [], [latest?.courses]);

  // Calculate Grade Distribution for Donut Chart
  const gradeDistribution = useMemo(() => {
    const counts = {};
    courses.forEach((c) => {
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

    const total = courses.length || 1;
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

  // Find best course
  const topCourse = useMemo(() => {
    if (courses.length === 0) return null;
    return [...courses].sort((a, b) => {
      const aGp = parseFloat(a.gradePoints) || 0;
      const bGp = parseFloat(b.gradePoints) || 0;
      return bGp - aGp;
    })[0];
  }, [courses]);

  // Comparison math
  const prevSgpa = previous ? (parseFloat(previous.sgpa) || 0.00) : 0.00;
  const gpaDiff = sgpa - prevSgpa;
  const isImproved = gpaDiff >= 0;

  if (!semesterStatus || !semesterStatus.latestResult) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-[#9BA1A6] font-medium">
        <Award size={48} className="opacity-20 mb-4 animate-bounce" />
        <p>No active results audit available.</p>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <motion.div 
      className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 text-[#ECEDEE] select-none"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Hero Header */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-6 md:p-10 shadow-[0_8px_32px_rgba(16,185,129,0.05)]"
        variants={itemVariants}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Award size={14} /> Semester Completed
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#ECEDEE] uppercase leading-tight">
              {termName} <span className="bg-gradient-to-r from-[#22c55e] to-[#10b981] bg-clip-text text-transparent">Results Audit</span>
            </h1>
            <p className="text-sm md:text-base text-[#9BA1A6] font-semibold mt-2 max-w-xl">
              Congratulations! Your official results have been published. Let's analyze your academic performance breakdown.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={onViewFullHistory}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs md:text-sm font-extrabold transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:translate-y-[-2px] active:translate-y-[0]"
            >
              Result History <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      </motion.div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Scoreboards & Comparison Analytics */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Neon GPA Scoreboards */}
          <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
            <div className="relative group bg-[#151718] border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <span className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-widest mb-1 z-10">SGPA</span>
              <motion.span 
                className="text-5xl font-black text-emerald-500 z-10"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                {sgpa.toFixed(2)}
              </motion.span>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

            <div className="relative group bg-[#151718] border border-blue-500/30 rounded-2xl p-6 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <span className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-widest mb-1 z-10">CGPA</span>
              <motion.span 
                className="text-5xl font-black text-blue-500 z-10"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
              >
                {cgpa.toFixed(2)}
              </motion.span>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </motion.div>

          {/* Donut Chart - Grade Distribution */}
          <motion.div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-6" variants={itemVariants}>
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#ECEDEE]">Grade Distribution</h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
              <div className="relative w-[120px] h-[120px]">
                <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#2C2C2C" strokeWidth="8" />
                  {gradeDistribution.map((item, index) => (
                    <motion.circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="8"
                      strokeDasharray={item.strokeDasharray}
                      initial={{ strokeDashoffset: item.strokeDasharray }}
                      animate={{ strokeDashoffset: item.strokeDashoffset }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                      transform={`rotate(${item.rotationAngle} 50 50)`}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-[#9BA1A6]">Total</span>
                  <span className="text-xl font-black text-white">{courses.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {gradeDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[#ECEDEE] font-bold">{item.grade} <span className="text-[#9BA1A6] font-medium">({item.count})</span></span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Historical comparison */}
          {previous && (
            <motion.div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-6 space-y-4" variants={itemVariants}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-green-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#ECEDEE]">VS LAST SEMESTER</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isImproved ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {isImproved ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{isImproved ? `+${gpaDiff.toFixed(2)}` : `${gpaDiff.toFixed(2)}`} SGPA</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#9BA1A6] mb-1">
                    <span>{termName} SGPA</span>
                    <span className="text-white font-extrabold">{sgpa.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-[#2c2c2c] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(sgpa / 4) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#9BA1A6] mb-1">
                    <span>{previous.term} SGPA</span>
                    <span className="text-white font-extrabold">{prevSgpa.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-[#2c2c2c] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(prevSgpa / 4) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Right Side: Course breakdown table & Extra summaries */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Detailed Course breakdown list */}
          <motion.div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-6" variants={itemVariants}>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen size={18} className="text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#ECEDEE]">Course Breakdown</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 pb-3">
                    <th className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-wider pb-3">Course Detail</th>
                    <th className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-wider pb-3 text-center">Grade</th>
                    <th className="text-[10px] font-black text-[#9BA1A6] uppercase tracking-wider pb-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40">
                  {courses.map((c, index) => {
                    const grade = c.finalGrade || "W";
                    const isGood = ['A', 'A-', 'B+'].includes(grade);
                    const gradeColor = isGood ? 'text-green-500' : 'text-amber-500';
                    return (
                      <motion.tr 
                        key={index} 
                        className="hover:bg-white/[0.02] transition-colors"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="py-4 pr-4">
                          <div className="text-sm font-black text-[#ECEDEE]">{c.name}</div>
                          <div className="text-[10px] text-[#9BA1A6] font-semibold mt-0.5 tracking-wider uppercase">Code: {c.code || "N/A"} • {c.creditHours} Credit Hours</div>
                        </td>
                        <td className={`py-4 text-sm font-black text-center ${gradeColor}`}>{grade}</td>
                        <td className="py-4 text-sm text-[#ECEDEE] font-black text-right">{c.gradePoints || "0.00"}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Quick Metrics Cards */}
          <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={itemVariants}>
            {topCourse && (
              <div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-5 flex flex-col hover:border-gray-700 transition-colors">
                <Award size={20} className="text-blue-500 mb-3" />
                <span className="text-[10px] font-bold text-[#9BA1A6] uppercase tracking-wider mb-1">Top Course</span>
                <span className="text-sm font-black text-[#ECEDEE] truncate" title={topCourse.name}>{topCourse.name}</span>
                <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">GPA {topCourse.gradePoints} (Grade {topCourse.finalGrade})</span>
              </div>
            )}

            <div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-5 flex flex-col hover:border-gray-700 transition-colors">
              <Clock size={20} className="text-green-500 mb-3" />
              <span className="text-[10px] font-bold text-[#9BA1A6] uppercase tracking-wider mb-1">Credit Hours</span>
              <span className="text-sm font-black text-[#ECEDEE]">{earnedCH} CH</span>
              <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">Earned this term</span>
            </div>

            <div className="bg-[#1E1E1E]/55 border border-gray-800 rounded-2xl p-5 flex flex-col hover:border-gray-700 transition-colors">
              <Star size={20} className="text-amber-500 mb-3" />
              <span className="text-[10px] font-bold text-[#9BA1A6] uppercase tracking-wider mb-1">Performance</span>
              <span className="text-sm font-black text-[#ECEDEE]">{isImproved ? "Improving" : "Stable"}</span>
              <span className="text-[10px] text-[#9BA1A6] font-semibold mt-1">{sgpa.toFixed(2)} SGPA</span>
            </div>
          </motion.div>

        </div>

      </div>

    </motion.div>
  );
};

export default SemesterResultPage;
