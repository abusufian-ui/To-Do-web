import React, { useState, useEffect } from 'react';
import { Clock, MapPin, User, CalendarDays } from 'lucide-react';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const startHour = 8; // 08:00 AM
const endHour = 18; // 06:00 PM (Extended for late labs)
const totalHours = endHour - startHour;
const HOUR_HEIGHT = 130; // Increased height significantly for better text spacing

const Timetable = () => {
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This fetches your actual synced data from your MongoDB database!
    const fetchTimetable = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const API_BASE = process.env.REACT_APP_API_URL || '';
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

  // Calculates exact pixel placement based on time strings (e.g., "08:50")
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

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-300 animate-fadeIn">
      
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <CalendarDays className="text-blue-600 dark:text-blue-400" size={26} />
            </div>
            Class Schedule
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium">Live sync from your UCP Horizon Portal</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-dark-surface p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
          <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-bold tracking-wide border border-blue-100 dark:border-blue-800/30">
            Spring Semester
          </span>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-xl flex flex-col relative">
        
        {/* Loading Overlay */}
        {isLoading && (
           <div className="absolute inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-md flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
             <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">Loading your classes...</p>
           </div>
        )}

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto custom-scrollbar relative scroll-smooth">
          <div className="min-w-[1100px] relative">
            
            {/* Header Row (Days) - Sticky to top */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] sticky top-0 z-40 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-gray-200 dark:border-[#2C2C2C] shadow-sm">
              <div className="py-4 px-2 flex items-center justify-center text-[11px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200 dark:border-[#2C2C2C]">
                Time
              </div>
              {daysOfWeek.map(day => (
                <div key={day} className="py-4 text-center font-bold text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-[#2C2C2C] last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Timetable Body Grid */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] relative">
              
              {/* Time Column (Y-Axis) */}
              <div className="flex flex-col border-r border-gray-200 dark:border-[#2C2C2C] bg-gray-50/50 dark:bg-[#141414]">
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-gray-200 dark:border-[#2C2C2C] relative">
                    <span className="absolute -top-2.5 left-0 w-full text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-[#141414] px-1">
                      {String(startHour + i).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns containing the classes */}
              {daysOfWeek.map((day) => (
                <div key={day} className="border-r border-gray-200 dark:border-[#2C2C2C] last:border-r-0 relative group">
                  
                  {/* Background Grid Lines (Hover effect for columns) */}
                  {Array.from({ length: totalHours + 1 }).map((_, i) => (
                    <div key={i} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-dashed border-gray-100 dark:border-[#222] transition-colors group-hover:bg-gray-50/50 dark:group-hover:bg-[#1E1E1E]/50"></div>
                  ))}

                  {/* Render the Classes */}
                  {classes
                    .filter(c => c.day === day)
                    .map(c => {
                      const style = getPositionStyles(c.startTime, c.endTime);
                      
                      return (
                        <div
                          key={c.id}
                          className={`absolute w-[94%] left-[3%] rounded-xl shadow-sm border border-white/20 dark:border-white/10 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:z-30 overflow-hidden group/card flex flex-col p-2.5 md:p-3 ${c.color || 'bg-blue-600'}`}
                          style={{...style, minHeight: '70px'}}
                        >
                          {/* Sleek Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                          
                          <div className="relative z-10 flex flex-col h-full text-white">
                            
                            {/* Time Badge */}
                            <div className="flex justify-between items-start mb-1.5">
                              <div className="font-bold text-[10px] md:text-[11px] tracking-wider bg-black/25 px-2 py-1 rounded-md backdrop-blur-md inline-flex items-center gap-1.5 shadow-inner">
                                <Clock size={12} strokeWidth={2.5} />
                                {c.startTime} - {c.endTime}
                              </div>
                            </div>
                            
                            {/* Course Title */}
                            <h3 className="font-extrabold text-xs md:text-sm leading-snug line-clamp-2 mt-0.5 group-hover/card:line-clamp-none drop-shadow-md mb-2">
                              {c.courseName}
                            </h3>
                            
                            {/* Metadata */}
                            <div className="mt-auto space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold opacity-90 line-clamp-1 bg-black/10 rounded px-1.5 py-0.5">
                                <User size={12} className="shrink-0" />
                                <span className="truncate">{c.instructor}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold opacity-90 bg-black/10 rounded px-1.5 py-0.5">
                                <MapPin size={12} className="shrink-0" />
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

      {/* Global styles for this component's scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
      `}</style>
    </div>
  );
};

export default Timetable;