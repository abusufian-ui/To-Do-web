import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Mail, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  ChevronsUp, 
  ChevronUp,  
  Minus,      
  ArrowDown,  
  Book,
  Trash2 // <--- Imported Trash Icon
} from 'lucide-react';
import UCPLogo from './UCPLogo';

// --- 1. MAGIC NUMBERS ---
const COL = {
  name: "flex-1 pl-4",       
  status: "w-[160px]",       
  course: "w-[150px]",      
  date: "w-[100px]",         
  priority: "w-[100px]",     
};

// --- 2. HELPERS ---
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

const CourseIcon = ({ type }) => {
  if (type === 'uni') {
    return <UCPLogo className="w-5 h-5 text-blue-600 dark:text-blue-400 opacity-90" />;
  }
  return <Book size={18} className="text-gray-400" />;
};

// --- 3. SUB-COMPONENTS ---

const Dropdown = ({ id, value, options, onChange, colorClass, icon: Icon, getOptionConfig, openDropdownId, setOpenDropdownId }) => {
  const isOpen = openDropdownId === id;

  const handleSelect = (opt) => {
    onChange(opt);
    setOpenDropdownId(null);
  };

  return (
    <div className="relative custom-dropdown w-full">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setOpenDropdownId(isOpen ? null : id);
        }}
        className={`flex items-center gap-2 text-sm ${colorClass} hover:opacity-80 text-left w-full font-medium py-1 truncate`}
      >
        {Icon && <Icon size={16} />}
        {value}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-50 overflow-hidden animate-fadeIn">
          {options.map((opt) => {
            const config = getOptionConfig ? getOptionConfig(opt) : {}; 
            const OptionIcon = config.icon;
            const optionColor = config.color || "text-gray-700 dark:text-gray-200";

            return (
              <div 
                key={opt} 
                onClick={() => handleSelect(opt)}
                className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm transition-colors flex items-center gap-2 ${optionColor}`}
              >
                {OptionIcon && <OptionIcon size={16} />}
                <span className="font-medium">{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DateCell = ({ date, onChange }) => {
  const inputRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (inputRef.current) {
        try { inputRef.current.showPicker(); } catch { inputRef.current.focus(); }
    }
  };

  return (
    <div 
      className="relative cursor-pointer hover:opacity-80 group h-full flex items-center"
      onClick={handleClick}
    >
      <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors font-medium select-none">
          {formatDate(date)}
      </span>
      <input 
        ref={inputRef}
        type="date" 
        value={date} 
        onChange={(e) => onChange(e.target.value)}
        className="absolute bottom-0 left-0 opacity-0 w-0 h-0 dark:[color-scheme:dark]"
      />
    </div>
  );
};

// --- 4. MAIN COMPONENT ---
// Added deleteTask prop
const TaskTable = ({ tasks, updateTask, courses, deleteTask }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [showActive, setShowActive] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderRow = (task, isCompleted = false) => {
    const statusConfig = getStatusConfig(task.status);
    const priorityConfig = getPriorityConfig(task.priority);
    const currentCourse = courses.find(c => c && c.name === task.course);
    const courseType = currentCourse ? currentCourse.type : 'general';

    return (
      <div 
        key={task.id} 
        className={`group flex items-center border-b border-gray-200 dark:border-[#2C2C2C] py-3 px-0 transition-all
          ${isCompleted 
            ? 'bg-gray-50 dark:bg-[#121212] opacity-60 hover:opacity-100' 
            : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#202020]'
          }
        `}
      >
          {/* Name */}
          <div className={`${COL.name} text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
            {task.name}
          </div>
          
          {/* Status */}
          <div className={COL.status}>
            <Dropdown 
              id={`${task.id}-status`}
              value={isCompleted ? "Completed" : statusConfig.label}
              icon={statusConfig.icon}
              options={['New task', 'Scheduled', 'In Progress', 'Completed']} 
              onChange={(val) => updateTask(task.id, 'status', val)}
              colorClass={isCompleted ? 'text-green-600 dark:text-green-500' : statusConfig.color}
              getOptionConfig={(opt) => getStatusConfig(opt)}
              openDropdownId={openDropdownId}
              setOpenDropdownId={setOpenDropdownId}
            />
          </div>
          
          {/* Course */}
          <div className={COL.course}>
             <div className="relative custom-dropdown w-full">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === `${task.id}-course` ? null : `${task.id}-course`);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:opacity-80 text-left w-full font-medium py-1 truncate"
                >
                  <CourseIcon type={courseType} />
                  {task.course || "Select"}
                </button>

                {openDropdownId === `${task.id}-course` && (
                  <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-50 overflow-hidden animate-fadeIn">
                    {courses.filter(c => c && c.name).length > 0 ? courses.filter(c => c && c.name).map((c) => (
                      <div 
                        key={c.name} 
                        onClick={() => {
                          updateTask(task.id, 'course', c.name);
                          setOpenDropdownId(null);
                        }}
                        className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-200"
                      >
                        <CourseIcon type={c.type} />
                        <span className="font-medium">{c.name}</span>
                      </div>
                    )) : <div className="p-3 text-xs text-gray-500">No courses added</div>}
                  </div>
                )}
             </div>
          </div>
          
          {/* Due Date */}
          <div className={COL.date}>
             <DateCell 
               date={task.date} 
               onChange={(val) => updateTask(task.id, 'date', val)} 
             />
          </div>
          
          {/* Priority + DELETE BUTTON */}
          <div className={`${COL.priority} flex items-center justify-between pr-4`}>
            <div className="flex-1">
              <Dropdown 
                id={`${task.id}-priority`}
                value={task.priority} 
                icon={priorityConfig.icon} 
                options={['Low', 'Medium', 'High', 'Critical']} 
                onChange={(val) => updateTask(task.id, 'priority', val)}
                colorClass={`font-medium ${priorityConfig.color}`}
                getOptionConfig={(opt) => getPriorityConfig(opt)} 
                openDropdownId={openDropdownId}
                setOpenDropdownId={setOpenDropdownId}
              />
            </div>

            {/* DELETE ACTION - Visible on Hover */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all rounded-full hover:bg-gray-100 dark:hover:bg-[#333]"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
          </div>
      </div>
    );
  };

  const activeTasks = tasks.filter(t => t.status !== 'Completed');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fadeIn">
        <div className="bg-gray-100 dark:bg-[#1E1E1E] p-6 rounded-full mb-4">
          <CheckCircle2 size={48} className="text-gray-400 dark:text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No tasks available</h2>
        <p className="text-gray-500 dark:text-gray-400">Time to relax or add a new task!</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full animate-fadeIn pb-20">
      
      <div className="mb-10">
        <button 
          onClick={() => setShowActive(!showActive)}
          className="flex items-center gap-2 mb-4 group focus:outline-none"
        >
           {showActive ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
           <h2 className="text-gray-800 dark:text-white font-bold text-sm group-hover:text-blue-500 transition-colors">Active tasks</h2>
           <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
             {activeTasks.length}
           </span>
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

            {activeTasks.length > 0 ? (
               activeTasks.map(task => renderRow(task, false))
            ) : (
               <div className="py-12 text-center text-gray-400 dark:text-gray-600 text-sm italic border-b border-gray-100 dark:border-[#1E1E1E]">
                   No active tasks. You are all caught up!
               </div>
            )}
          </>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="animate-fadeIn">
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 mb-4 group focus:outline-none"
          >
             {showCompleted ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
             <h2 className="text-gray-800 dark:text-white font-bold text-sm group-hover:text-blue-500 transition-colors">Completed tasks</h2>
             <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
               {completedTasks.length}
             </span>
          </button>

          {showCompleted && (
             completedTasks.map(task => renderRow(task, true))
          )}
        </div>
      )}

    </div>
  );
};

export default TaskTable;