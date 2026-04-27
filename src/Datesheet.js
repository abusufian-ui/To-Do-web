import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, AlertCircle, Timer, ChevronRight } from 'lucide-react';

const Datesheet = ({ exams = [] }) => {
  const [now, setNow] = useState(new Date());

  // Keep countdowns fresh
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const calculateCountdown = (dateStr, timeStr) => {
    try {
      // Parse "YYYY-MM-DD" and "09:00 - 10:30"
      const startTimeMatch = timeStr.match(/(\d{2}):(\d{2})/);
      let targetDate = new Date(dateStr);
      
      if (startTimeMatch) {
        targetDate.setHours(parseInt(startTimeMatch[1], 10), parseInt(startTimeMatch[2], 10), 0);
      }

      const diffMs = targetDate - now;
      if (diffMs < 0) return { text: "Exam Completed", color: "text-gray-500 bg-gray-100 dark:bg-[#2C2C2C] dark:text-gray-400 border-gray-200 dark:border-[#444]" };

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days === 0) {
        if (hours === 0) return { text: "Starting Soon!", color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900/30 animate-pulse" };
        return { text: `Today in ${hours}h`, color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900/30" };
      }
      if (days === 1) return { text: "Tomorrow", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-900/30" };
      if (days <= 3) return { text: `In ${days} Days`, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30" };
      
      return { text: `${days} Days Left`, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/30" };
    } catch (e) {
      return { text: "Scheduled", color: "text-gray-500 bg-gray-100" };
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <AlertCircle className="text-red-500" size={36} />
            Final Datesheet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            You have <span className="text-red-500 font-bold">{exams.length}</span> upcoming exams scheduled. Stay focused!
          </p>
        </div>
      </div>

      {/* Empty State */}
      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-center bg-white dark:bg-[#1E1E1E] p-10 rounded-3xl border border-gray-200 dark:border-[#333] shadow-sm max-w-lg mx-auto">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <Calendar size={32} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Exams Scheduled!</h3>
          <p className="text-gray-500 dark:text-gray-400">Take a deep breath. Your datesheet is completely clear right now.</p>
        </div>
      ) : (
        /* Premium Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {exams.map((exam, index) => {
            const status = calculateCountdown(exam.date, exam.time);
            
            return (
              <div 
                key={exam._id || index} 
                className="relative overflow-hidden bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm hover:shadow-xl transition-all group duration-300 hover:-translate-y-1"
              >
                {/* Top Accent Gradient Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-blue-500"></div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="pr-4">
                      <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-brand-blue transition-colors">
                        {exam.courseName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                        <User size={14} className="text-gray-400" /> {exam.instructor || 'TBA'}
                      </p>
                    </div>
                    
                    {/* The Dynamic Status Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shrink-0 shadow-sm ${status.color}`}>
                      <Timer size={14} strokeWidth={2.5} /> 
                      {status.text}
                    </div>
                  </div>

                  {/* Inner Data Grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                    
                    {/* Date & Time */}
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Date & Time</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mb-1">
                        <Calendar size={14} className="text-brand-blue" /> 
                        {formatDate(exam.date)}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 pl-5">
                        <Clock size={12} /> {exam.time}
                      </span>
                    </div>

                    {/* Venue */}
                    <div className="flex flex-col border-l border-gray-200 dark:border-[#333] pl-4">
                      <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">Venue</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <MapPin size={14} className="text-emerald-500" /> 
                        {exam.venue || 'TBA'}
                      </span>
                      <button className="mt-auto text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-0.5 transition-colors">
                        View Map <ChevronRight size={10} strokeWidth={3} />
                      </button>
                    </div>
                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Datesheet;