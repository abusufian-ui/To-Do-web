import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Brain, Coffee, Volume2, VolumeX } from 'lucide-react';

const MODES = {
  FOCUS: { id: 'focus', title: 'Deep Focus', minutes: 25, color: 'text-brand-blue', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Brain },
  SHORT_BREAK: { id: 'short_break', title: 'Short Break', minutes: 5, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: Coffee },
  LONG_BREAK: { id: 'long_break', title: 'Long Break', minutes: 30, color: 'text-brand-pink', bg: 'bg-pink-50 dark:bg-pink-900/20', icon: Coffee }
};

const HyperFocus = () => {
  const [currentMode, setCurrentMode] = useState(MODES.FOCUS);
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Use a generic bell sound for notifications
  const alarmSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

  const playAlarm = useCallback(() => {
    if (soundEnabled) {
      alarmSound.play().catch(e => console.log("Audio play failed:", e));
    }
    if (Notification.permission === 'granted') {
      new Notification('Hyper Focus Timer', {
        body: `${currentMode.title} session complete!`,
        icon: '/favicon.ico'
      });
    }
  }, [soundEnabled, currentMode.title]);

  const handleModeComplete = useCallback(async () => {
    playAlarm();
    setIsActive(false);

    // Track the session to backend
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/focus-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          durationMinutes: currentMode.minutes,
          type: currentMode.id
        })
      });
    } catch (e) { console.error("Failed to save session"); }

    // Logic for next phase
    if (currentMode.id === MODES.FOCUS.id) {
      const newCycles = cyclesCompleted + 1;
      setCyclesCompleted(newCycles);
      if (newCycles % 4 === 0) {
        switchMode(MODES.LONG_BREAK);
      } else {
        switchMode(MODES.SHORT_BREAK);
      }
    } else {
      switchMode(MODES.FOCUS);
    }
  }, [currentMode, cyclesCompleted, playAlarm]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleModeComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleModeComplete]);

  // Request notification permissions on mount
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const switchMode = (mode) => {
    setCurrentMode(mode);
    setTimeLeft(mode.minutes * 60);
    setIsActive(false);
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(currentMode.minutes * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((currentMode.minutes * 60 - timeLeft) / (currentMode.minutes * 60)) * 100;
  const ModeIcon = currentMode.icon;

  return (
    <div className="w-full max-w-lg mx-auto p-8 bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#333] mt-10 transition-colors">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Hyper Focus
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stay productive, block distractions.</p>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-full bg-gray-100 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Mode Selectors */}
      <div className="flex gap-2 mb-8 bg-gray-50 dark:bg-[#121212] p-1.5 rounded-2xl">
        {Object.values(MODES).map((mode) => (
          <button
            key={mode.id}
            onClick={() => switchMode(mode)}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${currentMode.id === mode.id ? 'bg-white dark:bg-[#2C2C2C] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {mode.title}
          </button>
        ))}
      </div>

      {/* Main Timer Display */}
      <div className={`flex flex-col items-center justify-center py-12 rounded-3xl border-2 transition-colors ${currentMode.bg} ${currentMode.border}`}>
        <ModeIcon size={32} className={`mb-4 ${currentMode.color}`} />
        <h1 className="text-7xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
          {formatTime(timeLeft)}
        </h1>
        
        {/* Simple Progress Bar */}
        <div className="w-48 h-1.5 bg-gray-200 dark:bg-[#333] rounded-full mt-8 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${currentMode.id === 'focus' ? 'bg-brand-blue' : currentMode.id === 'short_break' ? 'bg-emerald-500' : 'bg-brand-pink'}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Cycle Tracker */}
      <div className="flex justify-center items-center gap-3 mt-8">
        {[1, 2, 3, 4].map((dot) => (
          <div 
            key={dot} 
            className={`w-3 h-3 rounded-full transition-colors ${cyclesCompleted % 4 >= dot || (cyclesCompleted > 0 && cyclesCompleted % 4 === 0) ? 'bg-brand-blue' : 'bg-gray-200 dark:bg-[#333]'}`}
          />
        ))}
      </div>
      <p className="text-center text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">
        Cycle {Math.floor(cyclesCompleted / 4) + 1}
      </p>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <button 
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 ${isActive ? 'bg-gray-900 hover:bg-gray-800 dark:bg-[#333] dark:hover:bg-[#444]' : 'bg-brand-blue hover:bg-blue-600'}`}
        >
          {isActive ? <Pause size={20} /> : <Play size={20} />}
          {isActive ? 'Pause' : 'Start Focus'}
        </button>
        <button 
          onClick={resetTimer}
          className="p-4 rounded-2xl bg-gray-100 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3E3E3E] transition-all active:scale-95"
        >
          <RotateCcw size={20} />
        </button>
      </div>

    </div>
  );
};

export default HyperFocus;