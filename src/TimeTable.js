import React, { useState, useEffect } from 'react';

// You will eventually fetch this from your backend or scraper API.
// IMPORTANT: Ensure your scraper formats the data exactly like this!
const mockScrapedData = [
  {
    id: 1,
    day: 'Wednesday',
    startTime: '08:50',
    endTime: '09:35',
    courseName: 'Theory of Automata & Formal Lang...',
    instructor: 'Syed Irtaza Muzaffar Shah',
    room: 'A-304 (Lecture)',
    color: 'bg-teal-500/80', 
  },
  {
    id: 2,
    day: 'Wednesday',
    startTime: '10:30',
    endTime: '11:15',
    courseName: 'Computer Communications and Net...',
    instructor: 'Muhammad Mashhood Tahir',
    room: 'CSNC2411 (Lab)',
    color: 'bg-emerald-600/80',
  },
  {
    id: 3,
    day: 'Thursday',
    startTime: '10:30',
    endTime: '12:05',
    courseName: 'Artificial Intelligence - Lab',
    instructor: 'Afham Nazir',
    room: 'B-CL207 (Lab)',
    color: 'bg-orange-400/90',
  },
  {
    id: 4,
    day: 'Monday',
    startTime: '11:20',
    endTime: '12:55',
    courseName: 'Advanced Web Programming',
    instructor: 'Dr. Kashif Nasr',
    room: 'C-CL405 (Lecture)',
    color: 'bg-slate-500/90',
  }
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const startHour = 8; // 08:00 AM
const endHour = 16; // 04:00 PM
const totalHours = endHour - startHour;

const Timetable = () => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    // Replace this with your actual fetch call when your scraper API is ready
    setClasses(mockScrapedData);
  }, []);

  // Helper function to calculate pixel position based on time
  const getPositionStyles = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutesInDay = (startH - startHour) * 60 + startM;
    const endMinutesInDay = (endH - startHour) * 60 + endM;
    const durationMinutes = endMinutesInDay - startMinutesInDay;

    // Assuming 1 hour = 80px in height for nice spacing
    const pxPerMinute = 80 / 60; 

    return {
      top: `${startMinutesInDay * pxPerMinute}px`,
      height: `${durationMinutes * pxPerMinute}px`,
    };
  };

  return (
    <div className="p-6 h-full flex flex-col bg-white dark:bg-dark-bg transition-colors duration-300">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">University Timetable</h2>
        <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full font-medium">
          Month : February
        </span>
      </div>

      <div className="flex-1 overflow-auto border border-gray-200 dark:border-dark-border rounded-xl shadow-sm bg-gray-50 dark:bg-[#1E1E1E]">
        <div className="min-w-[1000px] grid grid-cols-8 relative">
          
          {/* Header Row (Days) */}
          <div className="border-b border-r border-gray-200 dark:border-dark-border sticky top-0 bg-gray-50 dark:bg-[#1E1E1E] z-20"></div>
          {daysOfWeek.map(day => (
            <div key={day} className="py-4 text-center font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-dark-border sticky top-0 bg-gray-50 dark:bg-[#1E1E1E] z-20">
              {day}
            </div>
          ))}

          {/* Timetable Grid */}
          <div className="col-span-8 grid grid-cols-8 relative">
            
            {/* Time Labels (Y-Axis) */}
            <div className="border-r border-gray-200 dark:border-dark-border flex flex-col bg-gray-50 dark:bg-[#1E1E1E]">
              {Array.from({ length: totalHours + 1 }).map((_, i) => (
                <div key={i} className="h-[80px] border-b border-gray-200 dark:border-dark-border flex items-start justify-center text-xs text-gray-500 dark:text-gray-400 pt-2 font-medium">
                  {String(startHour + i).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day Columns containing the classes */}
            {daysOfWeek.map((day, colIndex) => (
              <div key={day} className="border-r border-gray-200 dark:border-dark-border relative">
                
                {/* Background Grid Lines */}
                {Array.from({ length: totalHours + 1 }).map((_, i) => (
                  <div key={i} className="h-[80px] border-b border-gray-100 dark:border-[#2C2C2C]"></div>
                ))}

                {/* Placed Classes */}
                {classes
                  .filter(c => c.day === day)
                  .map(c => {
                    const style = getPositionStyles(c.startTime, c.endTime);
                    return (
                      <div
                        key={c.id}
                        className={`absolute w-[96%] left-[2%] rounded-md p-2 text-white text-xs shadow-md overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer z-10 ${c.color || 'bg-blue-500'}`}
                        style={style}
                        title={`${c.courseName}\n${c.instructor}\n${c.room}`}
                      >
                        <div className="font-bold truncate text-[10px] opacity-90 mb-0.5">
                          {c.startTime} - {c.endTime}
                        </div>
                        <div className="font-semibold leading-tight mb-1 line-clamp-2">
                          {c.instructor}
                        </div>
                        <div className="font-medium truncate opacity-90 text-[10px]">
                          {c.courseName}
                        </div>
                        <div className="mt-1 text-[9px] opacity-80 truncate">
                          {c.room}
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
  );
};

export default Timetable;