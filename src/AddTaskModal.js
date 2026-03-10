import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, AlignLeft, ListTodo, Calendar, 
  Book, Mail, Clock, CheckCircle2, 
  ChevronsUp, ChevronUp, ChevronDown, Minus, ArrowDown,
  CalendarDays, AlertCircle, Link
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AddTaskModal = ({ isOpen, onClose, onSave, courses, timetable = [], initialDate, tasks = [] }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState(''); 
  const [status, setStatus] = useState('New task');
  const [date, setDate] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [subTasks, setSubTasks] = useState([]);
  const [subTaskInput, setSubTaskInput] = useState('');
  
  const [showCourseList, setShowCourseList] = useState(false);
  const [errors, setErrors] = useState({}); 
  
  const [localTimetable, setLocalTimetable] = useState(timetable || []);

  const courseDropdownRef = useRef(null);

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type !== 'uni');

  useEffect(() => {
    if (!isOpen) return;

    if (timetable && timetable.length > 0) {
      setLocalTimetable(timetable);
      return;
    }
    
    const fetchTimetable = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/timetable`, {
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setLocalTimetable(data);
        }
      } catch (error) {
        console.error("Failed to fetch timetable for suggestions:", error);
      }
    };
    
    fetchTimetable();
  }, [timetable, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialDate) setDate(initialDate);
      setErrors({}); 
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setShowCourseList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const parseTimeTo24Hour = (timeStr) => {
    if (!timeStr) return '';
    const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
    if (!match) return timeStr; 
    
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3];

    if (modifier) {
       if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
       if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
    }
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const getClassesForDate = (dateString, courseName) => {
    if (!dateString || !localTimetable || !localTimetable.length || !courseName || courseName === 'Event') return [];
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let targetDay = "";
    
    if (dateString.includes("-")) {
      const [y, m, d] = dateString.split("-");
      const localDate = new Date(Number(y), Number(m) - 1, Number(d));
      targetDay = days[localDate.getDay()];
    } else {
      targetDay = days[new Date(dateString).getDay()];
    }
    
    return localTimetable.filter(t => {
      const tDay = String(t.day || "").trim().toLowerCase();
      const tCourseName = String(t.courseName || t.name || "").trim().toLowerCase();
      const selectedCourseName = String(courseName).trim().toLowerCase();
      return tDay === targetDay.toLowerCase() && tCourseName === selectedCourseName;
    });
  };

  const classesToday = getClassesForDate(date, course);

  const getStatusIcon = (s) => {
    switch(s) {
      case 'Scheduled': return <Calendar size={14} />;
      case 'In Progress': return <Clock size={14} />;
      case 'Completed': return <CheckCircle2 size={14} />;
      default: return <Mail size={14} />;
    }
  };

  const getPriorityIcon = (p) => {
    switch(p) {
      case 'Critical': return <ChevronsUp size={14} />;
      case 'High': return <ChevronUp size={14} />;
      case 'Low': return <ArrowDown size={14} />;
      default: return <Minus size={14} />;
    }
  };

  const getSelectedCourseIcon = (courseName) => {
    if (courseName === 'Event') return <CalendarDays size={16} className="text-rose-500 shrink-0" />;
    const found = courses.find(c => c.name === courseName);
    if (found && found.type === 'uni') return <UCPLogo className="w-4 h-4 text-blue-500 shrink-0" />;
    return <Book size={16} className="text-gray-400 shrink-0" />;
  };

  const handleAddSubTask = () => {
    if (subTaskInput.trim()) {
      setSubTasks([...subTasks, { text: subTaskInput, completed: false }]);
      setSubTaskInput('');
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Task name is required";
    if (!course) newErrors.course = "Please select a course";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const timeValue = includeTime ? time : null;
    const isDuplicate = tasks.some(t => 
      t.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      t.course === course &&
      t.date === date &&
      t.time === timeValue &&
      t.status === status &&
      t.priority === priority
    );

    if (isDuplicate) {
      setErrors({ general: "This exact task already exists!" });
      return;
    }

    onSave({ name, description, course, date, time: timeValue, priority, status, subTasks });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName(''); setDescription(''); setCourse(''); setStatus('New task'); 
    setDate(''); setIncludeTime(false); setTime(''); setPriority('Medium'); setSubTasks([]);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold dark:text-white text-gray-800 flex items-center gap-2"><Plus className="text-brand-blue" size={20} /> Add New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>

        {errors.general && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-fadeIn shrink-0">
            <AlertCircle size={18} />
            {errors.general}
          </div>
        )}

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${errors.name ? 'text-red-500' : 'text-gray-400'}`}>Task Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => { setName(e.target.value); if(errors.name) setErrors({...errors, name: null}); }} 
              placeholder="e.g. Prepare for OS Quiz" 
              className={`w-full bg-gray-50 dark:bg-[#121212] border rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none transition-all ${errors.name ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 dark:border-[#2C2C2C] focus:ring-2 focus:ring-brand-blue'}`} 
            />
            {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['New task', 'Scheduled', 'In Progress', 'Completed'].map(s => (
                <button key={s} onClick={() => setStatus(s)} className={`flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold rounded-lg border transition-all ${status === s ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' : 'border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:border-gray-400'}`}>
                  {getStatusIcon(s)} {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            <div className="relative" ref={courseDropdownRef}>
              <label className={`block text-xs font-bold uppercase mb-2 flex items-center gap-2 ${errors.course ? 'text-red-500' : 'text-gray-400'}`}>
                <Book size={14} /> Course
              </label>
              
              <button 
                type="button" 
                onClick={() => setShowCourseList(!showCourseList)} 
                className={`w-full flex items-center justify-between bg-gray-50 dark:bg-[#121212] border rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none transition-all ${errors.course ? 'border-red-500 focus:ring-red-200 text-gray-700' : 'border-gray-200 dark:border-[#2C2C2C] focus:ring-brand-blue text-gray-700 dark:text-gray-200'}`}
              >
                <span className="flex items-center gap-2 truncate">
                   {getSelectedCourseIcon(course)}
                   <span className="truncate">{course || <span className="text-gray-400">Select Course</span>}</span>
                </span>
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${showCourseList ? 'rotate-180' : ''}`} />
              </button>
              {errors.course && <p className="text-red-500 text-xs mt-1 font-medium">{errors.course}</p>}
              
              {showCourseList && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-[100] animate-fadeIn custom-scrollbar max-h-[250px] overflow-y-auto">
                  
                  <div 
                    onClick={() => { setCourse('Event'); setShowCourseList(false); if(errors.course) setErrors({...errors, course: null}); }} 
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-start justify-between gap-2 border-b border-gray-100 dark:border-[#2C2C2C] transition-colors"
                  >
                     <span className="flex items-start gap-2 text-rose-600 dark:text-rose-500 font-medium pr-2">
                       <CalendarDays size={16} className="shrink-0 mt-[2px]" /> 
                       <span className="leading-snug whitespace-normal break-words text-left">Event</span>
                     </span>
                     {course === 'Event' && <CheckCircle2 size={16} className="text-rose-500 shrink-0 mt-[2px]" />}
                  </div>

                  {uniCourses.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#252525] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#2C2C2C]">
                         University Courses
                      </div>
                      {uniCourses.map((c) => (
                        <div key={c.id || c._id} onClick={() => { setCourse(c.name); setShowCourseList(false); if(errors.course) setErrors({...errors, course: null}); }} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-start justify-between gap-2 border-b border-gray-50 dark:border-[#2C2C2C] transition-colors">
                          <span className="flex items-start gap-2 text-gray-700 dark:text-gray-200 pr-2">
                             <UCPLogo className="w-4 h-4 text-blue-500 shrink-0 mt-[2px]" /> 
                             <span className="leading-snug whitespace-normal break-words text-left">{c.name}</span>
                          </span>
                          {course === c.name && <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-[2px]" />}
                        </div>
                      ))}
                    </>
                  )}

                  <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#252525] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#2C2C2C]">
                      General / Manual
                  </div>
                  {generalCourses.length > 0 ? generalCourses.map((c) => (
                    <div key={c.id || c._id} onClick={() => { setCourse(c.name); setShowCourseList(false); if(errors.course) setErrors({...errors, course: null}); }} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-start justify-between gap-2 border-b border-gray-50 dark:border-[#2C2C2C] transition-colors">
                      <span className="flex items-start gap-2 text-gray-700 dark:text-gray-200 pr-2">
                        <Book size={16} className="text-gray-400 shrink-0 mt-[2px]"/> 
                        <span className="leading-snug whitespace-normal break-words text-left">{c.name}</span>
                      </span>
                      {course === c.name && <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-[2px]" />}
                    </div>
                  )) : <div className="p-3 text-xs text-gray-500 italic text-center">No general courses found.</div>}

                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><Calendar size={14} /> Due Date</label>
                {!includeTime ? (
                  <button type="button" onClick={() => setIncludeTime(true)} className="text-[10px] text-brand-blue font-bold hover:underline flex items-center gap-1">+ Add Time</button>
                ) : (
                  <button type="button" onClick={() => { setIncludeTime(false); setTime(''); }} className="text-[10px] text-red-500 font-bold hover:underline">Remove</button>
                )}
              </div>
              <div className="flex gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none dark:[color-scheme:dark] ${includeTime ? 'w-[60%]' : 'w-full'}`} />
                {includeTime && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-[40%] bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-2 py-3 text-sm text-gray-900 dark:text-white outline-none dark:[color-scheme:dark]" />}
              </div>
            </div>
          </div>

          {/* UPDATED TIMETABLE CLASS SUGGESTION UI WITH FEEDBACK */}
          {classesToday.length > 0 && (
            <div className="animate-fadeIn mt-1 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl">
              <label className="text-[11px] font-bold text-brand-blue uppercase flex items-center gap-1.5 mb-2">
                ✨ Link a class for this date?
              </label>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {classesToday.map((cls, idx) => {
                  const isSelected = includeTime && time === parseTimeTo24Hour(cls.startTime);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setIncludeTime(true);
                        setTime(parseTimeTo24Hour(cls.startTime));
                      }}
                      className={`relative flex-shrink-0 border rounded-lg p-2.5 text-left transition-all duration-300 min-w-[160px] max-w-[200px] ${
                        isSelected 
                          ? 'bg-blue-100 dark:bg-blue-900/40 border-brand-blue ring-1 ring-brand-blue shadow-sm' 
                          : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333] hover:border-brand-blue/50 dark:hover:border-brand-blue/50'
                      }`}
                    >
                      <div className="text-sm font-bold text-gray-900 dark:text-white mb-0.5 truncate flex items-center gap-1.5">
                        {isSelected ? (
                          <CheckCircle2 size={14} className="text-brand-blue shrink-0" />
                        ) : (
                          <Link size={12} className="text-gray-400 shrink-0" />
                        )}
                        <span className="truncate">{cls.courseName || cls.name}</span>
                      </div>
                      <div className={`text-[11px] font-medium truncate transition-colors ${isSelected ? 'text-brand-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {cls.startTime || "TBA"} - {cls.room || "TBA"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Priority</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                <button key={p} onClick={() => setPriority(p)} className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold rounded-lg border transition-all ${priority === p ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-500/20' : 'border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'}`}>
                  {getPriorityIcon(p)} {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2"><AlignLeft size={14} /> Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add project details..." rows="2" className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none resize-none" />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-[#2C2C2C]">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><ListTodo size={14} /> Sub-Tasks</label>
            <div className="space-y-2 mb-4">
              {subTasks.map((st, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                  <span className="text-sm dark:text-gray-300">{st.text}</span>
                  <button onClick={() => setSubTasks(subTasks.filter((_, i) => i !== index))} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 group/input">
              <input type="text" value={subTaskInput} onChange={(e) => setSubTaskInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()} placeholder="Add a step..." className="flex-1 bg-transparent border-b border-gray-200 dark:border-[#2C2C2C] focus:border-brand-blue px-1 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-0" />
              <button onClick={handleAddSubTask} className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue hover:bg-brand-blue hover:text-white transition-all"><Plus size={20} /></button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-[#2C2C2C] flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all">Create Task</button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;