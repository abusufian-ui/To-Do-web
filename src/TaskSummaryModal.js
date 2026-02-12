import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Flag, Book, CheckSquare, AlignLeft, Info, 
  Edit2, Save, Clock, CheckCircle2 
} from 'lucide-react';

// --- HELPERS ---
const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const getPriorityColor = (p) => {
  switch(p) {
    case 'Critical': return 'text-red-500 bg-red-500/10';
    case 'High': return 'text-orange-500 bg-orange-500/10';
    case 'Medium': return 'text-yellow-500 bg-yellow-500/10';
    case 'Low': return 'text-blue-500 bg-blue-500/10';
    default: return 'text-gray-500 bg-gray-500/10';
  }
};

const TaskSummaryModal = ({ isOpen, onClose, task, courses, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [includeTime, setIncludeTime] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    priority: '',
    status: '',
    course: ''
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
    if (onUpdate) {
      // Only update fields that changed
      if (form.name !== task.name) onUpdate(task.id, 'name', form.name);
      if (form.description !== task.description) onUpdate(task.id, 'description', form.description);
      if (form.date !== task.date) onUpdate(task.id, 'date', form.date);
      
      const timeToSave = includeTime ? form.time : null;
      if (timeToSave !== task.time) onUpdate(task.id, 'time', timeToSave);

      if (form.priority !== task.priority) onUpdate(task.id, 'priority', form.priority);
      if (form.status !== task.status) onUpdate(task.id, 'status', form.status);
      if (form.course !== task.course) onUpdate(task.id, 'course', form.course);
    }
    setIsEditing(false);
  };

  const showTimeCell = isEditing ? includeTime : !!task.time;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#2C2C2C] animate-slideUp flex flex-col max-h-[90vh]">
        
        {/* CUSTOM SCROLLBAR CSS (Applies to Body & Textarea) */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
        `}</style>

        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-blue/10 rounded-xl">
               <Info className="text-brand-blue" size={20} />
             </div>
             <h2 className="text-xl font-bold dark:text-white text-gray-800">
               {isEditing ? 'Edit Task' : 'Task Summary'}
             </h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={isEditing ? handleSave : () => setIsEditing(true)} 
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${isEditing ? 'bg-brand-blue text-white hover:bg-blue-600' : 'hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-gray-500 dark:text-gray-400'}`}
              title={isEditing ? "Save Changes" : "Edit Task"}
            >
              {isEditing ? <Save size={18} /> : <Edit2 size={18} />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors text-gray-500 dark:text-gray-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT (Scrollable) */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
          
          {/* TITLE & DESCRIPTION */}
          <div className="mb-8">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Title</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full text-xl font-bold bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none focus:border-brand-blue dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Description</label>
                  <textarea 
                    rows={6}
                    value={form.description} 
                    onChange={(e) => setForm({...form, description: e.target.value})}
                    className="w-full text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 outline-none focus:border-brand-blue dark:text-gray-300 resize-none custom-scrollbar"
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{task.name}</h1>
                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <AlignLeft size={18} className="mt-1 flex-shrink-0" />
                  <p className="text-sm leading-relaxed italic whitespace-pre-wrap">
                    {task.description || "No description provided for this task."}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* INFO GRID */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Created Date */}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="text-gray-400" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Created:</span>
                <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-3 text-sm h-9">
                <Calendar className="text-brand-pink shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Due Date:</span>
                {isEditing ? (
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={(e) => setForm({...form, date: e.target.value})}
                    className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" 
                  />
                ) : (
                  <span className="dark:text-gray-200 font-medium">{task.date || "No date set"}</span>
                )}
              </div>

              {/* Time Logic (Add/Remove) */}
              {showTimeCell || isEditing ? (
                <div className="flex items-center gap-3 text-sm h-9">
                  <Clock className="text-purple-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-16 shrink-0">Time:</span>
                  
                  {isEditing ? (
                    includeTime ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          type="time" 
                          value={form.time} 
                          onChange={(e) => setForm({...form, time: e.target.value})}
                          className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white dark:[color-scheme:dark]" 
                        />
                        <button onClick={() => setIncludeTime(false)} className="text-[10px] text-red-500 hover:underline font-bold">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => setIncludeTime(true)} className="text-xs text-brand-blue font-bold hover:underline py-1 px-2 bg-blue-50 dark:bg-blue-900/20 rounded">+ Add Time</button>
                    )
                  ) : (
                    <span className="dark:text-gray-200 font-medium">{task.time ? formatTime(task.time) : "All Day"}</span>
                  )}
                </div>
              ) : null}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              
              {/* Priority */}
              <div className="flex items-center gap-3 text-sm h-9">
                <Flag className="text-orange-500 shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Priority:</span>
                {isEditing ? (
                  <select 
                    value={form.priority} 
                    onChange={(e) => setForm({...form, priority: e.target.value})}
                    className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white"
                  >
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <span className={`font-medium px-2 py-0.5 rounded-md text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                )}
              </div>

              {/* Course */}
              <div className="flex items-center gap-3 text-sm h-9">
                <Book className="text-brand-blue shrink-0" size={16} />
                <span className="text-gray-500 w-16 shrink-0">Course:</span>
                {isEditing ? (
                  <select 
                    value={form.course} 
                    onChange={(e) => setForm({...form, course: e.target.value})}
                    className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white"
                  >
                    {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                ) : (
                  <span className="dark:text-gray-200 font-medium truncate" title={task.course}>{task.course}</span>
                )}
              </div>

              {/* Status (Edit Only) */}
              {isEditing && (
                 <div className="flex items-center gap-3 text-sm h-9">
                   <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                   <span className="text-gray-500 w-16 shrink-0">Status:</span>
                   <select 
                     value={form.status} 
                     onChange={(e) => setForm({...form, status: e.target.value})}
                     className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded px-2 py-1 text-xs outline-none focus:border-brand-blue dark:text-white"
                   >
                     {['New task', 'Scheduled', 'In Progress', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
              )}
            </div>
          </div>

          {/* SUB-TASKS SUMMARY */}
          <div className="bg-gray-50 dark:bg-[#181818] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C]">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckSquare size={16} /> Sub Tasks
            </h3>
            <div className="space-y-3">
              {task.subTasks?.map((sub, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${sub.completed ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <span className={sub.completed ? 'line-through text-gray-500' : 'dark:text-gray-300'}>{sub.text}</span>
                </div>
              ))}
              {(!task.subTasks || task.subTasks.length === 0) && (
                <p className="text-xs text-gray-500 italic">No sub-tasks added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSummaryModal;