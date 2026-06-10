import React from 'react';
import { Shield, Sparkles, Lock, Terminal, Cpu, Flame, Layers } from 'lucide-react';

const CourseVault = () => {
  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white/5 dark:bg-black/40 backdrop-blur-2xl rounded-[2.5rem] border border-gray-200/20 dark:border-white/5 p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-300">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse delay-1000"></div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Left Side: Animated SVG Visuals */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <div className="w-44 h-44 md:w-56 md:h-56 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center relative border border-indigo-500/20 shadow-[0_0_60px_rgba(99,102,241,0.1)] group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* Rotating outer ring */}
              <div className="absolute w-36 h-36 border-2 border-dashed border-indigo-500/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
              
              {/* Inner glowing lock */}
              <div className="relative z-10 w-24 h-24 bg-white dark:bg-dark-surface rounded-3xl flex items-center justify-center border border-gray-100 dark:border-dark-border shadow-2xl transition-transform duration-500 group-hover:scale-110">
                <Lock className="w-10 h-10 text-indigo-500 animate-pulse" />
              </div>

              {/* Floating stars/dots */}
              <Sparkles className="absolute top-8 right-8 w-5 h-5 text-indigo-400 animate-bounce" />
              <Cpu className="absolute bottom-8 left-8 w-5 h-5 text-purple-400 animate-pulse" />
            </div>

            {/* Simulated Terminal Status Indicator */}
            <div className="mt-6 px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-left font-mono text-[10px] text-indigo-400 flex items-center gap-2 shadow-lg w-full max-w-[240px]">
              <Terminal size={12} className="text-indigo-400" />
              <span className="flex-1">STATUS: ENCRYPT_DEV_PHASE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
          </div>

          {/* Right Side: Feature Information & Excitement Text */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-widest font-mono">
              <Flame size={12} className="animate-pulse" />
              Under Active Inception
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                Crowdsourced <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                  Course Vault
                </span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
                We are building the ultimate secure study hub. Soon, you'll be able to access premium student-sourced slides, lecture notes, and study papers in a protected workspace.
              </p>
            </div>

            {/* Bullet List of Premium Future Features */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/10 shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Anti-Theft Secure Canvas</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Files will render in an encrypted canvas with screenshots and downloads blocked to prevent leakage.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/10 shrink-0">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Inter-Section Notes Exchange</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cross-reference notes and study materials uploaded by top-performing peers across all class sections.</p>
                </div>
              </div>
            </div>

            {/* Active Development Simulated Progress Bar */}
            <div className="pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
                <span>Refining Anti-Leak Shield</span>
                <span className="text-indigo-400 font-mono">75% Complete</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-[#1E1E1E] rounded-full overflow-hidden border border-gray-300/10">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-[progressShim_3s_ease-in-out_infinite]" style={{ width: '75%' }}></div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <style>{`
        @keyframes progressShim {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; filter: brightness(1.2); }
        }
      `}</style>
    </div>
  );
};

export default CourseVault;
