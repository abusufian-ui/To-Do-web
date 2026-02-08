import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Trash2, AlignLeft, ListTodo, Calendar, 
  Flag, Book, Mail, Clock, CheckCircle2, 
  ChevronsUp, ChevronUp, ChevronDown, Minus, ArrowDown 
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const AddTaskModal = ({ isOpen, onClose, onSave, courses }) => {
  // CHANGED: Initial state is now empty '' instead of courses[0]
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState(''); 
  const [status, setStatus] = useState('New task');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [subTasks, setSubTasks] = useState([]);
  const [subTaskInput, setSubTaskInput] = useState('');

  // Custom Dropdown State
  const [showCourseList, setShowCourseList] = useState(false);
  const courseDropdownRef = useRef(null);

  // REMOVED: The useEffect that was auto-selecting the first course has been deleted.

  // Close dropdown when clicking outside
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

  // ICON HELPERS
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

  const currentCourseObj = courses.find(c => c.name === course);
  const isUniCourse = currentCourseObj?.type === 'uni';

  const handleAddSubTask = () => {
    if (subTaskInput.trim()) {
      setSubTasks([...subTasks, { text: subTaskInput, completed: false }]);
      setSubTaskInput('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Please enter a task name");
    if (!course) return alert("Please select a course"); // Validation ensures user picks one
    
    onSave({ name, description, course, date, priority, status, subTasks });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName(''); 
    setDescription(''); 
    setCourse(''); // CHANGED: Reset to empty so next task starts fresh
    setStatus('New task'); 
    setDate(''); 
    setPriority('Medium'); 
    setSubTasks([]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white text-gray-800 flex items-center gap-2">
            <Plus className="text-brand-blue" size={20} /> Add New Task
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* TASK NAME */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Task Name</label>
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Prepare for OS Quiz"
              className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none border-none focus:ring-offset-0"
            />
          </div>

          {/* STATUS SELECTOR */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['New task', 'Scheduled', 'In Progress', 'Completed'].map(s => (
                <button
                  key={s} onClick={() => setStatus(s)}
                  className={`flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold rounded-lg border transition-all ${
                    status === s 
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue' 
                      : 'border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {getStatusIcon(s)} {s}
                </button>
              ))}
            </div>
          </div>

          {/* GRID: COURSE & DATE */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* --- CUSTOM COURSE DROPDOWN --- */}
            <div className="relative" ref={courseDropdownRef}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <Book size={14} /> Course
              </label>
              <button 
                type="button"
                onClick={() => setShowCourseList(!showCourseList)}
                className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
              >
                <span className="flex items-center gap-2 truncate">
                   {/* If selected, show correct icon. If empty, show gray book */}
                   {isUniCourse ? <UCPLogo className="w-4 h-4" /> : <Book size={16} className="text-gray-400" />}
                   
                   {/* Show 'Select Course' if empty, otherwise show selected name */}
                   {course || <span className="text-gray-400">Select Course</span>}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCourseList ? 'rotate-180' : ''}`} />
              </button>

              {showCourseList && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn custom-scrollbar max-h-[200px] overflow-y-auto">
                  {courses.length > 0 ? (
                    courses.map(c => (
                      <div 
                        key={c.id || c._id || c.name}
                        onClick={() => { setCourse(c.name); setShowCourseList(false); }}
                        className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-t border-gray-100 dark:border-[#2C2C2C] first:border-none"
                      >
                        <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                          {c.type === 'uni' ? <UCPLogo className="w-4 h-4" /> : <Book size={16} className="text-gray-400" />}
                          {c.name}
                        </span>
                        {course === c.name && <CheckCircle2 size={16} className="text-brand-blue" />}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-500 italic">No courses found. Add some in Settings!</div>
                  )}
                </div>
              )}
            </div>

            {/* DATE INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <Calendar size={14} /> Due Date
              </label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* PRIORITY */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Priority</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High', 'Critical'].map(p => (
                <button
                  key={p} onClick={() => setPriority(p)}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-2 text-[11px] font-bold rounded-lg border transition-all ${
                    priority === p 
                      ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-500/20' 
                      : 'border-gray-200 dark:border-[#2C2C2C] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'
                  }`}
                >
                  {getPriorityIcon(p)} {p}
                </button>
              ))}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
              <AlignLeft size={14} /> Description
            </label>
            <textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Add project details..." rows="2"
              className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#2C2C2C] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none resize-none"
            />
          </div>

          {/* SUB-TASKS */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#2C2C2C]">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
              <ListTodo size={14} /> Sub-Tasks
            </label>
            <div className="space-y-2 mb-4">
              {subTasks.map((st, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-[#121212] p-3 rounded-xl border border-gray-100 dark:border-[#2C2C2C]">
                  <span className="text-sm dark:text-gray-300">{st.text}</span>
                  <button onClick={() => setSubTasks(subTasks.filter((_, i) => i !== index))} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 group/input">
              <input 
                type="text" value={subTaskInput}
                onChange={(e) => setSubTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
                placeholder="Add a step..."
                className="flex-1 bg-transparent border-b border-gray-200 dark:border-[#2C2C2C] focus:border-brand-blue px-1 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-0"
              />
              <button onClick={handleAddSubTask} className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue hover:bg-brand-blue hover:text-white transition-all">
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-[#2C2C2C] flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all">
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;