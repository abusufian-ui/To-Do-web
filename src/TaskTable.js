import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Calendar as CalendarIcon, Mail, Clock, 
  ChevronDown, ChevronRight, ChevronsUp, ChevronUp,   
  Minus, ArrowDown, Book, Trash2, CheckSquare, Square,
  X, AlignLeft, Info, Flag, Plus as PlusIcon, Edit2, Save, AlertTriangle,
  CalendarDays 
} from 'lucide-react';
import UCPLogo from './UCPLogo';

// --- HELPER: CONVERT LONG NAMES TO ABBREVIATIONS ---
const getAbbreviation = (name) => {
  if (!name || name === 'Select') return name;
  const n = name.toLowerCase().trim();

  // 1. Standard CS Abbreviations
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

  // 2. Fallback: If it's still long (e.g. > 15 chars), make an acronym
  if (name.length > 15) {
    const ignoredWords = ['and', 'of', 'to', 'in', 'introduction', 'lab', 'for'];
    return name
      .split(' ')
      .filter(word => !ignoredWords.includes(word.toLowerCase()))
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 5); // Max 5 chars
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

const getPriorityConfig = (p) => {
  switch(p) {
    case 'Critical': return { icon: ChevronsUp, color: 'text-red-600 dark:text-red-500', label: p };
    case 'High': return { icon: ChevronUp, color: 'text-orange-600 dark:text-orange-500', label: p };
    case 'Medium': return { icon: Minus, color: 'text-yellow-600 dark:text-yellow-500', label: p };
    case 'Low': return { icon: ArrowDown, color: 'text-blue-600 dark:text-blue-500', label: p };
    default: return { icon: Minus, color: 'text-gray-500', label: p };
  }
};

const getStatusConfig = (s) => {
  switch(s) {
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

const TaskSummaryModal = ({ isOpen, onClose, task, courses, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDesc, setEditedDesc] = useState('');

  useEffect(() => {
    if (task) {
      setEditedName(task.name);
      setEditedDesc(task.description);
      setIsEditing(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const pConfig = getPriorityConfig(task.priority);
  const PriorityIcon = pConfig.icon;
  const currentCourse = courses.find(c => c.name === task.course);
  const courseType = currentCourse ? currentCourse.type : 'general';

  const handleSave = () => {
    if (editedName.trim() !== task.name) onUpdate(task.id, 'name', editedName);
    if (editedDesc.trim() !== task.description) onUpdate(task.id, 'description', editedDesc);
    setIsEditing(false); 
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-blue/10 rounded-xl"><Info className="text-brand-blue" size={20} /></div>
             <h2 className="text-xl font-bold dark:text-white text-gray-800">Task Details</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={isEditing ? handleSave : () => setIsEditing(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isEditing ? 'bg-brand-blue text-white hover:bg-blue-600' : 'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:text-brand-blue'}`}>
              {isEditing ? <><Save size={14}/> Save</> : <><Edit2 size={14}/> Edit</>}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors text-gray-400"><X size={20} /></button>
          </div>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            {isEditing ? (
              <div className="space-y-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Task Title</label><input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} className="w-full text-2xl font-extrabold bg-transparent border-b border-gray-300 dark:border-[#333] focus:border-brand-blue text-gray-900 dark:text-white outline-none py-1" /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label><textarea value={editedDesc} onChange={(e) => setEditedDesc(e.target.value)} rows={4} className="w-full text-sm leading-relaxed bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl p-3 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-blue outline-none resize-none" /></div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{task.name}</h1>
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400"><AlignLeft size={18} className="mt-1 flex-shrink-0 opacity-50" /><p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description || "No additional notes."}</p></div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500"><CalendarIcon size={16} className="opacity-70" /> Created: <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span></div>
              <div className="flex items-center gap-3 text-sm text-gray-500"><CalendarIcon className="text-brand-pink" size={16} /> Due Date: <span className="dark:text-gray-200 font-medium">{task.date || "No date"}</span></div>
              
              {/* --- CONDITIONALLY SHOW TIME ROW --- */}
              {task.time && (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <Clock className="text-brand-pink" size={16} /> Time: 
                  <span className="dark:text-gray-200 font-medium bg-gray-100 dark:bg-[#333] px-2 py-0.5 rounded ml-1">{task.time}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-500"><Flag size={16} className="opacity-70" /> Priority: <span className={`font-medium ${pConfig.color} flex items-center gap-1.5`}><PriorityIcon size={14} /> {task.priority}</span></div>
              <div className="flex items-center gap-3 text-sm text-gray-500"><Book size={16} className="text-brand-blue" /> Course: <span className="dark:text-gray-200 font-medium flex items-center gap-1.5"><CourseIcon type={courseType} name={task.course} /> {task.course}</span></div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[#181818] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Sub Tasks</h3>
            <div className="space-y-3">
              {task.subTasks?.map((sub, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
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

  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]); 

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

  const renderRow = (task, isCompleted = false) => {
    const statusConfig = getStatusConfig(task.status);
    const priorityConfig = getPriorityConfig(task.priority);
    const currentCourse = courses.find(c => c && c.name === task.course);
    const courseType = currentCourse ? currentCourse.type : 'general';
    const isExpanded = expandedTasks[task.id];
    const completedCount = task.subTasks?.filter(s => s.completed).length || 0;
    const totalCount = task.subTasks?.length || 0;

    return (
      <div key={task.id} className="border-b border-gray-200 dark:border-[#2C2C2C]">
        <div onClick={() => setSelectedTask(task)} className={`group flex items-center py-3 px-0 transition-all cursor-pointer ${isCompleted ? 'bg-gray-50 dark:bg-[#121212] opacity-60' : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#202020]'}`}>
            <div className={`${COL.name} flex items-center gap-2 text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
              <button onClick={(e) => toggleExpand(e, task.id)} className="text-gray-400 hover:text-brand-blue">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <span>{task.name}</span>
              {totalCount > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 rounded-md font-bold ml-1">{completedCount}/{totalCount}</span>}
            </div>
            
            <div className={COL.status} onClick={(e) => e.stopPropagation()}>
              <Dropdown id={`${task.id}-status`} value={isCompleted ? "Completed" : statusConfig.label} icon={statusConfig.icon} options={['New task', 'Scheduled', 'In Progress', 'Completed']} onChange={(val) => updateTask(task.id, 'status', val)} colorClass={isCompleted ? 'text-green-600 dark:text-green-500' : statusConfig.color} getOptionConfig={getStatusConfig} openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId} />
            </div>
            
            <div className={COL.course} onClick={(e) => e.stopPropagation()}>
                <div className="relative custom-dropdown w-full">
                  {task.course === 'Course Deleted' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === `${task.id}-course` ? null : `${task.id}-course`); }} 
                      className="flex items-center gap-2 text-sm text-red-500 hover:opacity-80 text-left w-full font-medium py-1 truncate"
                    >
                      <AlertTriangle size={16} /> Deleted
                    </button>
                  ) : (
                    // --- ABBREVIATION APPLIED HERE ---
                    <button 
                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === `${task.id}-course` ? null : `${task.id}-course`); }} 
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:opacity-80 text-left w-full font-medium py-1 truncate"
                        title={task.course} // Tooltip shows full name
                    >
                      <CourseIcon type={courseType} name={task.course} /> {getAbbreviation(task.course) || "Select"}
                    </button>
                  )}

                  {openDropdownId === `${task.id}-course` && (
                    <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-50 overflow-hidden animate-fadeIn">
                      {courses.length > 0 ? courses.map((c) => (
                        <div key={c.id || c._id || c.name} onClick={() => { updateTask(task.id, 'course', c.name); setOpenDropdownId(null); }} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-center gap-2 text-gray-700 dark:text-gray-200">
                          <CourseIcon type={c.type} name={c.name} /> <span className="font-medium">{c.name}</span>
                        </div>
                      )) : <div className="p-3 text-xs text-gray-500">No courses added</div>}
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
                <button 
                  onClick={() => handleDeleteSubTask(task.id, index)}
                  className="ml-auto text-gray-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-all p-1 rounded-md"
                  title="Remove subtask"
                >
                  <X size={14} /> 
                </button>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1 group/input">
              <PlusIcon size={14} className="text-brand-blue" />
              <input type="text" value={newSubTask[task.id] || ''} onChange={(e) => setNewSubTask(prev => ({...prev, [task.id]: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(task.id, e.target.value)} placeholder="Add a sub-task..." className="bg-transparent border-none text-xs text-brand-blue outline-none focus:ring-0 placeholder-gray-500 italic w-full" />
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeTasks = sortTasks(tasks.filter(t => t.status !== 'Completed'));
  const completedTasks = sortTasks(tasks.filter(t => t.status === 'Completed'));

  return (
    <div className="p-8 w-full animate-fadeIn pb-20">
      <div className="mb-10">
        <button onClick={() => setShowActive(!showActive)} className="flex items-center gap-2 mb-4 group focus:outline-none">
           {showActive ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
           <h2 className="text-gray-800 dark:text-white font-bold text-sm">Active tasks</h2>
           <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{activeTasks.length}</span>
        </button>
        {showActive && (
          <>
            <div className="flex text-xs text-gray-500 dark:text-[#71717A] border-b border-gray-200 dark:border-[#2C2C2C] pb-2 px-0">
                <div className={COL.name}>Task Name</div>
                <div className={COL.status}>Status</div>
                <div className={COL.course}>Course</div>
                <div className={COL.date}>Due date</div>
                <div className={COL.priority}>Priority</div>
            </div>
            {activeTasks.length > 0 ? activeTasks.map(task => renderRow(task, false)) : (
              <p className="py-8 text-center text-gray-500 text-sm italic">No active tasks.</p>
            )}
          </>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="animate-fadeIn">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 mb-4 group focus:outline-none">
             {showCompleted ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
             <h2 className="text-gray-800 dark:text-white font-bold text-sm">Completed tasks</h2>
             <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{completedTasks.length}</span>
          </button>
          {showCompleted && completedTasks.map(task => renderRow(task, true))}
        </div>
      )}

      <TaskSummaryModal 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
        task={selectedTask} 
        courses={courses}
        onUpdate={updateTask}
      />
    </div>
  );
};

// --- DROPDOWN COMPONENT ---
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

// --- DATE CELL COMPONENT ---
const DateCell = ({ date, time, onChange }) => {
  const inputRef = useRef(null);
  
  const displayDate = formatDate(date); 
  const displayTime = time ? `, ${time}` : '';

  return (
    <div className="relative cursor-pointer hover:opacity-80 group h-full flex flex-col justify-center" onClick={(e) => { e.stopPropagation(); inputRef.current.showPicker(); }}>
      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        {displayDate}
        {time && <span className="text-xs text-gray-400 ml-1 font-normal">{time}</span>}
      </span>
      <input ref={inputRef} type="date" value={date} onChange={(e) => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 dark:[color-scheme:dark]" />
    </div>
  );
};

export default TaskTable;