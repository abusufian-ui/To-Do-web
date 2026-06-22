import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Calendar as CalendarIcon, Clock, Mail, AlertTriangle,
  ChevronDown, ChevronRight, ChevronLeft, ChevronsUp, ChevronUp,
  Minus, ArrowDown, Book, Trash2, CheckSquare, Square,
  X, AlignLeft, Info, Flag, Plus as PlusIcon, Edit2, Save,
  CalendarDays, Lock, Globe, Shield
} from 'lucide-react';
import UCPLogo from './UCPLogo';


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
  name: "flex-1 pl-4", status: "w-[160px]", course: "w-[150px]", date: "w-[140px]", priority: "w-[140px]",
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
    case 'New task':
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

const EditDropdown = ({ value, options, onChange, getConfig, placeholder, disabled }) => {
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

  const currentConfig = getConfig ? getConfig(value) : { color: 'text-gray-700 dark:text-gray-200' };
  const CurrentIcon = currentConfig?.icon;

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-left transition-all outline-none ${disabled ? 'cursor-default opacity-90' : 'focus:border-brand-blue'}`}
      >
        <span className={`flex items-center gap-2 truncate font-medium ${currentConfig?.color}`}>
          {CurrentIcon && <CurrentIcon size={14} />}
          {value || placeholder}
        </span>
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
          {options.map(opt => {
            const config = getConfig ? getConfig(opt) : { color: 'text-gray-700 dark:text-gray-200' };
            const Icon = config?.icon;
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs ${config?.color}`}
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

const ModalCourseDropdown = ({ value, courses, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniCourses = courses?.filter(c => c.type === 'uni') || [];
  const genCourses = courses?.filter(c => c.type !== 'uni') || [];

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-left transition-all outline-none ${disabled ? 'cursor-default opacity-90' : 'focus:border-brand-blue'}`}
      >
        <span className="flex items-center gap-2 truncate font-medium text-gray-700 dark:text-gray-200">
          {value === 'Event' ? <CalendarDays size={14} className="text-rose-500" /> : (value ? <Book size={14} className="text-brand-blue" /> : <Book size={14} className="text-gray-400" />)}
          {value || "Select Course"}
        </span>
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[150] overflow-hidden max-h-56 overflow-y-auto custom-scrollbar flex flex-col">
          <div onClick={() => { onChange('Event'); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-rose-600 dark:text-rose-500 font-medium shrink-0">
            <CalendarDays size={14} /> Event
          </div>

          {uniCourses.length > 0 && (
            <div className="shrink-0">
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-y border-gray-200 dark:border-[#333] sticky top-0 z-10">University</div>
              {uniCourses.map(c => (
                <div key={c.id || c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <UCPLogo className="w-3.5 h-3.5 text-blue-600 fill-current" /> <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}

          {genCourses.length > 0 && (
            <div className="shrink-0">
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-y border-gray-200 dark:border-[#333] sticky top-0 z-10">General</div>
              {genCourses.map(c => (
                <div key={c.id || c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <Book size={14} className="text-gray-400" /> <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TaskSummaryModal = ({ isOpen, onClose, task, courses, onUpdate, user, activeGroup }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);
  const [newSubText, setNewSubText] = useState('');

  const currentStatus = task?.status || 'New task';
  const taskId = task?.id || task?._id;

  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '', priority: '', status: '', course: '', isPrivate: false, subTasks: []
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name || '', description: task.description || '', date: task.date || '',
        time: task.time || '', priority: task.priority || 'Medium', status: currentStatus,
        course: task.course || '', isPrivate: task.isPrivate || false,
        subTasks: task.subTasks ? [...task.subTasks] : []
      });
      setIncludeTime(!!task.time);
      setIsEditing(false);
      setNewSubText('');
    }
  }, [task, isOpen, currentStatus]);

  if (!isOpen || !task) return null;

  const handleToggleFormSubTask = (idx) => {
    setForm(prev => {
      const nextSub = [...prev.subTasks];
      nextSub[idx] = { ...nextSub[idx], completed: !nextSub[idx].completed };
      return { ...prev, subTasks: nextSub };
    });
  };

  const handleRemoveFormSubTask = (idx) => {
    setForm(prev => ({
      ...prev,
      subTasks: prev.subTasks.filter((_, i) => i !== idx)
    }));
  };

  const handleAddFormSubTask = () => {
    if (!newSubText.trim()) return;
    setForm(prev => ({
      ...prev,
      subTasks: [...prev.subTasks, { text: newSubText.trim(), completed: false }]
    }));
    setNewSubText('');
  };

  const handleSave = () => {
    if (form.name.trim() !== task.name) onUpdate(taskId, 'name', form.name);
    if (form.description.trim() !== task.description) onUpdate(taskId, 'description', form.description);
    if (form.date !== task.date) onUpdate(taskId, 'date', form.date);

    const timeToSave = includeTime ? form.time : null;
    if (timeToSave !== task.time) onUpdate(taskId, 'time', timeToSave);

    if (form.priority !== task.priority) onUpdate(taskId, 'priority', form.priority);
    if (form.status !== currentStatus) onUpdate(taskId, 'status', form.status);
    if (form.course !== task.course) onUpdate(taskId, 'course', form.course);
    if (form.isPrivate !== task.isPrivate) onUpdate(taskId, 'isPrivate', form.isPrivate);

    onUpdate(taskId, 'subTasks', form.subTasks);

    setIsEditing(false);
  };

  const currentUserId = String(user?.id || user?._id || '');
  const taskCreatorId = String(task?.userId?._id || task?.userId?.id || task?.userId || '');
  
  
  const isOwner = currentUserId && taskCreatorId && (currentUserId === taskCreatorId);
  const canEditFully = !task.groupId ? true : isOwner;

  const showTimeCell = isEditing ? includeTime : !!task.time;
  const pConfig = getPriorityConfig(task.priority);
  const PriorityIcon = pConfig.icon;
  const currentCourse = courses.find(c => c.name === task.course);
  const courseType = currentCourse ? currentCourse.type : (task.course === 'Event' ? 'event' : 'general');
  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl md:max-w-2xl h-full shadow-2xl overflow-hidden border-l border-gray-200 dark:border-[#2C2C2C] animate-slideInRight flex flex-col">

        <style>{`
          .custom-scrollbar-modal::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar-modal::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar-modal::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar-modal::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
          .dark .custom-scrollbar-modal::-webkit-scrollbar-thumb { background: #3f3f46; }
          .dark .custom-scrollbar-modal::-webkit-scrollbar-thumb:hover { background: #52525b; }
        `}</style>

        {}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Info className="text-brand-blue" size={20} />
            </div>
            <h2 className="text-xl font-bold dark:text-white text-gray-800">
              {isEditing ? 'Edit Task Info' : 'Task Workspace Summary'}
            </h2>
          </div>
          <div className="flex gap-2">
            {canEditFully && (
              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${isEditing ? 'bg-brand-blue text-white hover:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-gray-500 dark:text-gray-400'}`}
                title={isEditing ? "Save Changes" : "Edit Task"}
              >
                {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {}
        <div className="p-8 overflow-y-auto custom-scrollbar-modal">

          {}
          <div className="mb-8">
            {isEditing && canEditFully ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Task Title</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-2xl font-extrabold bg-transparent border-b border-gray-300 dark:border-[#333] focus:border-brand-blue text-gray-900 dark:text-white outline-none py-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    className="w-full text-sm leading-relaxed bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl p-3 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-blue outline-none resize-none custom-scrollbar-modal"
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{task.name}</h1>
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#151515] p-4 rounded-xl">
                  <AlignLeft size={18} className="mt-1 flex-shrink-0 opacity-50" />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description || "No additional notes configured."}</p>
                </div>
              </>
            )}
          </div>

          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">

            {}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <CalendarIcon size={16} className="text-gray-400 shrink-0" />
                <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Created</span>
                <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <CalendarIcon className="text-brand-pink shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Due Date</span>
                {isEditing && canEditFully ? (
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" />
                ) : (
                  <span className="dark:text-gray-200 font-medium">{task.date || "No date set"}</span>
                )}
              </div>

              {(showTimeCell || isEditing) && (
                <div className="flex items-center gap-3 text-sm min-h-[32px]">
                  <Clock className="text-purple-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Time</span>
                  {isEditing && canEditFully ? (
                    includeTime ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" />
                        <button onClick={() => { setIncludeTime(false); setForm({ ...form, time: '' }); }} className="text-[10px] text-red-500 hover:underline font-bold">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setIncludeTime(true)} className="text-xs text-brand-blue font-bold hover:underline py-1 px-2 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add Time</button>
                    )
                  ) : (
                    <span className="dark:text-gray-200 font-medium bg-gray-100 dark:bg-[#333] px-2 py-0.5 rounded">{task.time ? formatModalTime(task.time) : "All Day"}</span>
                  )}
                </div>
              )}

              {}
              {canEditFully && (
                <div className="flex items-center gap-3 text-sm min-h-[32px]">
                  <Shield className="text-indigo-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Privacy</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}>
                      <input type="checkbox" checked={form.isPrivate || false} onChange={e => setForm({ ...form, isPrivate: e.target.checked })} className="w-4 h-4 cursor-pointer" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Make Private</span>
                    </div>
                  ) : (
                    <span className="dark:text-gray-200 font-medium">{task.groupId ? "Shared Workspace" : "Private"}</span>
                  )}
                </div>
              )}
            </div>

            {}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <Flag size={16} className="text-orange-500 shrink-0" />
                <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Priority</span>
                {isEditing && canEditFully ? (
                  <EditDropdown value={form.priority} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => setForm({ ...form, priority: val })} getConfig={getPriorityConfig} />
                ) : (
                  <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${pConfig.color}`}><PriorityIcon size={14} /> {task.priority}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <Book size={16} className="text-brand-blue shrink-0" />
                <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Course</span>
                {isEditing && canEditFully ? (
                  <ModalCourseDropdown value={form.course} courses={courses} onChange={(val) => setForm({ ...form, course: val })} />
                ) : (
                  <span className="dark:text-gray-200 font-medium flex items-center gap-1.5 truncate" title={task.course}><CourseIcon type={courseType} name={task.course} /> {task.course}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[32px]">
                <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0 font-bold text-[10px] uppercase tracking-wider">Status</span>
                {isEditing && canEditFully ? (
                  <EditDropdown value={form.status} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => setForm({ ...form, status: val })} getConfig={getStatusConfig} />
                ) : (
                  task.groupId ? (
                    <EditDropdown value={currentStatus} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => onUpdate(taskId, 'status', val)} getConfig={getStatusConfig} />
                  ) : (
                    <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${statusConfig.color}`}><StatusIcon size={14} /> {currentStatus}</span>
                  )
                )}
              </div>
            </div>
          </div>

          {}
          <div className="bg-gray-50 dark:bg-[#181818] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckSquare size={16} /> Sub Tasks Management
            </h3>
            <div className="space-y-2.5">
              {isEditing && canEditFully ? (
                <>
                  {form.subTasks?.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm bg-white dark:bg-[#222] p-2.5 rounded-xl border border-gray-100 dark:border-[#2C2C2C] shadow-sm">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleToggleFormSubTask(i)} className={sub.completed ? 'text-green-500' : 'text-gray-400'}>
                          {sub.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span className={sub.completed ? 'line-through text-gray-400 italic' : 'text-gray-700 dark:text-gray-200'}>{sub.text}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveFormSubTask(i)} className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100 dark:border-[#2A2A2A]">
                    <input
                      type="text"
                      value={newSubText}
                      onChange={(e) => setNewSubText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFormSubTask()}
                      placeholder="Add an entry item..."
                      className="flex-1 text-xs bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none dark:text-white"
                    />
                    <button type="button" onClick={handleAddFormSubTask} className="p-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <PlusIcon size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {task.subTasks?.map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-white/40 dark:bg-white/5 p-2 rounded-lg">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <span className={sub.completed ? 'line-through text-gray-400 italic' : 'text-gray-700 dark:text-gray-300'}>{sub.text}</span>
                    </div>
                  ))}
                  {(!task.subTasks || task.subTasks.length === 0) && <p className="text-xs text-gray-500 italic">No sub-tasks configured.</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TaskTable = ({ tasks, updateTask, courses, deleteTask, user, activeGroup, pendingInvitations, fetchActiveGroup, fetchPendingInvitations, fetchTasks, toast, setToast }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showActive, setShowActive] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [newSubTask, setNewSubTask] = useState({});
  const [viewMode, setViewMode] = useState('private');
  
  
  const [optimisticPrivacy, setOptimisticPrivacy] = useState({});

  useEffect(() => {
    if (viewMode === 'shared') {
      if (fetchActiveGroup) fetchActiveGroup();
      if (fetchPendingInvitations) fetchPendingInvitations();
    }
  }, [viewMode, fetchActiveGroup, fetchPendingInvitations]);

  const handleUpdateTask = (id, field, value) => {
    updateTask(id, field, value);
    
    if (field === 'isPrivate') {
      setOptimisticPrivacy(prev => ({ ...prev, [id]: value }));
    }
  };

  
  const optimizedTasks = tasks.map(t => {
    const taskId = t.id || t._id;
    if (optimisticPrivacy[taskId] !== undefined) {
      return { 
        ...t, 
        isPrivate: optimisticPrivacy[taskId], 
        groupId: optimisticPrivacy[taskId] ? null : (t.groupId || 'optimistic_group_id') 
      };
    }
    return t;
  });

  useEffect(() => {
    if (selectedTask) {
      const selectedId = selectedTask.id || selectedTask._id;
      const updated = optimizedTasks.find(t => (t.id || t._id) === selectedId);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, optimisticPrivacy]);

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
    const task = optimizedTasks.find(t => (t.id || t._id) === taskId);
    const subTasks = [...(task.subTasks || []), { text, completed: false }];
    handleUpdateTask(taskId, 'subTasks', subTasks);
    setNewSubTask(prev => ({ ...prev, [taskId]: '' }));
  };

  const handleDeleteSubTask = (taskId, index) => {
    const task = optimizedTasks.find(t => (t.id || t._id) === taskId);
    if (!task) return;
    const updatedSubTasks = [...task.subTasks];
    updatedSubTasks.splice(index, 1);
    handleUpdateTask(taskId, 'subTasks', updatedSubTasks);
  };

  const toggleSubTask = (e, taskId, index) => {
    e.stopPropagation();
    const task = optimizedTasks.find(t => (t.id || t._id) === taskId);
    if (!task) return;
    const subTasks = [...task.subTasks];
    subTasks[index].completed = !subTasks[index].completed;
    handleUpdateTask(taskId, 'subTasks', subTasks);
  };

  const getTaskStatus = (t) => t?.status || 'New task';

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

  const isTaskCurrent = (t) => courses.some(c => c.name === t.course) || t.course === 'Event';

  
  const activeSource = viewMode === 'shared'
    ? optimizedTasks.filter(t => !!t.groupId)
    : optimizedTasks.filter(t => !t.groupId);

  const currentTasks = activeSource.filter(isTaskCurrent);
  const archivedTasks = activeSource.filter(t => !isTaskCurrent(t));

  const activeTasks = sortTasks(currentTasks.filter(t => getTaskStatus(t) !== 'Completed'));
  const completedTasks = sortTasks(currentTasks.filter(t => getTaskStatus(t) === 'Completed'));

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type !== 'uni');

  const renderTableHeader = () => (
    <div className="flex items-center py-2 px-0 border-b border-gray-200 dark:border-[#2C2C2C] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 select-none">
      <div className={`${COL.name} pl-10`}>Task Title</div>
      <div className={COL.status}>Status</div>
      <div className={COL.course}>Course / Category</div>
      <div className={COL.date}>Due Date</div>
      <div className={`${COL.priority} pr-4`}>Priority</div>
    </div>
  );

  const renderRow = (task, isCompleted = false) => {
    const taskId = task.id || task._id;
    const statusVal = getTaskStatus(task);
    const statusConfig = getStatusConfig(statusVal);
    const priorityConfig = getPriorityConfig(task.priority);
    const currentCourse = courses.find(c => c && c.name === task.course);
    const courseType = currentCourse ? currentCourse.type : (task.course === 'Event' ? 'event' : 'general');
    const isExpanded = expandedTasks[taskId];
    const completedCount = task.subTasks?.filter(s => s.completed).length || 0;
    const totalCount = task.subTasks?.length || 0;

    const isSharedTask = !!task.groupId;
    const currentUserId = String(user?.id || user?._id || '');
    const taskCreatorId = String(task?.userId?._id || task?.userId?.id || task?.userId || '');
    
    
    const isCreator = currentUserId && taskCreatorId && (currentUserId === taskCreatorId);
    const canEditAll = !isSharedTask ? true : isCreator;

    return (
      <div key={taskId} className="border-b border-gray-200 dark:border-[#2C2C2C]">
        <div onClick={() => setSelectedTask(task)} className={`group flex items-center py-3 px-0 transition-all cursor-pointer ${isCompleted ? 'bg-gray-50 dark:bg-[#121212]' : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#202020]'}`}>
          <div className={`${COL.name} flex items-center gap-2 text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
            <button onClick={(e) => toggleExpand(e, taskId)} className="text-gray-400 hover:text-brand-blue shrink-0">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="truncate">{task.name}</span>
                {totalCount > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 rounded-md font-bold shrink-0">{completedCount}/{totalCount}</span>}
              </div>
              {task.groupId && task.userId && (
                <span className="text-[10px] text-blue-500 font-bold truncate">By {task.userId?.name || 'Group Member'}</span>
              )}
            </div>
          </div>

          <div className={COL.status} onClick={(e) => e.stopPropagation()}>
            <Dropdown id={`${taskId}-status`} value={isCompleted ? "Completed" : statusConfig.label} icon={statusConfig.icon} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => handleUpdateTask(taskId, 'status', val)} colorClass={isCompleted ? 'text-green-600 dark:text-green-500' : statusConfig.color} getOptionConfig={getStatusConfig} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} disabled={false} />
          </div>

          <div className={COL.course} onClick={(e) => e.stopPropagation()}>
            <div className="relative custom-dropdown w-full">
              {task.course === 'Course Deleted' ? (
                <button onClick={(e) => { e.stopPropagation(); if (canEditAll) setOpenDropdownId(openDropdownId === `${taskId}-course` ? null : `${taskId}-course`); }} className={`flex items-center gap-2 text-sm text-red-500 text-left w-full font-medium py-1 truncate ${canEditAll ? 'hover:opacity-80' : 'cursor-default pointer-events-none'}`}>
                  <AlertTriangle size={16} /> Deleted
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); if (canEditAll) setOpenDropdownId(openDropdownId === `${taskId}-course` ? null : `${taskId}-course`); }} className={`flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 text-left w-full font-medium py-1 truncate ${canEditAll ? 'hover:opacity-80' : 'cursor-default pointer-events-none'}`} title={task.course}>
                  <CourseIcon type={courseType} name={task.course} /> {getAbbreviation(task.course) || "Select"}
                </button>
              )}

              {canEditAll && openDropdownId === `${taskId}-course` && (
                <div className="absolute top-full left-0 mt-1 w-[200px] bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-[100] animate-fadeIn py-1">
                  <div onClick={() => { handleUpdateTask(taskId, 'course', 'Event'); setOpenDropdownId(null); }} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-center gap-3 text-rose-600 dark:text-rose-500 font-medium">
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
                          <div key={c.id || c._id || c.name} onClick={() => { handleUpdateTask(taskId, 'course', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
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
                          <div key={c.id || c._id || c.name} onClick={() => { handleUpdateTask(taskId, 'course', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
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
            <DateCell date={task.date} time={task.time} onChange={(val) => handleUpdateTask(taskId, 'date', val)} disabled={!canEditAll} />
          </div>

          <div className={`${COL.priority} flex items-center justify-between pr-4`} onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <Dropdown id={`${taskId}-priority`} value={task.priority} icon={priorityConfig.icon} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => handleUpdateTask(taskId, 'priority', val)} colorClass={`font-medium ${priorityConfig.color}`} getOptionConfig={getPriorityConfig} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} disabled={!canEditAll} />
            </div>
            
            {}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEditAll && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    
                    handleUpdateTask(taskId, 'isPrivate', isSharedTask); 
                  }} 
                  className={`p-1.5 transition-colors rounded-md ${isSharedTask ? 'text-gray-400 hover:text-indigo-500' : 'text-gray-400 hover:text-emerald-500'}`}
                  title={isSharedTask ? "Move to Private Workspace" : "Share with Study Group"}
                >
                  {isSharedTask ? <Lock size={15} /> : <Globe size={15} />}
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(taskId); }} 
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md" 
                title="Delete Task"
              >
                <Trash2 size={15} />
              </button>
            </div>

          </div>
        </div>

        {isExpanded && (
          <div className="pl-12 pr-8 py-3 space-y-2.5 bg-gray-50/50 dark:bg-white/5 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            {task.subTasks?.map((sub, index) => (
              <div key={index} className="flex items-center gap-3 group/sub">
                <button onClick={(e) => { if (canEditAll) toggleSubTask(e, taskId, index); }} className={`${sub.completed ? 'text-green-500' : 'text-gray-400'} ${!canEditAll ? 'cursor-default' : ''}`} disabled={!canEditAll}>
                  {sub.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <span className={`text-xs ${sub.completed ? 'line-through text-gray-500 italic' : 'text-gray-700 dark:text-gray-300'}`}>{sub.text}</span>
                {canEditAll && (
                  <button onClick={() => handleDeleteSubTask(taskId, index)} className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-all p-1 rounded-md" title="Remove subtask">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {canEditAll ? (
              <div className="flex items-center gap-3 pt-1 group/input">
                <PlusIcon size={14} className="text-brand-blue" />
                <input type="text" value={newSubTask[taskId] || ''} onChange={(e) => setNewSubTask(prev => ({ ...prev, [taskId]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(taskId, e.target.value)} placeholder="Add a sub-task..." className="bg-transparent border-none text-xs text-brand-blue outline-none focus:ring-0 placeholder-gray-500 italic w-full" />
              </div>
            ) : (
              (task.subTasks || []).length === 0 && <p className="text-[11px] text-gray-400 italic">No subtasks created for this task.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 w-full animate-fadeIn pb-10">
      <div className="flex bg-gray-100 dark:bg-[#2C2C2C] p-1 rounded-xl mb-6 w-max shrink-0 border border-gray-200 dark:border-[#333]">
        <button onClick={() => setViewMode('private')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'private' ? 'bg-white shadow-sm dark:bg-[#1E1E1E] text-brand-blue' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>My Workspace</button>
        <button onClick={() => setViewMode('shared')} className={`px-5 py-1.5 text-sm font-bold rounded-lg transition-all ${viewMode === 'shared' ? 'bg-white shadow-sm dark:bg-[#1E1E1E] text-brand-blue' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Group Shared</button>
      </div>

      <div className="w-full">
        <div className="w-full">

          {activeTasks.length > 0 && (
            <div className="mb-6">
              <button onClick={() => setShowActive(!showActive)} className="flex items-center gap-2 mb-3 group focus:outline-none">
                {showActive ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <h2 className="text-gray-800 dark:text-white font-bold text-sm">Active tasks</h2>
                <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{activeTasks.length}</span>
              </button>

              {showActive && (
                <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
                  <div className="min-w-[750px]">
                    {renderTableHeader()}
                    {activeTasks.map(task => renderRow(task, getTaskStatus(task) === 'Completed'))}
                  </div>
                </div>
              )}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mb-6">
              <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 mb-3 group focus:outline-none">
                {showCompleted ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <h2 className="text-gray-800 dark:text-white font-bold text-sm">Completed tasks</h2>
                <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{completedTasks.length}</span>
              </button>

              {showCompleted && (
                <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
                  <div className="min-w-[750px]">
                    {renderTableHeader()}
                    {completedTasks.map(task => renderRow(task, getTaskStatus(task) === 'Completed'))}
                  </div>
                </div>
              )}
            </div>
          )}

          {archivedTasks.length > 0 && (
            <div className="mb-6">
              <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 mb-3 group focus:outline-none">
                {showArchived ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <h2 className="text-gray-800 dark:text-white font-bold text-sm">Archived tasks</h2>
                <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
              </button>

              {showArchived && (
                <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
                  <div className="min-w-[750px]">
                    {renderTableHeader()}
                    {archivedTasks.map(task => renderRow(task, getTaskStatus(task) === 'Completed'))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTasks.length === 0 && completedTasks.length === 0 && archivedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-gray-200 dark:border-[#2C2C2C] rounded-2xl bg-white dark:bg-[#181818] mt-4">
              <CheckCircle2 size={42} className="text-gray-300 dark:text-gray-600 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Workspace Clean & Clear!</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">No remaining items here. Tap the action headers or add tasks to keep momentum going.</p>
            </div>
          )}
        </div>
      </div>

      {}
      <TaskSummaryModal 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
        task={selectedTask ? optimizedTasks.find(t => (t.id || t._id) === (selectedTask.id || selectedTask._id)) : null} 
        courses={courses} 
        onUpdate={handleUpdateTask} 
        user={user} 
        activeGroup={activeGroup} 
      />
    </div>
  );
};

const Dropdown = ({ id, value, options, onChange, colorClass, icon: Icon, getOptionConfig, openDropdownId, setOpenDropdownId, disabled }) => {
  const isOpen = openDropdownId === id && !disabled;
  const handleSelect = (opt) => { onChange(opt); setOpenDropdownId(null); };
  return (
    <div className="relative custom-dropdown w-full">
      <button onClick={(e) => { e.stopPropagation(); if (!disabled) setOpenDropdownId(isOpen ? null : id); }} className={`flex items-center gap-2 text-sm ${colorClass} ${disabled ? 'cursor-default opacity-80' : 'hover:opacity-80'} text-left w-full font-medium py-1 truncate`}>
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

const DateCell = ({ date, time, onChange, disabled }) => {
  const inputRef = useRef(null);
  const displayDate = formatDate(date);
  return (
    <div className={`relative ${disabled ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} group h-full flex flex-col justify-center`} onClick={(e) => { e.stopPropagation(); if (!disabled) inputRef.current.showPicker(); }}>
      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        {displayDate}{time && <span className="text-xs text-gray-400 ml-1 font-normal">{time}</span>}
      </span>
      {!disabled && <input ref={inputRef} type="date" value={date} onChange={(e) => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 dark:[color-scheme:dark]" />}
    </div>
  );
};

export default TaskTable;