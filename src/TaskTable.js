import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Calendar as CalendarIcon, Mail, Clock,
  ChevronDown, ChevronRight, ChevronLeft, ChevronsUp, ChevronUp,
  Minus, ArrowDown, Book, Trash2, CheckSquare, Square,
  X, AlignLeft, Info, Flag, Plus as PlusIcon, Edit2, Save, AlertTriangle,
  CalendarDays, Archive
} from 'lucide-react';
import UCPLogo from './UCPLogo';

// --- HELPER: CONVERT LONG NAMES TO ABBREVIATIONS ---
const getAbbreviation = (name) => {
  if (!name || name === 'Select') return name;
  const n = name.toLowerCase().trim();

  if (n === 'event') return 'Event';

  if (n.includes('artificial intelligence') && (n.includes('lab') || n.includes('laboratory'))) return 'AI Lab';
  if ((n.includes('computer communication') || n.includes('computer network')) && (n.includes('lab') || n.includes('laboratory'))) return 'CCN Lab';
  if (n.includes('operating system') && (n.includes('lab') || n.includes('laboratory'))) return 'OS Lab';
  if (n.includes('database') && (n.includes('lab') || n.includes('laboratory'))) return 'DB Lab';
  if (n.includes('object oriented') && (n.includes('lab') || n.includes('laboratory'))) return 'OOP Lab';
  if (n.includes('data structure') && (n.includes('lab') || n.includes('laboratory'))) return 'DSA Lab';

  if (n.includes('artificial intelligence')) return 'AI';
  if (n.includes('computer communication') || n.includes('computer network')) return 'CCN';
  if (n.includes('operating system')) return 'OS';
  if (n.includes('automata')) return 'TAFL';
  if (n.includes('probability') && n.includes('statistics')) return 'P&S';
  if (n.includes('volunteers in service')) return 'VIS';
  if (n.includes('differential equation')) return 'DE';
  if (n.includes('software engineering')) return 'SE';
  if (n.includes('design and analysis')) return 'DAA';
  if (n.includes('game development')) return 'GameDev';
  if (n.includes('linear algebra')) return 'LA';
  if (n.includes('communication skills')) return 'Comm';
  if (n.includes('islamic studies')) return 'Islamiat';
  if (n.includes('pakistan studies')) return 'Pak Std';
  if (n.includes('programming fundamental')) return 'PF';
  if (n.includes('object oriented')) return 'OOP';
  if (n.includes('data structure')) return 'DSA';
  if (n.includes('database')) return 'DB';

  if (n.includes('general course') || n.includes('general task')) return 'General';

  if (name.length > 15) {
    const ignoredWords = ['and', 'of', 'to', 'in', 'introduction', 'lab', 'for', 'the', '&', '-'];
    return name.split(' ')
      .filter(word => !ignoredWords.includes(word.toLowerCase()))
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 5);
  }

  return name;
};

const COL = {
  name: "flex-1 pl-4", status: "w-[160px]", course: "w-[150px]", date: "w-[140px]", priority: "w-[100px]",
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const formatModalTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const getPriorityConfig = (p) => {
  switch (p) {
    case 'Critical': return { icon: ChevronsUp, color: 'text-red-600 dark:text-red-500', label: p };
    case 'High': return { icon: ChevronUp, color: 'text-orange-600 dark:text-orange-500', label: p };
    case 'Medium': return { icon: Minus, color: 'text-yellow-600 dark:text-yellow-500', label: p };
    case 'Low': return { icon: ArrowDown, color: 'text-blue-600 dark:text-blue-500', label: p };
    default: return { icon: Minus, color: 'text-gray-500', label: p };
  }
};

const getStatusConfig = (s) => {
  switch (s) {
    case 'Scheduled': return { icon: CalendarIcon, color: 'text-gray-500 dark:text-gray-400', label: s };
    case 'In Progress': return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-500', label: s };
    case 'New task': return { icon: Mail, color: 'text-blue-600 dark:text-blue-400', label: 'New task' };
    case 'New Assigned': return { icon: Mail, color: 'text-blue-600 dark:text-blue-400', label: 'New task' };
    case 'Completed': return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-500', label: s };
    default: return { icon: CheckCircle2, color: 'text-gray-400', label: s };
  }
};

const CourseIcon = ({ type, name }) => {
  if (name === 'Event') return <CalendarDays size={18} className="text-rose-500" />;
  if (type === 'uni') return <UCPLogo className="w-5 h-5 text-blue-600 dark:text-blue-400 opacity-90" />;
  return <Book size={18} className="text-gray-400" />;
};

// --- REUSABLE DROPDOWN FOR MODAL EDITING ---
const ModalDropdown = ({ value, options, onChange, getConfig, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = getConfig ? getConfig(value) : null;
  const CurrentIcon = currentConfig?.icon;

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs text-left transition-all focus:border-brand-blue outline-none"
      >
        <span className={`flex items-center gap-2 truncate font-medium ${currentConfig?.color || 'text-gray-700 dark:text-gray-200'}`}>
          {CurrentIcon && <CurrentIcon size={14} />} 
          {value || placeholder}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
          {options.map(opt => {
            const config = getConfig ? getConfig(opt) : null;
            const Icon = config?.icon;
            return (
              <div 
                key={opt} 
                onClick={() => { onChange(opt); setIsOpen(false); }} 
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs ${config?.color || 'text-gray-700 dark:text-gray-200'}`}
              >
                {Icon && <Icon size={14} />} 
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- FULLY UPGRADED TASK SUMMARY MODAL ---
const TaskSummaryModal = ({ isOpen, onClose, task, courses, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);
  
  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '', priority: '', status: '', course: ''
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name || '',
        description: task.description || '',
        date: task.date || '',
        time: task.time || '',
        priority: task.priority || 'Medium',
        status: task.status || 'New task',
        course: task.course || ''
      });
      setIncludeTime(!!task.time);
      setIsEditing(false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    if (form.name.trim() !== task.name) onUpdate(task.id, 'name', form.name);
    if (form.description.trim() !== task.description) onUpdate(task.id, 'description', form.description);
    if (form.date !== task.date) onUpdate(task.id, 'date', form.date);
    
    const timeToSave = includeTime ? form.time : null;
    if (timeToSave !== task.time) onUpdate(task.id, 'time', timeToSave);

    if (form.priority !== task.priority) onUpdate(task.id, 'priority', form.priority);
    if (form.status !== task.status) onUpdate(task.id, 'status', form.status);
    if (form.course !== task.course) onUpdate(task.id, 'course', form.course);
    
    setIsEditing(false);
  };

  const showTimeCell = isEditing ? includeTime : !!task.time;
  const pConfig = getPriorityConfig(task.priority);
  const PriorityIcon = pConfig.icon;
  const currentCourse = courses.find(c => c.name === task.course);
  const courseType = currentCourse ? currentCourse.type : (task.course === 'Event' ? 'event' : 'general');
  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;
  const courseOptions = ['Event', ...courses.map(c => c.name)];

  // Helper to get Course Icons inside the generic ModalDropdown
  const getCourseConfig = (courseName) => {
    if (courseName === 'Event') return { icon: CalendarDays, color: 'text-rose-500' };
    const courseObj = courses.find(c => c.name === courseName);
    if (courseObj?.type === 'uni') {
      return { 
        icon: () => <UCPLogo className="w-3.5 h-3.5 fill-current" />, 
        color: 'text-blue-600 dark:text-blue-400' 
      };
    }
    return { icon: Book, color: 'text-gray-500 dark:text-gray-400' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden flex flex-col max-h-[90vh]">
        
        <style>{`
          .custom-scrollbar-modal::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar-modal::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar-modal::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar-modal::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
          .dark .custom-scrollbar-modal::-webkit-scrollbar-thumb { background: #3f3f46; }
          .dark .custom-scrollbar-modal::-webkit-scrollbar-thumb:hover { background: #52525b; }
        `}</style>

        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl"><Info className="text-brand-blue" size={20} /></div>
            <h2 className="text-xl font-bold dark:text-white text-gray-800">Task Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={isEditing ? handleSave : () => setIsEditing(true)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isEditing ? 'bg-brand-blue text-white hover:bg-blue-600' : 'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:text-brand-blue'}`}>
              {isEditing ? <><Save size={14} /> Save</> : <><Edit2 size={14} /> Edit</>}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors text-gray-400"><X size={20} /></button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar-modal">
          <div className="mb-8">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Task Title</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full text-2xl font-extrabold bg-transparent border-b border-gray-300 dark:border-[#333] focus:border-brand-blue text-gray-900 dark:text-white outline-none py-1" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={4} className="w-full text-sm leading-relaxed bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl p-3 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-blue outline-none resize-none custom-scrollbar-modal" />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{task.name}</h1>
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <AlignLeft size={18} className="mt-1 flex-shrink-0 opacity-50" />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description || "No additional notes."}</p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <CalendarIcon size={16} className="text-gray-400 shrink-0" /> 
                <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Created</span>
                <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <CalendarIcon className="text-brand-pink shrink-0" size={16} /> 
                <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Due Date</span>
                {isEditing ? (
                  <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" />
                ) : (
                  <span className="dark:text-gray-200 font-medium">{task.date || "No date set"}</span>
                )}
              </div>

              {(showTimeCell || isEditing) && (
                <div className="flex items-center gap-3 text-sm min-h-[32px]">
                  <Clock className="text-purple-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Time</span>
                  {isEditing ? (
                    includeTime ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" />
                        <button onClick={() => { setIncludeTime(false); setForm({...form, time: ''}); }} className="text-[10px] text-red-500 hover:underline font-bold">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setIncludeTime(true)} className="text-xs text-brand-blue font-bold hover:underline py-1 px-2 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add Time</button>
                    )
                  ) : (
                    <span className="dark:text-gray-200 font-medium bg-gray-100 dark:bg-[#333] px-2 py-0.5 rounded">{task.time ? formatModalTime(task.time) : "All Day"}</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <Flag size={16} className="text-orange-500 shrink-0" /> 
                <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Priority</span>
                {isEditing ? (
                  <ModalDropdown value={form.priority} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => setForm({...form, priority: val})} getConfig={getPriorityConfig} />
                ) : (
                  <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${pConfig.color}`}><PriorityIcon size={14} /> {task.priority}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <Book size={16} className="text-brand-blue shrink-0" /> 
                <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Course</span>
                {isEditing ? (
                  <ModalDropdown value={form.course} options={courseOptions} onChange={(val) => setForm({...form, course: val})} getConfig={getCourseConfig} placeholder="Select Course" />
                ) : (
                  <span className="dark:text-gray-200 font-medium flex items-center gap-1.5 truncate" title={task.course}><CourseIcon type={courseType} name={task.course} /> {task.course}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                 <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                 <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Status</span>
                 {isEditing ? (
                   <ModalDropdown value={form.status} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => setForm({...form, status: val})} getConfig={getStatusConfig} />
                 ) : (
                   <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${statusConfig.color}`}><StatusIcon size={14} /> {task.status}</span>
                 )}
               </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#181818] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sub Tasks</h3>
            <div className="space-y-3">
              {task.subTasks?.map((sub, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className={sub.completed ? 'line-through text-gray-500' : 'dark:text-gray-300'}>{sub.text}</span>
                </div>
              ))}
              {(!task.subTasks || task.subTasks.length === 0) && <p className="text-xs text-gray-500 italic">No sub-tasks added.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskTable = ({ tasks, updateTask, courses, deleteTask }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showActive, setShowActive] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [newSubTask, setNewSubTask] = useState({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (e, taskId) => {
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleAddSubTask = (taskId, text) => {
    if (!text.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    const subTasks = [...(task.subTasks || []), { text, completed: false }];
    updateTask(taskId, 'subTasks', subTasks);
    setNewSubTask(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleDeleteSubTask = (taskId, index) => {
    const task = tasks.find(t => t.id === taskId);
    const updatedSubTasks = [...task.subTasks];
    updatedSubTasks.splice(index, 1);
    updateTask(taskId, 'subTasks', updatedSubTasks);
  };

  const toggleSubTask = (e, taskId, index) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    const subTasks = [...task.subTasks];
    subTasks[index].completed = !subTasks[index].completed;
    updateTask(taskId, 'subTasks', subTasks);
  };

  const sortTasks = (taskList) => {
    return [...taskList].sort((a, b) => {
      const dateA = a.date || '9999-99-99';
      const dateB = b.date || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
  };

  const isTaskCurrent = (t) => {
    return courses.some(c => c.name === t.course) || t.course === 'Event';
  };

  const currentTasks = tasks.filter(isTaskCurrent);
  const archivedTasks = tasks.filter(t => !isTaskCurrent(t));

  const activeTasks = sortTasks(currentTasks.filter(t => t.status !== 'Completed'));
  const completedTasks = sortTasks(currentTasks.filter(t => t.status === 'Completed'));

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type !== 'uni');

  const renderRow = (task, isCompleted = false) => {
    const statusConfig = getStatusConfig(task.status);
    const priorityConfig = getPriorityConfig(task.priority);
    const currentCourse = courses.find(c => c && c.name === task.course);
    const courseType = currentCourse ? currentCourse.type : (task.course === 'Event' ? 'event' : 'general');
    const isExpanded = expandedTasks[task.id];
    const completedCount = task.subTasks?.filter(s => s.completed).length || 0;
    const totalCount = task.subTasks?.length || 0;

    return (
      <div key={task.id} className="border-b border-gray-200 dark:border-[#2C2C2C]">
        <div onClick={() => setSelectedTask(task)} className={`group flex items-center py-3 px-0 transition-all cursor-pointer ${isCompleted ? 'bg-gray-50 dark:bg-[#121212]' : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#202020]'}`}>
          <div className={`${COL.name} flex items-center gap-2 text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
            <button onClick={(e) => toggleExpand(e, task.id)} className="text-gray-400 hover:text-brand-blue">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="truncate">{task.name}</span>
            {totalCount > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 rounded-md font-bold ml-1">{completedCount}/{totalCount}</span>}
          </div>

          <div className={COL.status} onClick={(e) => e.stopPropagation()}>
            <Dropdown id={`${task.id}-status`} value={isCompleted ? "Completed" : statusConfig.label} icon={statusConfig.icon} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => updateTask(task.id, 'status', val)} colorClass={isCompleted ? 'text-green-600 dark:text-green-500' : statusConfig.color} getOptionConfig={getStatusConfig} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} />
          </div>

          <div className={COL.course} onClick={(e) => e.stopPropagation()}>
            <div className="relative custom-dropdown w-full">
              {task.course === 'Course Deleted' ? (
                <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === `${task.id}-course` ? null : `${task.id}-course`); }} className="flex items-center gap-2 text-sm text-red-500 hover:opacity-80 text-left w-full font-medium py-1 truncate">
                  <AlertTriangle size={16} /> Deleted
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === `${task.id}-course` ? null : `${task.id}-course`); }} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:opacity-80 text-left w-full font-medium py-1 truncate" title={task.course}>
                  <CourseIcon type={courseType} name={task.course} /> {getAbbreviation(task.course) || "Select"}
                </button>
              )}

              {openDropdownId === `${task.id}-course` && (
                <div className="absolute top-full left-0 mt-1 w-[200px] bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-[100] animate-fadeIn py-1">
                  <div onClick={() => { updateTask(task.id, 'course', 'Event'); setOpenDropdownId(null); }} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-center gap-3 text-rose-600 dark:text-rose-500 font-medium">
                    <CalendarDays size={16} /> <span>Event</span>
                  </div>

                  <div className="group/uni relative">
                    <div className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-default text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 font-medium border-t border-gray-100 dark:border-[#2C2C2C]">
                      <div className="flex items-center gap-3"><UCPLogo className="w-4 h-4 text-blue-600 shrink-0" /> <span>University Courses</span></div>
                      <ChevronLeft size={14} className="text-gray-400" />
                    </div>
                    <div className="hidden group-hover/uni:block absolute right-full top-0 w-[240px] pr-1 z-[110]">
                      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] max-h-[250px] overflow-y-auto custom-scrollbar py-1">
                        {uniCourses.length > 0 ? uniCourses.map((c) => (
                          <div key={c.id || c._id || c.name} onClick={() => { updateTask(task.id, 'course', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
                            <UCPLogo className="w-5 h-5 text-blue-600 shrink-0" /> 
                            <div className="flex flex-col overflow-hidden w-full">
                              <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                              <span className="text-[10px] text-gray-400 truncate">{c.name}</span>
                            </div>
                          </div>
                        )) : <div className="px-4 py-3 text-xs text-gray-500 italic">No synced courses</div>}
                      </div>
                    </div>
                  </div>

                  <div className="group/gen relative">
                    <div className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-default text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 font-medium">
                      <div className="flex items-center gap-3"><Book size={16} className="text-gray-400 shrink-0" /> <span>General Courses</span></div>
                      <ChevronLeft size={14} className="text-gray-400" />
                    </div>
                    <div className="hidden group-hover/gen:block absolute right-full top-0 w-[240px] pr-1 z-[110]">
                      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] max-h-[250px] overflow-y-auto custom-scrollbar py-1">
                        {generalCourses.length > 0 ? generalCourses.map((c) => (
                          <div key={c.id || c._id || c.name} onClick={() => { updateTask(task.id, 'course', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
                            <Book size={16} className="text-gray-400 shrink-0" /> 
                            <div className="flex flex-col overflow-hidden w-full">
                              <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                              <span className="text-[10px] text-gray-400 truncate">{c.name}</span>
                            </div>
                          </div>
                        )) : <div className="px-4 py-3 text-xs text-gray-500 italic">No general courses</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={COL.date} onClick={(e) => e.stopPropagation()}>
            <DateCell date={task.date} time={task.time} onChange={(val) => updateTask(task.id, 'date', val)} />
          </div>

          <div className={`${COL.priority} flex items-center justify-between pr-4`} onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <Dropdown id={`${task.id}-priority`} value={task.priority} icon={priorityConfig.icon} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => updateTask(task.id, 'priority', val)} colorClass={`font-medium ${priorityConfig.color}`} getOptionConfig={getPriorityConfig} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} />
            </div>
            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        </div>

        {isExpanded && (
          <div className="pl-12 pr-8 py-3 space-y-2.5 bg-gray-50/50 dark:bg-white/5 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {task.subTasks?.map((sub, index) => (
              <div key={index} className="flex items-center gap-3 group/sub">
                <button onClick={(e) => toggleSubTask(e, task.id, index)} className={sub.completed ? 'text-green-500' : 'text-gray-400'}>
                  {sub.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <span className={`text-xs ${sub.completed ? 'line-through text-gray-500 italic' : 'text-gray-700 dark:text-gray-300'}`}>{sub.text}</span>
                <button onClick={() => handleDeleteSubTask(task.id, index)} className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-all p-1 rounded-md" title="Remove subtask">
                  <X size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1 group/input">
              <PlusIcon size={14} className="text-brand-blue" />
              <input type="text" value={newSubTask[task.id] || ''} onChange={(e) => setNewSubTask(prev => ({ ...prev, [task.id]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(task.id, e.target.value)} placeholder="Add a sub-task..." className="bg-transparent border-none text-xs text-brand-blue outline-none focus:ring-0 placeholder-gray-500 italic w-full" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 w-full animate-fadeIn pb-10">
      <div className="mb-6">
        <button onClick={() => setShowActive(!showActive)} className="flex items-center gap-2 mb-3 group focus:outline-none">
          {showActive ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
          <h2 className="text-gray-800 dark:text-white font-bold text-sm">Active tasks</h2>
          <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{activeTasks.length}</span>
        </button>

        {showActive && (
          <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
            <div className="min-w-[750px]">
              <div className="flex text-xs text-gray-500 dark:text-[#71717A] border-b border-gray-200 dark:border-[#2C2C2C] pb-2 px-0">
                <div className={COL.name}>Task Name</div>
                <div className={COL.status}>Status</div>
                <div className={COL.course}>Course</div>
                <div className={COL.date}>Due date</div>
                <div className={COL.priority}>Priority</div>
              </div>
              {activeTasks.length > 0 ? activeTasks.map(task => renderRow(task, false)) : <p className="py-6 text-center text-gray-500 text-sm italic">No active tasks.</p>}
            </div>
          </div>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="animate-fadeIn mb-6">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 mb-3 group focus:outline-none">
            {showCompleted ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
            <h2 className="text-gray-800 dark:text-white font-bold text-sm">Completed tasks</h2>
            <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{completedTasks.length}</span>
          </button>
          {showCompleted && (
            <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
              <div className="min-w-[750px]">
                {completedTasks.map(task => renderRow(task, true))}
              </div>
            </div>
          )}
        </div>
      )}

      {archivedTasks.length > 0 && (
        <div className="animate-fadeIn pt-4 border-t border-dashed border-gray-200 dark:border-[#2C2C2C]">
          <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 w-full group focus:outline-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <Archive size={18} />
            <h2 className="font-bold text-sm">Past Semester / Archived</h2>
            <span className="bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 text-xs px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
            <span className="ml-auto text-xs">{showArchived ? "Hide" : "Show"}</span>
          </button>

          {showArchived && (
            <div className="mt-3 opacity-75">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-500 text-xs rounded-lg mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> These tasks belong to deleted courses or past semesters.
              </div>
              <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
                <div className="min-w-[750px]">
                  {archivedTasks.map(task => renderRow(task, task.status === 'Completed'))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <TaskSummaryModal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} courses={courses} onUpdate={updateTask} />
    </div>
  );
};

const Dropdown = ({ id, value, options, onChange, colorClass, icon: Icon, getOptionConfig, openDropdownId, setOpenDropdownId }) => {
  const isOpen = openDropdownId === id;
  const handleSelect = (opt) => { onChange(opt); setOpenDropdownId(null); };
  return (
    <div className="relative custom-dropdown w-full">
      <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(isOpen ? null : id); }} className={`flex items-center gap-2 text-sm ${colorClass} hover:opacity-80 text-left w-full font-medium py-1 truncate`}>
        {Icon && <Icon size={16} />} {value}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-50 overflow-hidden">
          {options.map((opt) => {
            const config = getOptionConfig ? getOptionConfig(opt) : {};
            return (
              <div key={opt} onClick={() => handleSelect(opt)} className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-center gap-2 ${config.color || "text-gray-700 dark:text-gray-200"}`}>
                {config.icon && <config.icon size={16} />} <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DateCell = ({ date, time, onChange }) => {
  const inputRef = useRef(null);
  const displayDate = formatDate(date);
  return (
    <div className="relative cursor-pointer hover:opacity-80 group h-full flex flex-col justify-center" onClick={(e) => { e.stopPropagation(); inputRef.current.showPicker(); }}>
      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        {displayDate}{time && <span className="text-xs text-gray-400 ml-1 font-normal">{time}</span>}
      </span>
      <input ref={inputRef} type="date" value={date} onChange={(e) => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 dark:[color-scheme:dark]" />
    </div>
  );
};

export default TaskTable;