import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertCircle, CheckCircle2, Timer, Activity } from 'lucide-react';

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

      // If current time is past the end of the exam
      if (now > endDate) {
        return { 
          label: 'Done', 
          color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30', 
          icon: <CheckCircle2 size={14} /> 
        };
      }

      const diffMs = targetDate - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      // If we are currently inside the exam window
      if (diffMs < 0 && now <= endDate) {
        return { 
          label: 'In Progress', 
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse', 
          icon: <Activity size={14} /> 
        };
      }

      // Future exams
      if (days === 0) {
         if (hours === 0) return { label: 'Starting Soon', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/30', icon: <Timer size={14} /> };
         return { label: `Today in ${hours}h`, color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30', icon: <Clock size={14} /> };
      }
      
      if (days === 1) return { label: 'Tomorrow', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30', icon: <Calendar size={14} /> };
      
      return { label: `In ${days} days`, color: 'bg-gray-50 text-gray-600 dark:bg-[#252525] dark:text-gray-400 border border-gray-200 dark:border-[#333]', icon: <Calendar size={14} /> };
    } catch (e) {
      return { label: 'Scheduled', color: 'bg-gray-100 text-gray-600', icon: <Calendar size={14} /> };
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
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fadeIn">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <AlertCircle className="text-red-500" size={32} />
            Final Datesheet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
            You have <span className="text-red-500 font-bold">{remainingCount}</span> remaining exams to conquer. Stay focused!
          </p>
        </div>
      </div>

      {exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-32 text-center bg-white dark:bg-[#1E1E1E] p-10 rounded-3xl border border-gray-200 dark:border-[#333] shadow-sm max-w-lg mx-auto">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Exams Completed!</h3>
          <p className="text-gray-500 dark:text-gray-400">Take a deep breath. Your datesheet is completely clear right now.</p>
        </div>
      ) : (
        /* Premium Table Layout */
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-[#333] text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="p-4 font-bold w-12 text-center">Sr#</th>
                  <th className="p-4 font-bold">Class</th>
                  <th className="p-4 font-bold">Teacher</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Time</th>
                  <th className="p-4 font-bold">Venue</th>
                  <th className="p-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
                {exams.sort((a, b) => new Date(a.date) - new Date(b.date)).map((exam, index) => {
                  const status = getExamStatus(exam.date, exam.time);
                  const isDone = status.label === 'Done';
                  
                  return (
                    <tr 
                      key={exam._id || index} 
                      className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-[#252525]/50 ${isDone ? 'opacity-60' : ''}`}
                    >
                      <td className="p-4 text-center text-sm font-medium text-gray-400 dark:text-gray-500">
                        {index + 1}
                      </td>
                      
                      <td className="p-4">
                        <div className={`text-sm font-bold ${isDone ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {exam.courseName}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                          <User size={14} className="text-gray-400" />
                          {exam.instructor || 'TBA'}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {formatDate(exam.date)}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {exam.time}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {exam.venue || 'TBA'}
                        </div>
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Datesheet;