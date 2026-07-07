import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Clock,
  CheckCircle2,
  CalendarDays, Book, Plus
} from 'lucide-react';
import UCPLogo from './UCPLogo';
import TaskSummaryModal from './TaskSummaryModal';


const getAbbreviation = (name) => {
  if (!name) return '';
  const n = name.toLowerCase().trim();
  if (n.includes('operating system')) return 'OS';
  if (n.includes('differential equation')) return 'DE';
  if (n.includes('software engineering')) return 'SE';
  if (n.includes('design and analysis')) return 'DAA';
  if (n.includes('game development')) return 'GameDev';
  if (n.includes('artificial intelligence')) return 'AI';
  if (n.includes('linear algebra')) return 'LA';
  if (n.includes('communication skills')) return 'Comm';
  if (n.includes('islamic studies')) return 'Islamiat';
  if (n.includes('pakistan studies')) return 'Pak Std';
  if (n.includes('programming fundamental')) return 'PF';
  if (n.includes('object oriented')) return 'OOP';
  if (n.includes('data structure')) return 'DSA';
  if (n.includes('database')) return 'DB';
  if (n.includes('computer network')) return 'CN';
  if (n.includes('general task')) return 'General';
  if (name.length > 15) {
    const ignoredWords = ['and', 'of', 'to', 'in', 'introduction', 'lab', 'for'];
    return name.split(' ').filter(word => !ignoredWords.includes(word.toLowerCase())).map(word => word[0]).join('').toUpperCase().substring(0, 5); 
  }
  return name;
};

const getCourseColor = (courseName) => {
  if (!courseName) return { bg: 'bg-gray-700', text: 'text-gray-200' };
  if (courseName.toLowerCase() === 'event') return { bg: 'bg-rose-600', text: 'text-white', isEvent: true };
  const themes = [
    { bg: 'bg-blue-600', text: 'text-white' }, { bg: 'bg-purple-600', text: 'text-white' }, { bg: 'bg-emerald-600', text: 'text-white' },
    { bg: 'bg-orange-500', text: 'text-white' }, { bg: 'bg-cyan-600', text: 'text-white' }, { bg: 'bg-indigo-600', text: 'text-white' },
    { bg: 'bg-teal-600', text: 'text-white' },
  ];
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  return themes[Math.abs(hash) % themes.length];
};

const toISODateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const CourseTypeIcon = ({ courseName, courses = [], className = "w-3 h-3" }) => {
  if (!courseName) return <Book className={className} />;
  if (courseName.toLowerCase() === 'event') return <CalendarDays className={className} />;
  const courseObj = courses?.find(c => c.name === courseName);
  if (courseObj?.type === 'uni') return <UCPLogo className={`${className} fill-current`} />;
  return <Book className={className} />;
};


const Calendar = ({ tasks, courses = [], onAddWithDate, onUpdate, user, activeGroup }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const activeTask = selectedTask ? tasks.find(t => (t.id || t._id) === (selectedTask.id || selectedTask._id)) : null;

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });

  const changeWeek = (direction) => { const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + (direction * 7)); setCurrentDate(newDate); };
  const isToday = (date) => toISODateString(date) === toISODateString(new Date());
  const currentMonth = startOfWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#09090b] animate-fadeIn">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>

      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#27272a] shrink-0">
        <h2 className="text-2xl font-bold dark:text-white text-gray-900 tracking-tight">{currentMonth}</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(new Date())} className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Today</button>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#18181b] p-1 rounded-lg">
            <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-white dark:hover:bg-[#27272a] rounded-md transition-all shadow-sm text-gray-600 dark:text-gray-300"><ChevronLeft size={18} /></button>
            <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#3f3f46]"></div>
            <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-white dark:hover:bg-[#27272a] rounded-md transition-all shadow-sm text-gray-600 dark:text-gray-300"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="grid grid-cols-7 grid-rows-[auto_1fr] min-h-full">
          {weekDays.map((day, i) => (
            <div key={`header-${i}`} className={`py-3 text-center border-b border-r border-gray-200 dark:border-[#27272a] last:border-r-0 sticky top-0 z-30 bg-white dark:bg-[#09090b]`}>
              <span className={`text-[11px] font-bold uppercase block mb-1 tracking-wider ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <div className={`text-lg font-bold inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 dark:text-gray-200'}`}>{day.getDate()}</div>
            </div>
          ))}

          {weekDays.map((day, i) => {
            const columnDateStr = toISODateString(day);
            let dayTasks = tasks.filter(task => task.date && task.date === columnDateStr);
            
            
            dayTasks.sort((a, b) => {
              
              const isCompletedA = a.status === 'Completed';
              const isCompletedB = b.status === 'Completed';
              if (isCompletedA && !isCompletedB) return 1;
              if (!isCompletedA && isCompletedB) return -1;

              
              const hasTimeA = !!a.time;
              const hasTimeB = !!b.time;
              if (hasTimeA && !hasTimeB) return -1;
              if (!hasTimeA && hasTimeB) return 1;

              
              if (hasTimeA && hasTimeB) {
                return a.time.localeCompare(b.time);
              }

              
              return a.name.localeCompare(b.name);
            });

            return (
              <div key={`body-${i}`} className={`p-2 border-r border-gray-200 dark:border-[#27272a] last:border-r-0 transition-colors relative group/col flex flex-col ${isToday(day) ? 'bg-blue-50/5 dark:bg-blue-900/5' : ''}`}>
                <button onClick={() => onAddWithDate(columnDateStr)} className="absolute inset-x-2 top-2 h-8 flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-[#333] text-gray-400 opacity-0 group-hover/col:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 hover:border-blue-400 transition-all z-20"><Plus size={16} /></button>
                <div className="space-y-2 pt-10 flex-1">
                  {dayTasks.map(task => {
                    const theme = getCourseColor(task.course);
                    const isCompleted = task.status === 'Completed';
                    const completedStyle = isCompleted ? 'opacity-60 grayscale' : '';

                    return (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)} 
                        className={`
                          ${theme.bg} ${theme.text} 
                          ${completedStyle}
                          p-3 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 
                          transition-all cursor-pointer group relative overflow-hidden
                        `}
                      >
                        {task.time ? (
                          <div className="flex flex-col gap-1.5 mb-2">
                             <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1" title={task.course}>
                                   <CourseTypeIcon courseName={task.course} courses={courses} className="w-3 h-3" />
                                   {getAbbreviation(task.course)}
                                </span>
                                {task.priority === 'Critical' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></div>}
                             </div>
                             <div className="flex items-center gap-1 text-xs font-bold bg-black/10 w-fit px-1.5 py-0.5 rounded">
                                <Clock size={12} /> <span className={isCompleted ? 'line-through' : ''}>{formatTime(task.time)}</span>
                             </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold uppercase opacity-80 truncate max-w-[80%] flex items-center gap-1" title={task.course}>
                               <CourseTypeIcon courseName={task.course} courses={courses} className="w-3 h-3" />
                               {getAbbreviation(task.course)}
                            </span>
                            {task.priority === 'Critical' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></div>}
                          </div>
                        )}
                        <h4 className={`text-xs font-bold leading-snug mb-2 line-clamp-3 ${isCompleted ? 'line-through' : ''}`}>{task.name}</h4>
                        <div className="flex items-center justify-between pt-2 border-t border-white/20">
                           <div className="flex items-center gap-1.5 opacity-90 text-[10px] font-medium">{task.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}<span>{task.status}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TaskSummaryModal
        isOpen={!!activeTask}
        onClose={() => setSelectedTask(null)}
        task={activeTask}
        courses={courses}
        onUpdate={onUpdate}
        user={user}
        activeGroup={activeGroup}
      />
    </div>
  );
};

export default Calendar;