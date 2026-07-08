import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, Calendar as CalendarIcon, Clock, Mail, AlertTriangle,
  ChevronDown, ChevronRight, ChevronLeft, ChevronsUp, ChevronUp,
  Minus, ArrowDown, Book, Trash2, CheckSquare, Square,
  X, Plus as PlusIcon, CalendarDays, Lock, Globe
} from 'lucide-react';
import UCPLogo from './UCPLogo';
import TaskSummaryModal from './TaskSummaryModal';


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

const TaskTable = ({ tasks, updateTask, courses, deleteTask, user, activeGroup, pendingInvitations, fetchActiveGroup, fetchPendingInvitations, fetchTasks, toast, setToast, semesterStatus }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showActive, setShowActive] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [newSubTask, setNewSubTask] = useState({});
  const [viewMode, setViewMode] = useState('private');
  const [showCelebration, setShowCelebration] = useState(false);
  
  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);
  
  const [optimisticPrivacy, setOptimisticPrivacy] = useState({});

  useEffect(() => {
    if (viewMode === 'shared') {
      if (fetchActiveGroup) fetchActiveGroup();
      if (fetchPendingInvitations) fetchPendingInvitations();
    }
  }, [viewMode, fetchActiveGroup, fetchPendingInvitations]);

  const handleUpdateTask = (id, field, value) => {
    const task = tasks.find(t => (t.id === id || t._id === id));
    const previousStatus = task ? (task.status || 'New task') : '';

    updateTask(id, field, value);

    if (field === 'status' && value === 'Completed' && previousStatus !== 'Completed') {
      setShowCelebration(true);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const completedCourseNames = React.useMemo(() => {
    if (!semesterStatus || !semesterStatus.latestResult || !semesterStatus.latestResult.courses) return [];
    return semesterStatus.latestResult.courses.map(c => c.name);
  }, [semesterStatus]);

  const isTaskCurrent = (t) => {
    if (t.course === 'General' || t.course === 'Event') return true;
    if (completedCourseNames.includes(t.course)) return false;
    return courses.some(c => c.name === t.course);
  };

  
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
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-[#2C2C2C] pb-2">
                <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 group focus:outline-none">
                  {showArchived ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                  <h2 className="text-gray-800 dark:text-white font-bold text-sm">Archived tasks</h2>
                  <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{archivedTasks.length}</span>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to permanently clear all archived tasks?")) {
                      try {
                        const token = localStorage.getItem('token');
                        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                        const res = await fetch(`${API_BASE}/api/tasks/archived/clear`, {
                          method: 'DELETE',
                          headers: { 'x-auth-token': token }
                        });
                        if (res.ok) {
                          if (fetchTasks) fetchTasks();
                        }
                      } catch (err) {
                        console.error("Failed to clear archived tasks", err);
                      }
                    }
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-lg border border-red-500/20"
                >
                  Clear All
                </button>
              </div>

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
      <ConfettiCannon active={showCelebration} onClose={handleCloseCelebration} />
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

const ConfettiCannon = ({ active, onClose }) => {
  const canvasRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const colors = [
      '#6366f1', // Indigo
      '#ec4899', // Pink
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Purple
      '#ef4444', // Red
    ];

    const createBurst = () => {
      const count = 80;
      // Bottom-left corner shooting upwards and right
      for (let i = 0; i < count; i++) {
        particles.push({
          x: 0,
          y: canvas.height,
          vx: Math.random() * 16 + 6,
          vy: -(Math.random() * 22 + 16),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 9 + 4,
          shape: Math.random() > 0.5 ? 'circle' : 'rect',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.25,
          gravity: 0.48,
          drag: 0.975,
          opacity: 1,
          fadeSpeed: Math.random() * 0.012 + 0.006,
        });
      }
      // Bottom-right corner shooting upwards and left
      for (let i = 0; i < count; i++) {
        particles.push({
          x: canvas.width,
          y: canvas.height,
          vx: -(Math.random() * 16 + 6),
          vy: -(Math.random() * 22 + 16),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 9 + 4,
          shape: Math.random() > 0.5 ? 'circle' : 'rect',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.25,
          gravity: 0.48,
          drag: 0.975,
          opacity: 1,
          fadeSpeed: Math.random() * 0.012 + 0.006,
        });
      }
    };

    createBurst();

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.fadeSpeed;

        if (p.opacity > 0 && p.y < canvas.height + 50 && p.x > -50 && p.x < canvas.width + 50) {
          alive = true;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          }
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId = requestAnimationFrame(updateAndDraw);
      } else {
        if (onCloseRef.current) onCloseRef.current();
      }
    };

    updateAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default TaskTable;