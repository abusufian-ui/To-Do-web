import React from 'react';
import { FileText, Download, ExternalLink, Clock, CheckCircle, AlertCircle, Calendar, Hourglass } from 'lucide-react';

const CourseSubmissions = ({ submissions }) => {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl shadow-sm">
        <FileText size={48} className="opacity-20 mb-4" />
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">No Active Submissions</h3>
        <p className="text-sm">You are all caught up with your assignments.</p>
      </div>
    );
  }

  // --- TIME REMAINING CALCULATOR ---
  const getTimeLeft = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = due - now;

    if (diff <= 0) return { text: 'Expired', color: 'text-red-500' };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    
    if (days > 0) return { text: `${days}d ${hours}h left`, color: 'text-amber-500 dark:text-amber-400' };
    if (hours > 0) return { text: `${hours}h left`, color: 'text-red-500' };
    return { text: '< 1h left', color: 'text-red-600 animate-pulse' };
  };

  const getStatus = (dueDate, dbStatus) => {
    // Check our new dynamic backend status
    if (dbStatus === 'Submitted') return { label: 'Submitted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle };
    const isExpired = new Date() > new Date(dueDate);
    if (isExpired) return { label: 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800', icon: AlertCircle };
    return { label: 'Active', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Clock };
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {submissions.map((task, idx) => {
        const status = getStatus(task.dueDate, task.status);
        const StatusIcon = status.icon;
        const timeLeft = getTimeLeft(task.dueDate);
        
        const isExpired = status.label === 'Expired';
        const isSubmitted = status.label === 'Submitted';

        const submitLink = task.submissionUrl || "https://horizon.ucp.edu.pk/";
        const attachmentLink = task.attachmentUrl || null;

        return (
          <div key={idx} className={`relative overflow-hidden bg-white dark:bg-[#1E1E1E] border rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${isExpired && !isSubmitted ? 'opacity-75 border-red-100 dark:border-red-900/30' : 'border-gray-100 dark:border-[#333]'}`}>
            
            {/* Status Top Bar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${status.color.split(' ')[0]} ${status.color.split(' ')[2] || ''}`}>
                  <FileText size={24} className={status.color.split(' ')[1] || status.color.split(' ')[3]} />
                </div>
                <div>
                  <h3 className={`text-xl font-black leading-tight mb-1 ${isSubmitted ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${status.color}`}>
                      <StatusIcon size={14} /> {status.label}
                    </span>
                    {status.label === 'Active' && (
                      <span className={`flex items-center gap-1 ${timeLeft.color}`}>
                        <Hourglass size={14} /> {timeLeft.text}
                      </span>
                    )}
                    {status.label === 'Submitted' && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
                        🎉 All done!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description Body */}
            <div className={`rounded-2xl p-4 mb-5 border ${isSubmitted ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : 'bg-gray-50 dark:bg-[#252525] border-gray-100 dark:border-[#2C2C2C]'}`}>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line leading-relaxed">
                {task.description || "No description provided."}
              </p>
            </div>
            
            {/* Footer: Dates & Actions */}
            <div className="flex flex-col lg:flex-row items-center justify-between pt-4 border-t border-gray-100 dark:border-[#2C2C2C] gap-4">
              
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 w-full lg:w-auto">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} /> 
                  <span><strong className="text-gray-700 dark:text-gray-300">Start:</strong> {task.startDate}</span>
                </div>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} />
                  <span><strong className="text-gray-700 dark:text-gray-300">Due:</strong> {task.dueDate}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                {attachmentLink ? (
                  <a href={attachmentLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-[#2C2C2C] text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                    <Download size={16} /> Attachments
                  </a>
                ) : (
                  <span className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[#1A1A1A] text-gray-400 dark:text-gray-600 rounded-xl text-sm font-bold cursor-not-allowed border border-gray-100 dark:border-[#252525]">
                    <Download size={16} /> No File
                  </span>
                )}

                {/* Conditional Submit Button */}
                {isSubmitted ? (
                  <span className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default">
                    <CheckCircle size={16} /> Submitted Successfully
                  </span>
                ) : (
                  <a 
                    href={submitLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                      status.label === 'Active' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25' 
                        : 'bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-[#444]'
                    }`}
                  >
                    <ExternalLink size={16} /> {status.label === 'Active' ? 'Submit on Portal' : 'View on Portal'}
                  </a>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CourseSubmissions;