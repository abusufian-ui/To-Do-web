import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, BookOpen } from 'lucide-react';

const ParallelSyncDashboard = ({ courses, statuses, onClose, onRefresh }) => {
  return (
    <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 space-y-6 max-w-4xl mx-auto shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="text-purple-400 w-6 h-6 animate-pulse" />
            Parallel Course Materials Sync
          </h3>
          <p className="text-sm text-slate-400">
            Syncing materials for all your courses concurrently. You can view files as they become ready.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-450 hover:text-white transition border border-slate-800"
              title="Refresh Sync Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition shadow-lg shadow-purple-650/20"
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
                  ? 'bg-purple-950/10 border-purple-500/20 shadow-lg shadow-purple-950/5' 
                  : count > 0 
                    ? 'bg-emerald-950/5 border-emerald-500/10 shadow-lg shadow-emerald-950/5' 
                    : 'bg-slate-900/20 border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-slate-100 text-sm truncate" title={course.name}>
                    {course.name}
                  </h4>
                  <p className="text-xs font-mono text-slate-505">
                    {course.code} • Section {course.section || 'N/A'}
                  </p>
                </div>
                
                {/* Status Badge & Icon */}
                <div className="shrink-0">
                  {isProcessing ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Syncing
                    </div>
                  ) : count > 0 ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3" />
                      No Files
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar & Counter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                  <span>
                    {isProcessing 
                      ? `Downloaded: ${completed}/${total} files` 
                      : count > 0 
                        ? `${count} files available` 
                        : 'Checking portal...'
                    }
                  </span>
                  {isProcessing && total > 0 && (
                    <span className="text-purple-400 font-bold">{pct}%</span>
                  )}
                </div>

                <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-slate-900">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isProcessing 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse' 
                        : count > 0 
                          ? 'bg-emerald-500' 
                          : 'bg-slate-800'
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
