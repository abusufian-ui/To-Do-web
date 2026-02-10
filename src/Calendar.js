import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, 
  CheckCircle2, X, AlignLeft, Flag, Minus, ArrowDown, ChevronsUp, ChevronUp,
  CalendarDays, Book, Plus, Mail, Activity, ListTodo, Trash2, Edit2, Save, ChevronDown
} from 'lucide-react';
import UCPLogo from './UCPLogo';

// --- 1. HELPER: COLORS & ICONS ---
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

const formatDisplayDate = (dateString) => {
  if (!dateString) return "None";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// --- TIME FORMATTER (24h -> 12h AM/PM) ---
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// --- SYNCED PRIORITY CONFIG ---
const getPriorityConfig = (p) => {
  switch(p) {
    case 'Critical': return { icon: ChevronsUp, color: 'text-red-600 dark:text-red-500', label: p };
    case 'High': return { icon: ChevronUp, color: 'text-orange-600 dark:text-orange-500', label: p };
    case 'Medium': return { icon: Minus, color: 'text-yellow-600 dark:text-yellow-500', label: p };
    case 'Low': return { icon: ArrowDown, color: 'text-blue-600 dark:text-blue-500', label: p };
    default: return { icon: Minus, color: 'text-gray-500', label: p };
  }
};

// --- SYNCED STATUS CONFIG ---
const getStatusConfig = (s) => {
  switch(s) {
    case 'Scheduled': return { icon: CalendarIcon, color: 'text-gray-500 dark:text-gray-400', label: s };
    case 'In Progress': return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-500', label: s };
    case 'New task': return { icon: Mail, color: 'text-blue-600 dark:text-blue-400', label: 'New task' };
    case 'Completed': return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-500', label: s };
    default: return { icon: CheckCircle2, color: 'text-gray-400', label: s };
  }
};

const CourseTypeIcon = ({ courseName, courses = [], className = "w-3 h-3" }) => {
  if (!courseName) return <Book className={className} />;
  if (courseName.toLowerCase() === 'event') return <CalendarDays className={className} />;
  const courseObj = courses?.find(c => c.name === courseName);
  if (courseObj?.type === 'uni') return <UCPLogo className={`${className} fill-current`} />;
  return <Book className={className} />;
};

// --- CUSTOM DROPDOWN FOR EDIT MODE ---
const EditDropdown = ({ value, options, onChange, getConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = getConfig(value) || {};
  const CurrentIcon = currentConfig.icon || AlertCircle;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-lg px-2 py-1.5 text-xs text-left transition-all"
      >
        <span className={`flex items-center gap-2 truncate font-medium ${currentConfig.color}`}>
          <CurrentIcon size={14} /> {value}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto">
          {options.map(opt => {
            const config = getConfig(opt) || {};
            const Icon = config.icon || AlertCircle;
            return (
              <div 
                key={opt} 
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs ${config.color || 'text-gray-700'}`}
              >
                <Icon size={14} /> 
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- 2. MODAL COMPONENT ---
const CalendarTaskModal = ({ task, onClose, courses, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', date: '', time: '', priority: '', status: '' });
  const [includeTime, setIncludeTime] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name || '',
        description: task.description || '',
        date: task.date || '',
        time: task.time || '',
        priority: task.priority || 'Medium',
        status: task.status || 'New task'
      });
      setIncludeTime(!!task.time);
      setIsEditing(false);
    }
  }, [task]);

  if (!task) return null;
  const theme = getCourseColor(task.course);
  
  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;
  
  const priorityConfig = getPriorityConfig(task.priority);
  const PriorityIcon = priorityConfig.icon;

  const handleSave = () => {
    if (form.name !== task.name) onUpdate(task.id, 'name', form.name);
    if (form.description !== task.description) onUpdate(task.id, 'description', form.description);
    if (form.date !== task.date) onUpdate(task.id, 'date', form.date);
    
    const timeToSave = includeTime ? form.time : null;
    if (timeToSave !== task.time) onUpdate(task.id, 'time', timeToSave);

    if (form.priority !== task.priority) onUpdate(task.id, 'priority', form.priority);
    if (form.status !== task.status) onUpdate(task.id, 'status', form.status);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  const showTimeCell = isEditing ? includeTime : !!task.time;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden">
        
        {/* Header */}
        <div className={`p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-start ${theme.bg}`}>
          <div className="flex-1 mr-4">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-white/30 backdrop-blur-md text-white mb-2 w-fit border border-white/20 shadow-sm`}>
               <CourseTypeIcon courseName={task.course} courses={courses} className="w-3 h-3 text-black" />
               <span className="text-[10px] font-bold uppercase tracking-wider">{task.course}</span>
            </div>
            {isEditing ? (
              <input 
                type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                className="text-xl font-bold text-white bg-transparent border-b border-white/30 px-0 py-1 w-full outline-none focus:border-white placeholder-white/50"
              />
            ) : (
              <h2 className="text-xl font-bold text-white leading-tight">{task.name}</h2>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={isEditing ? handleSave : () => setIsEditing(true)} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white">{isEditing ? <Save size={18} /> : <Edit2 size={18} />}</button>
            <button onClick={handleDelete} className="p-2 bg-black/20 hover:bg-red-500/80 rounded-full transition-colors text-white"><Trash2 size={18} /></button>
            <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-3">
             <div className="mt-1"><AlignLeft size={18} className="text-gray-400" /></div>
             <div className="flex-1">
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
               {isEditing ? (
                 <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows="3" className="w-full text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
               ) : (
                 <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description || "No description provided."}</p>
               )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Due Date */}
            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-2 mb-1"><CalendarIcon size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Due Date</span></div>
              {isEditing ? (
                <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full text-xs bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded p-1 dark:text-white dark:[color-scheme:dark]" />
              ) : (
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 pl-6">{formatDisplayDate(task.date)}</p>
              )}
            </div>

            {/* Time / Created On */}
            {showTimeCell ? (
                <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Time</span></div>
                    {isEditing && (<button onClick={() => { setIncludeTime(false); setForm({...form, time: ''}); }} className="text-[10px] text-red-500 font-bold hover:underline">Remove</button>)}
                  </div>
                  {isEditing ? (
                    <input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="w-full text-xs bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded p-1 dark:text-white dark:[color-scheme:dark]" />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 pl-6">{formatTime(task.time)}</p>
                  )}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Created On</span></div>
                    {isEditing && (<button onClick={() => setIncludeTime(true)} className="text-[10px] text-brand-blue font-bold hover:underline">+ Add Time</button>)}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 pl-6">{formatDisplayDate(task.createdAt || new Date())}</p>
                </div>
            )}

            {/* Priority */}
            <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-2 mb-1"><Flag size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Priority</span></div>
              {isEditing ? (
                <EditDropdown value={form.priority} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => setForm({...form, priority: val})} getConfig={getPriorityConfig} />
              ) : (
                <div className="flex items-center gap-2 pl-6"><PriorityIcon size={14} className={priorityConfig.color} /><p className={`text-sm font-semibold ${priorityConfig.color}`}>{task.priority}</p></div>
              )}
            </div>

             {/* Status */}
             <div className="bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase">Status</span></div>
              {isEditing ? (
                <EditDropdown value={form.status} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => setForm({...form, status: val})} getConfig={getStatusConfig} />
              ) : (
                <div className="flex items-center gap-2 pl-6"><StatusIcon size={14} className={statusConfig.color} /><p className={`text-sm font-semibold ${statusConfig.color}`}>{task.status}</p></div>
              )}
            </div>
          </div>

          {/* Subtasks */}
          {task.subTasks && task.subTasks.length > 0 && (
             <div className="border-t border-gray-100 dark:border-[#2C2C2C] pt-4">
                <div className="flex items-center gap-2 mb-3"><ListTodo size={14} className="text-gray-400" /><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subtasks</span></div>
                <div className="space-y-2 bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                  {task.subTasks.map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <span className={`${sub.completed ? 'line-through text-gray-400' : ''} leading-snug`}>{sub.text}</span>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 3. MAIN CALENDAR COMPONENT ---
const Calendar = ({ tasks, courses = [], onAddWithDate, onUpdate, onDelete }) => { 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const activeTask = selectedTask ? tasks.find(t => t.id === selectedTask.id) : null;

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
      
      {/* Header Toolbar */}
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

      {/* --- UNIFIED SINGLE GRID --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="grid grid-cols-7 grid-rows-[auto_1fr] min-h-full">
          {/* Header Cells - FIXED: Removed conditional background transparency */}
          {weekDays.map((day, i) => (
            <div key={`header-${i}`} className={`py-3 text-center border-b border-r border-gray-200 dark:border-[#27272a] last:border-r-0 sticky top-0 z-30 bg-white dark:bg-[#09090b]`}>
              <span className={`text-[11px] font-bold uppercase block mb-1 tracking-wider ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <div className={`text-lg font-bold inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 dark:text-gray-200'}`}>{day.getDate()}</div>
            </div>
          ))}

          {/* Body Columns */}
          {weekDays.map((day, i) => {
            const columnDateStr = toISODateString(day);
            let dayTasks = tasks.filter(task => task.date && task.date === columnDateStr);
            dayTasks.sort((a, b) => { const timeA = a.time || '00:00'; const timeB = b.time || '00:00'; return timeA.localeCompare(timeB); });

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
                                <span className="text-[10px] font-bold uppercase opacity-80 flex items-center gap-1">
                                   <CourseTypeIcon courseName={task.course} courses={courses} className="w-3 h-3" />
                                   {task.course}
                                </span>
                                {task.priority === 'Critical' && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]"></div>}
                             </div>
                             <div className="flex items-center gap-1 text-xs font-bold bg-black/10 w-fit px-1.5 py-0.5 rounded">
                                <Clock size={12} /> <span className={isCompleted ? 'line-through' : ''}>{formatTime(task.time)}</span>
                             </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold uppercase opacity-80 truncate max-w-[80%] flex items-center gap-1">
                               <CourseTypeIcon courseName={task.course} courses={courses} className="w-3 h-3" />
                               {task.course}
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
      <CalendarTaskModal task={activeTask} onClose={() => setSelectedTask(null)} courses={courses} onUpdate={onUpdate} onDelete={onDelete} />
    </div>
  );
};

export default Calendar;  