import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Calendar, AlertCircle, BookOpen, ChevronDown, 
  ChevronsUp, ChevronUp, Minus, ArrowDown, Book 
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const AddTaskModal = ({ isOpen, onClose, onSave, courses }) => {
  const [taskName, setTaskName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  
  // Custom Dropdown States
  const [openDropdown, setOpenDropdown] = useState(null); // 'course' | 'priority' | null
  const dropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskName || !selectedCourse || !dueDate) return;

    onSave({
      name: taskName,
      course: selectedCourse,
      date: dueDate,
      priority: priority,
      status: 'New task'
    });

    setTaskName('');
    setSelectedCourse('');
    setDueDate('');
    setPriority('Medium');
    onClose();
  };

  // --- HELPERS FOR ICONS ---
  const getPriorityIcon = (p) => {
    switch(p) {
      case 'Critical': return <ChevronsUp size={16} className="text-red-500" />;
      case 'High': return <ChevronUp size={16} className="text-orange-500" />;
      case 'Medium': return <Minus size={16} className="text-yellow-500" />;
      case 'Low': return <ArrowDown size={16} className="text-blue-500" />;
      default: return <Minus size={16} />;
    }
  };

  const getCourseIcon = (courseName) => {
    const courseObj = courses.find(c => (typeof c === 'object' ? c.name : c) === courseName);
    if (courseObj && courseObj.type === 'uni') {
      return <UCPLogo className="w-4 h-4 text-blue-500" />;
    }
    return <Book size={16} className="text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#333] overflow-visible transform transition-all scale-100" ref={dropdownRef}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-[#2C2C2C]">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Task Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Task Description</label>
            <input 
              autoFocus
              type="text" 
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Complete Lab Report"
              className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-800 dark:text-white text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Custom Course Select */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select Course</label>
            <button 
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'course' ? null : 'course')}
              className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-800 dark:text-white text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center gap-3">
                {selectedCourse ? getCourseIcon(selectedCourse) : <BookOpen size={16} className="text-gray-400" />}
                <span>{selectedCourse || "Choose a course..."}</span>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {openDropdown === 'course' && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {courses.map(c => {
                   const name = typeof c === 'object' ? c.name : c;
                   if (!name) return null;
                   return (
                     <div 
                       key={name}
                       onClick={() => { setSelectedCourse(name); setOpenDropdown(null); }}
                       className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3E3E3E] cursor-pointer text-sm text-gray-700 dark:text-gray-200 transition-colors"
                     >
                       {getCourseIcon(name)}
                       {name}
                     </div>
                   );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-800 dark:text-white text-sm rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark] cursor-pointer"
                />
              </div>
            </div>

            {/* Custom Priority Select */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <button 
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-800 dark:text-white text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-center gap-3">
                  {getPriorityIcon(priority)}
                  <span>{priority}</span>
                </div>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {openDropdown === 'priority' && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] rounded-lg shadow-xl z-50">
                  {['Low', 'Medium', 'High', 'Critical'].map(p => (
                    <div 
                      key={p}
                      onClick={() => { setPriority(p); setOpenDropdown(null); }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3E3E3E] cursor-pointer text-sm text-gray-700 dark:text-gray-200 transition-colors"
                    >
                      {getPriorityIcon(p)}
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              Create Task
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;