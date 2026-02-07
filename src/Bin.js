import React from 'react';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

const Bin = ({ deletedTasks, restoreTask, permanentlyDeleteTask, onEmptyBin, onRestoreAll }) => {
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        
        <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold dark:text-white text-gray-800">Recycle Bin</h2>
            <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs px-2 py-1 rounded-full font-medium">
                Auto-delete in 30 days
            </span>
        </div>

        {/* BULK ACTIONS (Only show if bin has items) */}
        {deletedTasks.length > 0 && (
            <div className="flex gap-3">
                <button 
                    onClick={onRestoreAll}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-green-500/20 transition-all active:scale-95"
                >
                    <RefreshCw size={16} /> Restore All
                </button>
                <button 
                    onClick={onEmptyBin}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                    <Trash2 size={16} /> Delete All
                </button>
            </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] shadow-sm overflow-hidden">
        
        <div className="flex text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#2C2C2C] bg-gray-50 dark:bg-[#252525] p-4">
            <div className="flex-1">Task Name</div>
            <div className="w-[200px]">Deleted At</div>
            <div className="w-[150px] text-right">Actions</div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-[#2C2C2C]">
          {deletedTasks.map((task) => (
            <div key={task.id} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors group">
              
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-through opacity-70">
                    {task.name}
                </p>
                <p className="text-xs text-gray-400">{task.course}</p>
              </div>

              <div className="w-[200px] text-sm text-gray-500 dark:text-gray-400">
                {formatDate(task.deletedAt)}
              </div>

              <div className="w-[150px] flex justify-end gap-2">
                <button 
                    onClick={() => restoreTask(task.id)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Restore"
                >
                    <RefreshCw size={16} />
                </button>
                <button 
                    onClick={() => permanentlyDeleteTask(task.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Delete Permanently"
                >
                    <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}

          {deletedTasks.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
                <Trash2 size={48} className="mb-4 opacity-20" />
                <p>Bin is empty.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Bin;