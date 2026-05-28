import React from 'react';
import { Play, Square, Volume2, VolumeX, Sparkles, Activity, FastForward } from 'lucide-react';

const HyperFocus = ({ hfState, toggleAutomation, setSoundEnabled, hfModes, skipPhase }) => {
  
  // Safely fallback using optional chaining
  const modeKey = hfState?.modeId || 'focus';
  const currentMode = hfModes?.[modeKey] || hfModes?.['focus'];
  
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const size = 220; 
  const center = size / 2;
  const radius = 100; 
  const strokeWidth = 8; 
  const circumference = 2 * Math.PI * radius;
  const totalPhaseTime = (currentMode?.minutes || 25) * 60;
  const progressOffset = circumference - ((totalPhaseTime - (hfState?.timeLeft || 0)) / totalPhaseTime) * circumference;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#121212] transition-colors relative overflow-y-auto overflow-x-hidden custom-scrollbar">
      
      {hfState?.isAutomated && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 ease-in-out"
          style={{ background: `radial-gradient(circle at center, ${currentMode?.color || '#3B82F6'} 0%, transparent 60%)` }}
        />
      )}

      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10">
        <button 
          onClick={() => setSoundEnabled(!hfState?.soundEnabled)}
          className="p-2 sm:p-2.5 rounded-full bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] shadow-sm transition-colors border border-gray-200 dark:border-[#333]"
        >
          {hfState?.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      <div className="text-center mb-6 mt-12 sm:mt-0 z-10">
        <div className="flex justify-center items-center gap-2 mb-1.5">
          {hfState?.isAutomated ? <Activity className={`${currentMode?.textClass || 'text-blue-500'} animate-pulse`} size={20} /> : <Sparkles className="text-brand-blue" size={20} />}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
          Hyper Focus Engine
        </h1>
        <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1.5 max-w-sm mx-auto px-4">
          {hfState?.isAutomated 
            ? "Automation active. Follow the cycle, ignore the noise." 
            : "Turn on the engine to begin a fully automated Pomodoro flow."}
        </p>
      </div>

      <div className={`relative flex items-center justify-center mb-6 transition-all duration-700 ${hfState?.isAutomated ? (currentMode?.glow || '') : ''} rounded-full`}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle 
            cx={center} cy={center} r={radius} 
            stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
            className="text-gray-200 dark:text-[#2C2C2C]" 
          />
          <circle 
            cx={center} cy={center} r={radius} 
            stroke={currentMode?.color || '#3B82F6'} strokeWidth={strokeWidth} fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={progressOffset} 
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear" 
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <h2 className="text-4xl sm:text-5xl font-black tabular-nums text-gray-900 dark:text-white tracking-tighter">
            {formatTime(hfState?.timeLeft)}
          </h2>
          <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mt-1 ${currentMode?.textClass || 'text-blue-500'}`}>
            {currentMode?.title || 'Deep Focus'}
          </p>
          <p className="text-[8px] sm:text-[9px] font-medium text-gray-400 mt-1 max-w-[120px] leading-tight px-2">
            {currentMode?.text || 'Immerse yourself.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center z-10 mb-8">
        <div className="flex gap-2.5 sm:gap-3">
          {[1, 2, 3, 4].map((dot) => {
            const completed = hfState?.cyclesCompleted || 0;
            const isCompleted = completed % 4 >= dot || (completed > 0 && completed % 4 === 0);
            const isCurrent = hfState?.isAutomated && hfState?.modeId === 'focus' && (completed % 4) + 1 === dot;
            return (
              <div 
                key={dot} 
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-500 
                  ${isCompleted ? 'bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 
                    isCurrent ? 'bg-brand-blue animate-ping' : 'bg-gray-300 dark:bg-[#333]'}`}
              />
            );
          })}
        </div>
        <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2.5">
          Cycle Stage {Math.floor((hfState?.cyclesCompleted || 0) / 4) + 1}
        </span>
      </div>

      {/* Master Controls Group */}
      <div className="flex flex-col items-center gap-4 z-10">
        <button 
          onClick={toggleAutomation}
          className={`flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-black text-xs sm:text-sm tracking-wider text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${
            hfState?.isAutomated 
              ? 'bg-gray-900 hover:bg-gray-800 dark:bg-[#252525] dark:hover:bg-[#333]' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30'
          }`}
        >
          {hfState?.isAutomated ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
          {hfState?.isAutomated ? 'STOP AUTOMATION' : 'START AUTOMATION'}
        </button>

        {/* Skip Break Button (Animated Reveal) */}
        <div className={`transition-all duration-500 ${hfState?.isAutomated && hfState?.modeId === 'short_break' ? 'opacity-100 h-10' : 'opacity-0 h-0 overflow-hidden'}`}>
          <button 
            onClick={skipPhase}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold tracking-wider text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm hover:shadow transition-all"
          >
            <FastForward size={14} className="fill-current" /> SKIP BREAK
          </button>
        </div>
      </div>

    </div>
  );
};

export default HyperFocus;