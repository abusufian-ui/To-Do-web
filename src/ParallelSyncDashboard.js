import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, BookOpen } from 'lucide-react';

const ParallelSyncDashboard = ({ courses, statuses, onClose, onRefresh }) => {
  return (
    <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border border-gray-200 dark:border-[#2C2C2C] space-y-6 max-w-4xl mx-auto shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-850 pb-5">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-brand-blue dark:text-blue-400 w-6 h-6 animate-pulse" />
            Parallel Course Materials Sync
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Syncing materials for all your courses concurrently. You can view files as they become ready.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-850 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-450 hover:text-gray-900 dark:hover:text-white transition border border-gray-200 dark:border-slate-800"
              title="Refresh Sync Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-sm font-bold transition shadow-lg shadow-blue-500/20"
          >
            <span>Skip to Viewer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => {
          const status = statuses[course.code] || { isProcessing: false, fileCount: 0, totalFiles: 0, processedFiles: 0 };
          const isProcessing = status.isProcessing;
          const total = status.totalFiles || 0;
          const completed = status.processedFiles || 0;
          const count = status.fileCount || 0;
          const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

          return (
            <div 
              key={course.code || course._id} 
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                isProcessing 
                  ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-500/20 shadow-lg shadow-blue-950/5' 
                  : count > 0 
                    ? 'bg-gray-50/50 dark:bg-slate-800/30 border-gray-200 dark:border-blue-500/15' 
                    : 'bg-gray-50/30 dark:bg-slate-905/20 border-gray-150 dark:border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-gray-800 dark:text-slate-100 text-sm truncate" title={course.name}>
                    {course.name}
                  </h4>
                  <p className="text-xs font-mono text-gray-450 dark:text-slate-500">
                    {course.code} • Section {course.section || 'N/A'}
                  </p>
                </div>
                
                <div className="shrink-0">
                  {isProcessing ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  ) : count > 0 ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-brand-blue dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" />
                      No Files
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-gray-550 dark:text-slate-400">
                  <span>
                    {isProcessing 
                      ? `Downloaded: ${completed}/${total} files` 
                      : count > 0 
                        ? `${count} files available` 
                        : 'Checking portal...'
                    }
                  </span>
                  {isProcessing && total > 0 && (
                    <span className="text-brand-blue dark:text-blue-400 font-bold">{pct}%</span>
                  )}
                </div>

                <div className="w-full bg-gray-100 dark:bg-slate-950/60 rounded-full h-2 overflow-hidden border border-gray-200/50 dark:border-slate-900">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isProcessing 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse' 
                        : count > 0 
                          ? 'bg-brand-blue' 
                          : 'bg-gray-200 dark:bg-slate-800'
                    }`}
                    style={{ width: `${isProcessing ? (total > 0 ? pct : 5) : (count > 0 ? 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ParallelSyncDashboard;
