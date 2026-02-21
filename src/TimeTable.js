import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, CalendarDays, X, BookOpen } from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const startHour = 8;  // 08:00 AM
const endHour = 18; // 06:00 PM
const totalHours = endHour - startHour;
const HOUR_HEIGHT = 115; // Set to mimic 67% scale compactly

// Premium SaaS color themes
const colorThemes = [
  { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', text: 'text-blue-900 dark:text-blue-100', icon: 'text-blue-500 dark:text-blue-400', hoverRing: 'hover:ring-blue-300 dark:hover:ring-blue-700/50', accent: 'bg-blue-500' },
  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', text: 'text-emerald-900 dark:text-emerald-100', icon: 'text-emerald-500 dark:text-emerald-400', hoverRing: 'hover:ring-emerald-300 dark:hover:ring-emerald-700/50', accent: 'bg-emerald-500' },
  { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/50', text: 'text-purple-900 dark:text-purple-100', icon: 'text-purple-500 dark:text-purple-400', hoverRing: 'hover:ring-purple-300 dark:hover:ring-purple-700/50', accent: 'bg-purple-500' },
  { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', text: 'text-orange-900 dark:text-orange-100', icon: 'text-orange-500 dark:text-orange-400', hoverRing: 'hover:ring-orange-300 dark:hover:ring-orange-700/50', accent: 'bg-orange-500' },
  { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800/50', text: 'text-rose-900 dark:text-rose-100', icon: 'text-rose-500 dark:text-rose-400', hoverRing: 'hover:ring-rose-300 dark:hover:ring-rose-700/50', accent: 'bg-rose-500' },
  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800/50', text: 'text-indigo-900 dark:text-indigo-100', icon: 'text-indigo-500 dark:text-indigo-400', hoverRing: 'hover:ring-indigo-300 dark:hover:ring-indigo-700/50', accent: 'bg-indigo-500' },
];

const TimeTable = () => {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/timetable`, {
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
      } catch (err) {
        console.error("Failed to fetch timetable", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTimetable();
  }, []);

  const getPositionStyles = (startTime, endTime) => {
    const [startH, startM] = (startTime || '00:00').split(':').map(Number);
    const [endH, endM] = (endTime || '00:00').split(':').map(Number);

    const startMinutesInDay = (startH - startHour) * 60 + startM;
    const endMinutesInDay = (endH - startHour) * 60 + endM;
    const durationMinutes = endMinutesInDay - startMinutesInDay;

    const pxPerMinute = HOUR_HEIGHT / 60; 

    return {
      top: `${startMinutesInDay * pxPerMinute}px`,
      height: `${durationMinutes * pxPerMinute}px`,
    };
  };

  const getTheme = (courseName) => {
    const index = (courseName?.length || 0) % colorThemes.length;
    return colorThemes[index];
  };

  const cleanCourseName = (name) => {
    return name ? name.replace(/\.{2,}/g, '').trim() : '';
  };

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#121212] transition-colors duration-300 animate-fadeIn">
      
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2A2A2A] flex justify-between items-center bg-white dark:bg-[#1A1A1A] z-40 shrink-0 shadow-sm relative">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-inner">
              <CalendarDays className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            Class Schedule
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">Live sync from your UCP Horizon Portal</p>
        </div>
        
        <div className="hidden sm:flex items-center gap-3">
          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-600/20 dark:to-indigo-600/20 text-blue-700 dark:text-blue-400 rounded-md text-xs font-bold tracking-wide border border-blue-100 dark:border-blue-800/30">
            Spring Semester
          </span>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 relative flex flex-col overflow-hidden bg-gray-50 dark:bg-[#121212]">
        
        {isLoading && (
           <div className="absolute inset-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
             <p className="text-gray-600 dark:text-gray-300 font-bold text-sm">Syncing Schedule...</p>
           </div>
        )}

        {/* Scrollable Area - Now allows table to fit to page without forcing horizontal scroll on desktops */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <div className="min-w-[850px] w-full relative h-full"> 
            
            {/* Table Header Row (Days) - Sticky to top */}
            {/* Shrunk the time column to 60px to give days more room */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-30 shadow-sm">
              <div className="py-2.5 px-1 flex items-center justify-center text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-r border-gray-200 dark:border-[#2A2A2A] sticky left-0 z-40 bg-gray-50 dark:bg-[#1A1A1A]">
                Time
              </div>
              {daysOfWeek.map(day => (
                <div key={day} className="py-2.5 text-center text-[11px] font-bold text-gray-700 dark:text-gray-200 border-b border-r border-gray-200 dark:border-[#2A2A2A] last:border-r-0 bg-gray-50 dark:bg-[#1A1A1A]">
                  {day}
                </div>
              ))}
            </div>

            {/* Timetable Body Grid */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
              
              {/* Time Column (Y-Axis) */}
              <div className="flex flex-col border-r border-gray-200 dark:border-[#2A2A2A] sticky left-0 z-20 bg-gray-50 dark:bg-[#1A1A1A]">
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-gray-200 dark:border-[#2A2A2A] relative bg-gray-50 dark:bg-[#1A1A1A]">
                    <span className="absolute top-1 left-0 w-full text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 px-1">
                      {String(startHour + i).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns containing the classes */}
              {daysOfWeek.map((day) => (
                <div key={day} className="border-r border-gray-200 dark:border-[#222] last:border-r-0 relative group">
                  
                  {/* Background Grid Lines */}
                  {Array.from({ length: totalHours * 2 }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ height: `${HOUR_HEIGHT / 2}px` }} 
                      className={`border-b ${i % 2 === 0 ? 'border-dashed border-gray-200 dark:border-[#1E1E1E]' : 'border-solid border-gray-200 dark:border-[#222]'}`}
                    ></div>
                  ))}

                  {/* Render the Classes */}
                  {classes
                    .filter(c => c.day === day)
                    .map(c => {
                      const style = getPositionStyles(c.startTime, c.endTime);
                      const theme = getTheme(c.courseName);
                      
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClass(c)}
                          className={`absolute w-[94%] left-[3%] rounded-lg shadow-sm border transition-all duration-200 flex flex-col overflow-hidden cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:z-10 z-0 ring-1 ring-transparent ${theme.hoverRing} ${theme.bg} ${theme.border}`}
                          style={{...style, minHeight: '45px'}}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.accent}`}></div>
                          
                          {/* Tighter padding and text limits for compact view */}
                          <div className="p-1.5 pl-2.5 flex flex-col h-full overflow-hidden">
                              <div className={`text-[9px] font-black tracking-widest uppercase flex items-center gap-1 opacity-90 mb-0.5 shrink-0 ${theme.text}`}>
                                <Clock size={10} strokeWidth={2.5} />
                                {c.startTime} - {c.endTime}
                              </div>
                              
                              <h4 className={`text-[10px] md:text-[11px] font-bold leading-tight mb-1 flex-1 line-clamp-2 ${theme.text}`}>
                                {cleanCourseName(c.courseName)}
                              </h4>
                              
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <div className={`text-[9px] font-semibold flex items-center gap-1 opacity-90 ${theme.text}`}>
                                  <User size={10} className={`shrink-0 ${theme.icon}`} strokeWidth={2.5} />
                                  <span className="truncate">{c.instructor}</span>
                                </div>
                                <div className={`text-[9px] font-semibold flex items-center gap-1 opacity-90 ${theme.text}`}>
                                  <MapPin size={10} className={`shrink-0 ${theme.icon}`} strokeWidth={2.5} />
                                  <span className="truncate">{c.room}</span>
                                </div>
                              </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- CLASS SUMMARY MODAL --- */}
      {selectedClass && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedClass(null)}
        >
          <div 
            className="bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#333] transform transition-all animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 relative bg-gradient-to-br ${getTheme(selectedClass.courseName).bg}`}>
              <button 
                onClick={() => setSelectedClass(null)}
                className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 ${getTheme(selectedClass.courseName).text}`}
              >
                <X size={18} />
              </button>
              
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-white shadow-sm dark:bg-[#2C2C2C] ${getTheme(selectedClass.courseName).text}`}>
                <BookOpen size={20} />
              </div>
              
              <h3 className={`text-xl font-black leading-tight pr-6 break-words ${getTheme(selectedClass.courseName).text}`}>
                {cleanCourseName(selectedClass.courseName)}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500"><CalendarDays size={18} /></div>
                <div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Day</p>
                  <p className="font-semibold text-sm">{selectedClass.day}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-500"><Clock size={18} /></div>
                <div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Time</p>
                  <p className="font-semibold text-sm">{selectedClass.startTime} — {selectedClass.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500"><User size={18} /></div>
                <div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Instructor</p>
                  <p className="font-semibold text-sm">{selectedClass.instructor}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500"><MapPin size={18} /></div>
                <div>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Room / Location</p>
                  <p className="font-semibold text-sm">{selectedClass.room}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #444; border-color: #121212; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #666; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUp { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default TimeTable;