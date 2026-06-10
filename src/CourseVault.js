import React from 'react';
import { Lock } from 'lucide-react';

const CourseVault = () => {
  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="relative w-full max-w-md bg-white/50 dark:bg-black/30 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-white/10 p-8 md:p-12 shadow-xl text-center transition-all duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
            <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Course Vault
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Under Development
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseVault;
