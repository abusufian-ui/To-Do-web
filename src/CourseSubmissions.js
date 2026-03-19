import React from 'react';
import { FileText, Paperclip, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const CourseSubmissions = ({ submissions }) => {
  if (!submissions || submissions.length === 0) {
    return <div className="p-6 text-center text-gray-500">No active submissions.</div>;
  }

  const getStatus = (dueDate, dbStatus) => {
    if (dbStatus.toLowerCase() === 'submitted') return { label: 'Submitted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle };
    const isExpired = new Date() > new Date(dueDate);
    if (isExpired) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle };
    return { label: 'Active', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock };
  };

  return (
    <div className="space-y-4">
      {submissions.map((task, idx) => {
        const status = getStatus(task.dueDate, task.status);
        const StatusIcon = status.icon;

        return (
          <div key={idx} className={`bg-white dark:bg-[#1E1E1E] border rounded-2xl p-5 shadow-sm transition-all ${status.label === 'Expired' ? 'opacity-75 border-red-100 dark:border-red-900/30' : 'border-gray-100 dark:border-[#333]'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${status.color.split(' ')[0]} ${status.color.split(' ')[2] || ''}`}>
                  <FileText size={20} className={status.color.split(' ')[1] || status.color.split(' ')[3]} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{task.title}</h3>
              </div>
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                <StatusIcon size={14} /> <span className="hidden sm:inline">{status.label}</span>
              </span>
            </div>

            <div className="sm:pl-11 pr-4">
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 whitespace-pre-line leading-relaxed">
                {task.description}
              </p>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-[#2C2C2C] gap-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span><strong className="text-gray-700 dark:text-gray-300">Start:</strong> {task.startDate}</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Due:</strong> {task.dueDate}</span>
                </div>
                
                <button className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors w-max">
                  <Paperclip size={16} /> View Attachments
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseSubmissions;