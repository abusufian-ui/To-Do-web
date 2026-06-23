import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Book, CheckSquare, Square, AlignLeft, Info,
  Edit2, Save, Clock, CheckCircle2, ChevronDown, ChevronsUp,
  ChevronUp, Minus, ArrowDown, Mail, Plus as PlusIcon, CalendarDays,
  Lock, Globe
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const getPriorityConfig = (p) => {
  switch (p) {
    case 'Critical': return { icon: ChevronsUp, color: 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20', label: p };
    case 'High': return { icon: ChevronUp, color: 'text-orange-500 dark:text-orange-400 bg-orange-500/10 border-orange-500/20', label: p };
    case 'Medium': return { icon: Minus, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', label: p };
    case 'Low': return { icon: ArrowDown, color: 'text-sky-500 dark:text-sky-400 bg-sky-500/10 border-sky-500/20', label: p };
    default: return { icon: Minus, color: 'text-gray-500 dark:text-gray-400 bg-gray-500/10 border-gray-500/20', label: p };
  }
};

const getStatusConfig = (s) => {
  switch (s) {
    case 'Scheduled': return { icon: Calendar, color: 'text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/20', label: s };
    case 'In Progress': return { icon: Clock, color: 'text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20', label: s };
    case 'New task':
    case 'New Assigned': return { icon: Mail, color: 'text-blue-500 dark:text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'New task' };
    case 'Completed': return { icon: CheckCircle2, color: 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: s };
    default: return { icon: CheckCircle2, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20', label: s };
  }
};

const EditDropdown = ({ value, options, onChange, getConfig, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const config = getConfig ? getConfig(value) : { color: 'text-gray-700 dark:text-gray-200' };
  const Icon = config?.icon;

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-3 py-2 text-xs text-left focus:border-brand-blue outline-none transition-all duration-300 hover:border-indigo-500/50"
      >
        <span className={`flex items-center gap-2 truncate font-semibold ${config?.color.split(' ')[0]}`}>
          {Icon && <Icon size={14} className="shrink-0" />}
          {value || placeholder}
        </span>
        {!disabled && <ChevronDown size={12} className="text-gray-400 shrink-0" />}
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-xl shadow-2xl z-[200] max-h-40 overflow-y-auto custom-scrollbar animate-fadeIn">
          {options.map(opt => {
            const optConfig = getConfig ? getConfig(opt) : { color: 'text-gray-700 dark:text-gray-200' };
            const OptIcon = optConfig.icon;
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs transition-colors duration-200 ${optConfig?.color.split(' ')[0]} font-medium`}
              >
                {OptIcon && <OptIcon size={14} className="shrink-0" />}
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

  const uniCourses = courses?.filter(c => c.type === 'uni' || c.type === 'university') || [];
  const genCourses = courses?.filter(c => c.type !== 'uni' && c.type !== 'university') || [];

  return (
    <div className="relative w-full flex-1" ref={dropdownRef}>
      <button
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-3 py-2 text-xs text-left focus:border-brand-blue outline-none transition-all duration-300 hover:border-indigo-500/50"
      >
        <span className="flex items-center gap-2 truncate font-semibold text-gray-700 dark:text-gray-200">
          {value === 'Event' ? (
            <CalendarDays size={14} className="text-rose-500 shrink-0" />
          ) : value && courses?.find(c => c.name === value)?.type === 'uni' ? (
            <UCPLogo className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0" />
          ) : value ? (
            <Book size={14} className="text-indigo-400 shrink-0" />
          ) : (
            <Book size={14} className="text-gray-400 shrink-0" />
          )}
          {value || "Select Course"}
        </span>
        {!disabled && <ChevronDown size={12} className="text-gray-400 shrink-0" />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-xl shadow-2xl z-[200] overflow-hidden max-h-56 overflow-y-auto custom-scrollbar flex flex-col animate-fadeIn">
          <div onClick={() => { onChange('Event'); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold shrink-0 transition-colors duration-200">
            <CalendarDays size={14} /> Event
          </div>
          {uniCourses.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#252525] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-y border-gray-200/50 dark:border-[#2C2C2C]/50 sticky top-0">University</div>
              {uniCourses.map(c => (
                <div key={c.id || c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors duration-200">
                  <UCPLogo className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0" /> <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}
          {genCourses.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#252525] text-[10px] font-bold text-gray-500 uppercase tracking-wider border-y border-gray-200/50 dark:border-[#2C2C2C]/50 sticky top-0">General</div>
              {genCourses.map(c => (
                <div key={c.id || c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors duration-200">
                  <Book size={14} className="text-gray-400 shrink-0" /> <span className="truncate">{c.name}</span>
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
  const [activePulseField, setActivePulseField] = useState(null);

  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '', priority: '', status: '', course: '', isPrivate: false, subTasks: []
  });

  const currentStatus = task?.status || 'New task';
  const taskId = task?.id || task?._id;

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

  const currentUserId = String(user?.id || user?._id || '');
  const taskCreatorId = String(task?.userId?._id || task?.userId?.id || task?.userId || '');
  const isOwner = currentUserId && taskCreatorId && (currentUserId === taskCreatorId);
  const canEditFully = !task.groupId ? true : isOwner;

  const triggerPulse = (field) => {
    setActivePulseField(field);
    setTimeout(() => setActivePulseField(null), 800);
  };

  const handleToggleFormSubTask = (idx) => {
    setForm(prev => {
      const nextSub = [...prev.subTasks];
      nextSub[idx] = { ...nextSub[idx], completed: !nextSub[idx].completed };
      return { ...prev, subTasks: nextSub };
    });
    triggerPulse('subtasks');
  };

  const handleRemoveFormSubTask = (idx) => {
    setForm(prev => ({
      ...prev,
      subTasks: prev.subTasks.filter((_, i) => i !== idx)
    }));
    triggerPulse('subtasks');
  };

  const handleAddFormSubTask = () => {
    if (!newSubText.trim()) return;
    setForm(prev => ({
      ...prev,
      subTasks: [...prev.subTasks, { text: newSubText.trim(), completed: false }]
    }));
    setNewSubText('');
    triggerPulse('subtasks');
  };

  const handleSave = () => {
    if (onUpdate) {
      if (form.name.trim() !== task.name) onUpdate(taskId, 'name', form.name);
      if (form.description.trim() !== task.description) onUpdate(taskId, 'description', form.description);
      if (form.date !== task.date) {
        onUpdate(taskId, 'date', form.date);
        triggerPulse('date');
      }

      const timeToSave = includeTime ? form.time : null;
      if (timeToSave !== task.time) {
        onUpdate(taskId, 'time', timeToSave);
        triggerPulse('time');
      }

      if (form.priority !== task.priority) {
        onUpdate(taskId, 'priority', form.priority);
        triggerPulse('priority');
      }
      if (form.status !== currentStatus) {
        onUpdate(taskId, 'status', form.status);
        triggerPulse('status');
      }
      if (form.course !== task.course) {
        onUpdate(taskId, 'course', form.course);
        triggerPulse('course');
      }
      if (form.isPrivate !== task.isPrivate) {
        onUpdate(taskId, 'isPrivate', form.isPrivate);
        triggerPulse('privacy');
      }

      onUpdate(taskId, 'subTasks', form.subTasks);
    }
    setIsEditing(false);
  };

  const showTimeCell = isEditing ? includeTime : !!task.time;
  const pConfig = getPriorityConfig(task.priority);
  const PriorityIcon = pConfig.icon;
  const currentCourse = courses.find(c => c.name === task.course);
  const isUniCourse = currentCourse && (currentCourse.type === 'uni' || currentCourse.type === 'university');
  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  const totalSubtasks = task.subTasks?.length || 0;
  const completedSubtasks = task.subTasks?.filter(s => s.completed).length || 0;
  const completionPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl md:max-w-2xl h-full shadow-2xl overflow-hidden border-l border-gray-200/50 dark:border-[#2C2C2C] animate-slideInRight flex flex-col relative">

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #2A334B; }
          
          .animate-fadeIn {
            animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes fadeIn {
            0% { opacity: 0; backdrop-filter: blur(0px); }
            100% { opacity: 1; backdrop-filter: blur(4px); }
          }
          .animate-slideInRight {
            animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes slideInRight {
            0% { transform: translateX(100%); }
            100% { transform: translateX(0); }
          }
          
          .pulse-glow {
            animation: pulseGlow 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); border-color: rgba(99, 102, 241, 0.6); }
            100% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); border-color: transparent; }
          }
          
          .glass-panel {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8);
          }
          .dark .glass-panel {
            background: rgba(30, 30, 30, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        `}</style>

        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0 glass-panel">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-500 border border-indigo-100/50 dark:border-indigo-900/30">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold dark:text-white text-gray-800">
                {isEditing ? 'Modify Task Properties' : 'Task Details Workspace'}
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                {task.groupId ? 'Collaborative Workspace' : 'Personal task'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canEditFully && (
              <button
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                className={`p-2 rounded-xl transition-all duration-300 flex items-center justify-center border ${isEditing ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600' : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-[#2C2C2C] text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:border-indigo-500/50 dark:hover:border-indigo-500/50'}`}
                title={isEditing ? "Save changes" : "Edit properties"}
              >
                {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-500/35 dark:hover:border-red-500/35 transition-all duration-300">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          
          {/* Title & Description Container */}
          <div className="glass-panel p-6 rounded-2xl">
            {isEditing && canEditFully ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xl font-bold bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-2.5 outline-none dark:text-white focus:border-indigo-500 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 outline-none dark:text-gray-300 focus:border-indigo-500 resize-none transition-all duration-300"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-snug">{task.name}</h1>
                <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300 bg-white/40 dark:bg-[#080C14]/40 p-4 rounded-xl border border-gray-200/40 dark:border-white/5">
                  <AlignLeft size={16} className="mt-1 flex-shrink-0 text-gray-400" />
                  <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">
                    {task.description || "No description provided."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Cards Grid (Stacked Layout to prevent Wrap Issues) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Created Date Card (ReadOnly) */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200/50 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] relative transition-all duration-300 hover:z-30 focus-within:z-40">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800/30 text-gray-400">
                <Calendar size={16} className="shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Created</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {new Date(task.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Due Date Card */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'date' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-50 dark:bg-rose-950/20 text-rose-500">
                <CalendarDays size={16} className="shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-rose-400/90 dark:text-rose-500/70 uppercase tracking-wider">Due Date</p>
                {isEditing && canEditFully ? (
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-gray-700 dark:text-gray-200 py-0 px-0 dark:[color-scheme:dark]"
                  />
                ) : (
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                    {task.date || "No date set"}
                  </p>
                )}
              </div>
            </div>

            {/* Time Card */}
            {(showTimeCell || isEditing) && (
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'time' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-950/20 text-purple-500">
                  <Clock size={16} className="shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-purple-400/90 dark:text-purple-500/70 uppercase tracking-wider">Time</p>
                  {isEditing && canEditFully ? (
                    includeTime ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={form.time}
                          onChange={(e) => setForm({ ...form, time: e.target.value })}
                          className="bg-transparent border-0 outline-none text-xs font-semibold text-gray-700 dark:text-gray-200 py-0 px-0 dark:[color-scheme:dark]"
                        />
                        <button
                          onClick={() => { setIncludeTime(false); setForm({ ...form, time: '' }); }}
                          className="text-[9px] text-red-500 hover:text-red-600 font-bold hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIncludeTime(true)}
                        className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold hover:underline py-0.5"
                      >
                        + Add Time
                      </button>
                    )
                  ) : (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                      {task.time ? formatTime(task.time) : "All Day"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Card */}
            {canEditFully && (
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'privacy' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
                  {form.isPrivate ? <Lock size={16} className="shrink-0" /> : <Globe size={16} className="shrink-0" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-indigo-400/90 dark:text-indigo-500/70 uppercase tracking-wider">Privacy</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 cursor-pointer py-0.5" onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}>
                      <input
                        type="checkbox"
                        checked={form.isPrivate || false}
                        onChange={e => setForm({ ...form, isPrivate: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-[#2C354D] text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Private</span>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                      {task.isPrivate ? "Private" : "Shared Workspace"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Priority Card */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'priority' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${pConfig.color.split(' ').slice(1).join(' ')}`}>
                <PriorityIcon size={16} className="shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-orange-400/90 dark:text-orange-500/70 uppercase tracking-wider">Priority</p>
                {isEditing && canEditFully ? (
                  <div className="py-0.5">
                    <EditDropdown value={form.priority} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => setForm({ ...form, priority: val })} getConfig={getPriorityConfig} />
                  </div>
                ) : (
                  <p className={`text-xs font-bold ${pConfig.color.split(' ')[0]} truncate`}>
                    {task.priority || 'Medium'}
                  </p>
                )}
              </div>
            </div>

            {/* Status Card (Direct edit support if in group) */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'status' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusConfig.color.split(' ').slice(1).join(' ')}`}>
                <StatusIcon size={16} className="shrink-0 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-emerald-400/90 dark:text-emerald-500/70 uppercase tracking-wider">Status</p>
                {isEditing && canEditFully ? (
                  <div className="py-0.5">
                    <EditDropdown value={form.status} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => setForm({ ...form, status: val })} getConfig={getStatusConfig} />
                  </div>
                ) : task.groupId ? (
                  <div className="py-0.5">
                    <EditDropdown value={currentStatus} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => { onUpdate(taskId, 'status', val); triggerPulse('status'); }} getConfig={getStatusConfig} />
                  </div>
                ) : (
                  <p className={`text-xs font-bold ${statusConfig.color.split(' ')[0]} truncate`}>
                    {currentStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Course Card (Spans 2 columns to give max width for name, supports UCP logo) */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border col-span-2 transition-all duration-300 hover:-translate-y-[2px] bg-white dark:bg-[#1A1A1A] relative hover:z-30 focus-within:z-40 ${activePulseField === 'course' ? 'pulse-glow border-indigo-500/80 dark:border-indigo-500/80' : 'border-gray-200/50 dark:border-[#2C2C2C]'}`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-blue-500 shrink-0">
                {task.course === 'Event' ? (
                  <CalendarDays size={16} className="text-rose-500 shrink-0 animate-pulse" />
                ) : isUniCourse ? (
                  <UCPLogo className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400 fill-current shrink-0" />
                ) : (
                  <Book size={16} className="text-indigo-400 shrink-0" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-blue-400/90 dark:text-blue-500/70 uppercase tracking-wider">Course Module</p>
                {isEditing && canEditFully ? (
                  <div className="py-0.5">
                    <ModalCourseDropdown value={form.course} courses={courses} onChange={(val) => setForm({ ...form, course: val })} />
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate" title={task.course || "General"}>
                    {task.course || "General Course"}
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Subtasks Management Panel */}
          <div className={`glass-panel p-5 rounded-2xl transition-all duration-300 ${activePulseField === 'subtasks' ? 'pulse-glow border-indigo-500/40' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={14} className="text-indigo-500" /> Subtask Checklist
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                {completionPercent}% Done
              </span>
            </div>
            
            {/* Checklist Progress Bar */}
            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full mb-5 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <div className="space-y-2">
              {isEditing && canEditFully ? (
                <>
                  {form.subTasks?.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]/50 transition-all duration-200 hover:border-indigo-500/20">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleToggleFormSubTask(i)} className={`transition-colors duration-200 ${sub.completed ? 'text-emerald-500' : 'text-gray-400 hover:text-indigo-500'}`}>
                          {sub.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span className={`font-semibold ${sub.completed ? 'line-through text-gray-400 dark:text-gray-500 italic' : 'text-gray-700 dark:text-gray-200'}`}>
                          {sub.text}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFormSubTask(i)} 
                        className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add Subtask Form */}
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100 dark:border-[#2C2C2C]/50">
                    <input
                      type="text"
                      value={newSubText}
                      onChange={(e) => setNewSubText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFormSubTask()}
                      placeholder="Define checklist item details..."
                      className="flex-1 text-xs bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-3 py-2 outline-none dark:text-white focus:border-indigo-500 transition-all duration-300"
                    />
                    <button 
                      type="button" 
                      onClick={handleAddFormSubTask} 
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-md"
                    >
                      <PlusIcon size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {task.subTasks?.map((sub, i) => {
                    return (
                      <div 
                        key={i} 
                        onClick={() => {
                          const updated = [...task.subTasks];
                          updated[i] = { ...updated[i], completed: !updated[i].completed };
                          onUpdate(taskId, 'subTasks', updated);
                          triggerPulse('subtasks');
                        }}
                        className="flex items-center gap-3 text-xs bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-gray-200/50 dark:border-[#2C2C2C]/50 cursor-pointer hover:border-indigo-500/25 dark:hover:border-indigo-500/25 transition-all duration-300"
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-300 border-2 ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white animate-[scaleIn_0.2s_ease-out]' : 'border-gray-300 dark:border-[#2C354D]'}`}>
                          {sub.completed && <CheckSquare size={12} className="shrink-0" />}
                        </div>
                        <span className={`font-semibold transition-all duration-300 ${sub.completed ? 'line-through text-gray-400 dark:text-gray-500 italic' : 'text-gray-700 dark:text-gray-200'}`}>
                          {sub.text}
                        </span>
                      </div>
                    );
                  })}
                  {(!task.subTasks || task.subTasks.length === 0) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
                      No subtask milestones configured yet.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        {isEditing && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/70 dark:bg-[#1E1E1E]/70 backdrop-blur-xl border-t border-gray-200/50 dark:border-[#2C2C2C] flex gap-3 shrink-0 z-50">
            <button 
              onClick={handleSave} 
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save Changes
            </button>
            <button 
              onClick={() => { setIsEditing(false); }} 
              className="px-4 py-3 bg-gray-100 dark:bg-[#121212] text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl hover:bg-gray-200 dark:hover:bg-[#2C2C2C] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSummaryModal;