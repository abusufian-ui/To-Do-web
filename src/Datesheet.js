import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, Timer, Activity, MapPin } from 'lucide-react';

const Datesheet = ({ exams = [] }) => {
  const [now, setNow] = useState(new Date());

  // Keep the time fresh every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getExamStatus = (dateStr, timeStr) => {
    try {
      const startTimeMatch = timeStr.match(/(\d{2}):(\d{2})/);
      let targetDate = new Date(dateStr);
      
      if (startTimeMatch) {
        targetDate.setHours(parseInt(startTimeMatch[1], 10), parseInt(startTimeMatch[2], 10), 0);
      }

      // Estimate the exam ends 2 hours after it starts
      let endDate = new Date(targetDate);
      endDate.setHours(endDate.getHours() + 2);

      // 1. If current time is past the end of the exam
      if (now > endDate) {
        return { 
          label: 'Done', 
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', 
          icon: <CheckCircle2 size={14} /> 
        };
      }

      const diffMs = targetDate - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      // 2. If we are currently inside the exam window
      if (diffMs < 0 && now <= endDate) {
        return { 
          label: 'In Progress', 
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse', 
          icon: <Activity size={14} /> 
        };
      }

      // 3. Future exams
      if (days === 0) {
         if (hours === 0) return { label: 'Starting Soon', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <Timer size={14} /> };
         return { label: `Today in ${hours}h`, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: <Clock size={14} /> };
      }
      
      if (days === 1) return { label: 'Tomorrow', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: <Calendar size={14} /> };
      
      return { label: `In ${days} days`, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20', icon: <Calendar size={14} /> };
    } catch (e) {
      return { label: 'Scheduled', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: <Calendar size={14} /> };
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Determine how many are done vs remaining
  const remainingCount = exams.filter(e => {
    let targetDate = new Date(e.date);
    const startTimeMatch = e.time.match(/(\d{2}):(\d{2})/);
    if (startTimeMatch) targetDate.setHours(parseInt(startTimeMatch[1], 10) + 2, parseInt(startTimeMatch[2], 10), 0);
    return now <= targetDate;
  }).length;

  return (
    <div className="h-full flex flex-col animate-fadeIn overflow-hidden">
      
      {/* Immersive Header */}
      <div className="px-6 md:px-10 pt-10 pb-8 shrink-0 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-brand-blue"></div>
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
          <AlertCircle className="text-red-500" size={40} strokeWidth={2.5} />
          Final Datesheet
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-3 font-medium text-lg ml-[56px]">
          You have <span className="text-red-500 font-bold">{remainingCount}</span> remaining exams to conquer. Stay focused!
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Exams Completed!</h3>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">Take a deep breath. Your datesheet is completely clear right now.</p>
        </div>
      ) : (
        /* Full Bleed Data Grid */
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-10">
          <table className="w-full text-left border-collapse">
            
            <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-[#121212]/95 backdrop-blur-md border-b-2 border-gray-200 dark:border-[#2C2C2C]">
              <tr>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400 w-12 text-center">#</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Subject</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400 hidden lg:table-cell">Instructor</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400">Date & Time</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400 hidden sm:table-cell">Venue</th>
                <th className="py-4 font-bold text-xs uppercase tracking-widest text-gray-400 text-right pr-2">Status</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 dark:divide-[#252525]">
              {exams.sort((a, b) => new Date(a.date) - new Date(b.date)).map((exam, index) => {
                const status = getExamStatus(exam.date, exam.time);
                const isDone = status.label === 'Done';
                
                return (
                  <tr 
                    key={exam._id || index} 
                    className={`group transition-colors duration-200 hover:bg-white dark:hover:bg-[#1A1A1A] ${isDone ? 'opacity-40 grayscale-[30%]' : ''}`}
                  >
                    {/* Index */}
                    <td className="py-5 px-2 text-center text-sm font-black text-gray-300 dark:text-[#444]">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    
                    {/* Subject */}
                    <td className="py-5 pr-4">
                      <div className={`text-base md:text-lg font-black tracking-tight ${isDone ? 'text-gray-500' : 'text-gray-900 dark:text-white group-hover:text-brand-blue transition-colors'}`}>
                        {exam.courseName}
                      </div>
                      {/* Mobile Instructor Fallback */}
                      <div className="lg:hidden flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                        <User size={12} className="opacity-60" /> {exam.instructor || 'TBA'}
                      </div>
                    </td>
                    
                    {/* Instructor (Desktop) */}
                    <td className="py-5 pr-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        <User size={14} className="text-gray-400" />
                        {exam.instructor || 'TBA'}
                      </div>
                    </td>
                    
                    {/* Date & Time */}
                    <td className="py-5 pr-4">
                      <div className="flex flex-col gap-1">
                         <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {formatDate(exam.date)}
                         </div>
                         <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                           <Clock size={12} className="text-brand-blue opacity-80" /> {exam.time}
                         </div>
                      </div>
                    </td>
                    
                    {/* Venue */}
                    <td className="py-5 pr-4 hidden sm:table-cell">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-[#252525] rounded-md text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#333]">
                        <MapPin size={12} className="text-emerald-500" />
                        {exam.venue || 'TBA'}
                      </div>
                    </td>
                    
                    {/* Status Badge */}
                    <td className="py-5 text-right pr-2">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs uppercase tracking-wider font-bold border ${status.color}`}>
                        {status.icon}
                        <span className="hidden sm:inline">{status.label}</span>
                      </div>
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

export default Datesheet;