import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, Flag, Book, CheckSquare, Square, AlignLeft, Info,
  Edit2, Save, Clock, CheckCircle2, ChevronDown, ChevronsUp,
  ChevronUp, Minus, ArrowDown, Mail, Plus as PlusIcon, CalendarDays, Shield
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
    case 'Critical': return { icon: ChevronsUp, color: 'text-red-600 dark:text-red-500', label: p };
    case 'High': return { icon: ChevronUp, color: 'text-orange-600 dark:text-orange-500', label: p };
    case 'Medium': return { icon: Minus, color: 'text-yellow-600 dark:text-yellow-500', label: p };
    case 'Low': return { icon: ArrowDown, color: 'text-blue-600 dark:text-blue-500', label: p };
    default: return { icon: Minus, color: 'text-gray-500', label: p };
  }
};

const getStatusConfig = (s) => {
  switch (s) {
    case 'Scheduled': return { icon: Calendar, color: 'text-gray-500 dark:text-gray-400', label: s };
    case 'In Progress': return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-500', label: s };
    case 'New task':
    case 'New Assigned': return { icon: Mail, color: 'text-blue-600 dark:text-blue-400', label: 'New task' };
    case 'Completed': return { icon: CheckCircle2, color: 'text-green-600 dark:text-green-500', label: s };
    default: return { icon: CheckCircle2, color: 'text-gray-400', label: s };
  }
};


const EditDropdown = ({ value, options, onChange, getConfig, placeholder }) => {
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-left focus:border-brand-blue outline-none"
      >
        <span className={`flex items-center gap-2 truncate font-medium ${config?.color}`}>
          {Icon && <Icon size={14} />}
          {value || placeholder}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
          {options.map(opt => {
            const optConfig = getConfig ? getConfig(opt) : { color: 'text-gray-700 dark:text-gray-200' };
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs ${optConfig?.color}`}
              >
                {optConfig.icon && <optConfig.icon size={14} />}
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const ModalCourseDropdown = ({ value, courses, onChange }) => {
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1.5 text-xs text-left focus:border-brand-blue outline-none"
      >
        <span className="flex items-center gap-2 truncate font-medium text-gray-700 dark:text-gray-200">
          {value === 'Event' ? <CalendarDays size={14} className="text-rose-500" /> : (value ? <Book size={14} className="text-brand-blue" /> : <Book size={14} className="text-gray-400" />)}
          {value || "Select Course"}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[150] overflow-hidden max-h-56 overflow-y-auto flex flex-col">
          <div onClick={() => { onChange('Event'); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-rose-600 dark:text-rose-500 font-medium shrink-0">
            <CalendarDays size={14} /> Event
          </div>
          {uniCourses.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500 uppercase border-y border-gray-200 dark:border-[#333] sticky top-0">University</div>
              {uniCourses.map(c => (
                <div key={c.id || c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <UCPLogo className="w-3.5 h-3.5 text-blue-600 fill-current" /> <span className="truncate">{c.name}</span>
                </div>
              ))}
            </div>
          )}
          {genCourses.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-gray-100 dark:bg-[#222] text-[10px] font-bold text-gray-500 uppercase border-y border-gray-200 dark:border-[#333] sticky top-0">General</div>
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

const TaskSummaryModal = ({ isOpen, onClose, task, courses, onUpdate, user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);
  const [newSubText, setNewSubText] = useState('');

  const [form, setForm] = useState({
    name: '', description: '', date: '', time: '', priority: '', status: '', course: '', isPrivate: false, subTasks: []
  });

  useEffect(() => {
    if (task) {
      setForm({
        name: task.name || '', description: task.description || '', date: task.date || '',
        time: task.time || '', priority: task.priority || 'Medium', status: task.status || 'New task',
        course: task.course || '', isPrivate: task.isPrivate || false,
        subTasks: task.subTasks ? [...task.subTasks] : []
      });
      setIncludeTime(!!task.time);
      setIsEditing(false);
      setNewSubText('');
    }
  }, [task, isOpen]);

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
    if (onUpdate) {
      if (form.name !== task.name) onUpdate(task.id, 'name', form.name);
      if (form.description !== task.description) onUpdate(task.id, 'description', form.description);
      if (form.date !== task.date) onUpdate(task.id, 'date', form.date);

      const timeToSave = includeTime ? form.time : null;
      if (timeToSave !== task.time) onUpdate(task.id, 'time', timeToSave);

      if (form.priority !== task.priority) onUpdate(task.id, 'priority', form.priority);
      if (form.status !== task.status) onUpdate(task.id, 'status', form.status);
      if (form.course !== task.course) onUpdate(task.id, 'course', form.course);
      if (form.isPrivate !== task.isPrivate) onUpdate(task.id, 'isPrivate', form.isPrivate);

      onUpdate(task.id, 'subTasks', form.subTasks);
    }
    setIsEditing(false);
  };

  const showTimeCell = isEditing ? includeTime : !!task.time;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {}
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl md:max-w-2xl h-full shadow-2xl overflow-hidden border-l border-gray-200 dark:border-[#2C2C2C] animate-slideInRight flex flex-col">

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
        `}</style>

        {}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <Info className="text-brand-blue" size={20} />
            </div>
            <h2 className="text-xl font-bold dark:text-white text-gray-800">
              {isEditing ? 'Edit Task Details' : 'Task Workspace Summary'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${isEditing ? 'bg-brand-blue text-white hover:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-gray-500 dark:text-gray-400'}`}
            >
              {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full text-gray-500">
              <X size={20} />
            </button>
          </div>
        </div>

        {}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Title</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xl font-bold bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Description</label>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full text-sm bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none dark:text-gray-300 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{task.name}</h1>
                <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#151515] p-5 rounded-2xl border border-gray-100 dark:border-[#252525] w-full">
                  <AlignLeft size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words flex-1">{task.description || "No description provided."}</p>
                </div>
              </div>
            )}
          </div>

          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <Calendar className="text-gray-400" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Created:</span>
                <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <Calendar className="text-brand-pink shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Due Date:</span>
                {isEditing ? (
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs dark:text-white dark:[color-scheme:dark]" />
                ) : (
                  <span className="dark:text-gray-200 font-medium">{task.date || "No date set"}</span>
                )}
              </div>

              {(showTimeCell || isEditing) && (
                <div className="flex items-center gap-3 text-sm min-h-[36px]">
                  <Clock className="text-purple-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-16 shrink-0">Time:</span>
                  {isEditing ? (
                    includeTime ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs dark:text-white dark:[color-scheme:dark]" />
                        <button onClick={() => { setIncludeTime(false); setForm({ ...form, time: '' }); }} className="text-[10px] text-red-500 font-bold hover:underline">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setIncludeTime(true)} className="text-xs text-brand-blue font-bold hover:underline py-1 px-2 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add Time</button>
                    )
                  ) : (
                    <span className="dark:text-gray-200 font-medium">{task.time ? formatTime(task.time) : "All Day"}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <Shield className="text-indigo-500 shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Privacy:</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setForm({ ...form, isPrivate: !form.isPrivate })}>
                    <input type="checkbox" checked={form.isPrivate || false} onChange={e => setForm({ ...form, isPrivate: e.target.checked })} className="w-4 h-4 cursor-pointer" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Make Private</span>
                  </div>
                ) : (
                  <span className="dark:text-gray-200 font-medium">{task.isPrivate ? "Private" : "Shared Workspace"}</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <Flag className="text-orange-500 shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Priority:</span>
                {isEditing ? (
                  <EditDropdown value={form.priority} options={['Low', 'Medium', 'High', 'Critical']} onChange={(val) => setForm({ ...form, priority: val })} getConfig={getPriorityConfig} />
                ) : (
                  <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${getPriorityConfig(task.priority).color}`}>
                    {(() => { const PIcon = getPriorityConfig(task.priority).icon; return <PIcon size={14} />; })()}
                    {task.priority}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <Book className="text-brand-blue shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Course:</span>
                {isEditing ? (
                  <ModalCourseDropdown value={form.course} courses={courses} onChange={(val) => setForm({ ...form, course: val })} />
                ) : (
                  <span className="dark:text-gray-200 font-medium truncate" title={task.course}>{task.course}</span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm min-h-[36px]">
                <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Status:</span>
                {isEditing ? (
                  <EditDropdown value={form.status} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => setForm({ ...form, status: val })} getConfig={getStatusConfig} />
                ) : (
                  <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${getStatusConfig(task.status).color}`}>
                    {(() => { const SIcon = getStatusConfig(task.status).icon; return <SIcon size={14} />; })()}
                    {task.status}
                  </span>
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
              {isEditing ? (
                <>
                  {form.subTasks?.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm bg-white dark:bg-[#222] p-2.5 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleToggleFormSubTask(i)} className={sub.completed ? 'text-green-500' : 'text-gray-400'}>
                          {sub.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                        <span className={sub.completed ? 'line-through text-gray-400 italic' : 'dark:text-gray-200'}>{sub.text}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveFormSubTask(i)} className="text-gray-400 hover:text-red-500 p-1">
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
                      placeholder="Add subtask details..."
                      className="flex-1 text-xs bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none dark:text-white"
                    />
                    <button type="button" onClick={handleAddFormSubTask} className="p-2 bg-brand-blue text-white rounded-lg hover:bg-blue-600">
                      <PlusIcon size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {task.subTasks?.map((sub, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-white/40 dark:bg-white/5 p-2 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <span className={sub.completed ? 'line-through text-gray-400 italic' : 'dark:text-gray-300'}>{sub.text}</span>
                    </div>
                  ))}
                  {(!task.subTasks || task.subTasks.length === 0) && (
                    <p className="text-xs text-gray-500 italic">No sub-tasks configured yet.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummaryModal;