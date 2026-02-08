import React from 'react';
import { X, Calendar, Flag, Book, CheckSquare, AlignLeft, Info } from 'lucide-react';

const TaskSummaryModal = ({ isOpen, onClose, task, courses }) => {
  if (!isOpen || !task) return null;

  const currentCourse = courses.find(c => c.name === task.course);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#2C2C2C] animate-slideUp">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-blue/10 rounded-xl">
               <Info className="text-brand-blue" size={20} />
             </div>
             <h2 className="text-xl font-bold dark:text-white text-gray-800">Task Summary</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* TITLE & DESCRIPTION */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">{task.name}</h1>
            <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
              <AlignLeft size={18} className="mt-1 flex-shrink-0" />
              <p className="text-sm leading-relaxed italic">
                {task.description || "No description provided for this task."}
              </p>
            </div>
          </div>

          {/* INFO GRID */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="text-gray-400" size={16} />
                <span className="text-gray-500">Created:</span>
                <span className="dark:text-gray-200 font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="text-brand-pink" size={16} />
                <span className="text-gray-500">Due Date:</span>
                <span className="dark:text-gray-200 font-medium">{task.date || "No date set"}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Flag className="text-orange-500" size={16} />
                <span className="text-gray-500">Priority:</span>
                <span className="dark:text-gray-200 font-medium px-2 py-0.5 bg-orange-500/10 rounded-md text-orange-500">{task.priority}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Book className="text-brand-blue" size={16} />
                <span className="text-gray-500">Course:</span>
                <span className="dark:text-gray-200 font-medium">{task.course}</span>
              </div>
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