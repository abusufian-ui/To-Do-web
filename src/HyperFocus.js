import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Activity, 
  FastForward, 
  Clock, 
  Flame, 
  Target, 
  TrendingUp, 
  BarChart3,
  Settings,
  Calendar,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_GOALS = {
  Mon: { goal: 60, isOff: false },
  Tue: { goal: 60, isOff: false },
  Wed: { goal: 60, isOff: false },
  Thu: { goal: 60, isOff: false },
  Fri: { goal: 60, isOff: false },
  Sat: { goal: 30, isOff: false },
  Sun: { goal: 0, isOff: true } 
};

const HyperFocus = ({ hfState, toggleAutomation, resetAutomation, setSoundEnabled, hfModes, skipPhase }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('week'); 
  const lastScrollTime = useRef(0);

  
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('hfWeeklyGoals');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return DEFAULT_GOALS;
  });
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [tempGoals, setTempGoals] = useState({});

  
  const modeKey = hfState?.modeId || 'focus';
  const currentMode = hfModes?.[modeKey] || hfModes?.['focus'];

  
  useEffect(() => {
    const fetchSessions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/focus-sessions`, {
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [hfState?.cyclesCompleted]);

  
  const formatHoursMinutes = (totalMins) => {
    if (totalMins === undefined || totalMins === null || isNaN(totalMins)) return "0m";
    const rounded = Math.round(totalMins);
    const hrs = Math.floor(rounded / 60);
    const mins = rounded % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  
  const focusSessions = sessions.filter(s => s.type === 'focus');
  const totalMinutes = focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyMinutes = focusSessions
    .filter(s => {
      const d = new Date(s.completedAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  const averageDuration = focusSessions.length > 0 ? Math.round(totalMinutes / focusSessions.length) : 0;
  
  
  const productivityBoost = totalMinutes > 0 ? Math.min(95, Math.round(totalMinutes * 0.35 + focusSessions.length * 3)) : 0;

  
  const getDayName = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  
  const currentDayName = getDayName(new Date());
  const todayGoalObj = goals[currentDayName] || DEFAULT_GOALS[currentDayName] || { goal: 60, isOff: false };
  const isTodayOff = todayGoalObj.isOff;
  const todayGoalMinutes = todayGoalObj.goal;

  
  const todayMinutes = focusSessions
    .filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString())
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  let goalProgress = 0;
  if (isTodayOff) {
    goalProgress = 100; 
  } else if (todayGoalMinutes > 0) {
    goalProgress = Math.min(100, Math.round((todayMinutes / todayGoalMinutes) * 100));
  }

  
  const handleChartWheel = (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastScrollTime.current < 450) return; 

    if (e.deltaY > 0) {
      
      if (chartView === 'day') {
        setChartView('week');
        lastScrollTime.current = now;
      } else if (chartView === 'week') {
        setChartView('month');
        lastScrollTime.current = now;
      }
    } else {
      
      if (chartView === 'month') {
        setChartView('week');
        lastScrollTime.current = now;
      } else if (chartView === 'week') {
        setChartView('day');
        lastScrollTime.current = now;
      }
    }
  };

  
  const getDayData = () => {
    const slots = [
      { label: '12-3 AM', hours: [0, 1, 2], minutes: 0 },
      { label: '3-6 AM', hours: [3, 4, 5], minutes: 0 },
      { label: '6-9 AM', hours: [6, 7, 8], minutes: 0 },
      { label: '9-12 PM', hours: [9, 10, 11], minutes: 0 },
      { label: '12-3 PM', hours: [12, 13, 14], minutes: 0 },
      { label: '3-6 PM', hours: [15, 16, 17], minutes: 0 },
      { label: '6-9 PM', hours: [18, 19, 20], minutes: 0 },
      { label: '9-12 AM', hours: [21, 22, 23], minutes: 0 }
    ];

    sessions.forEach(session => {
      if (session.type !== 'focus') return;
      const sDate = new Date(session.completedAt);
      if (sDate.toDateString() !== new Date().toDateString()) return;

      const hour = sDate.getHours();
      const match = slots.find(slot => slot.hours.includes(hour));
      if (match) {
        match.minutes += session.durationMinutes;
      }
    });

    return slots.map(s => ({
      label: s.label,
      minutes: Math.round(s.minutes)
    }));
  };

  
  const getWeeklyData = () => {
    const data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toDateString();
      data.push({
        label: dayName,
        dateStr,
        minutes: 0
      });
    }

    sessions.forEach(session => {
      if (session.type !== 'focus') return;
      const sessionDateStr = new Date(session.completedAt).toDateString();
      const match = data.find(item => item.dateStr === sessionDateStr);
      if (match) {
        match.minutes += session.durationMinutes;
      }
    });

    return data.map(item => ({
      label: item.label,
      minutes: Math.round(item.minutes)
    }));
  };

  
  const getMonthData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const end = new Date();
      end.setDate(now.getDate() - i * 5);
      const start = new Date();
      start.setDate(now.getDate() - (i * 5 + 4));
      
      const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { day: 'numeric' })}`;
      data.push({
        label,
        startDate: new Date(start.setHours(0,0,0,0)),
        endDate: new Date(end.setHours(23,59,59,999)),
        minutes: 0
      });
    }

    sessions.forEach(session => {
      if (session.type !== 'focus') return;
      const sDate = new Date(session.completedAt);
      const match = data.find(item => sDate >= item.startDate && sDate <= item.endDate);
      if (match) {
        match.minutes += session.durationMinutes;
      }
    });

    return data.map(item => ({
      label: item.label,
      minutes: Math.round(item.minutes)
    }));
  };

  const getActiveChartData = () => {
    if (chartView === 'day') return getDayData();
    if (chartView === 'month') return getMonthData();
    return getWeeklyData();
  };

  const activeChartData = getActiveChartData();

  
  const openGoalModal = () => {
    setTempGoals(JSON.parse(JSON.stringify(goals)));
    setIsGoalModalOpen(true);
  };

  const handleToggleOff = (day) => {
    setTempGoals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOff: !prev[day].isOff
      }
    }));
  };

  const handleHourChange = (day, hrs) => {
    setTempGoals(prev => {
      const currentMin = prev[day].goal % 60;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          goal: hrs * 60 + currentMin
        }
      };
    });
  };

  const handleMinChange = (day, mins) => {
    setTempGoals(prev => {
      const currentHrs = Math.floor(prev[day].goal / 60);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          goal: currentHrs * 60 + mins
        }
      };
    });
  };

  const saveWeeklyGoals = () => {
    setGoals(tempGoals);
    localStorage.setItem('hfWeeklyGoals', JSON.stringify(tempGoals));
    setIsGoalModalOpen(false);
  };

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

  
  const isTimerDirty = hfState?.timeLeft !== totalPhaseTime || (hfState?.cyclesCompleted || 0) > 0;

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-[#121212] transition-colors relative overflow-y-auto custom-scrollbar p-4 md:p-8">
      {hfState?.isAutomated && (
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 ease-in-out"
          style={{ background: `radial-gradient(circle at 30% 30%, ${currentMode?.color || '#3B82F6'} 0%, transparent 60%)` }}
        />
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
          
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => setSoundEnabled(!hfState?.soundEnabled)}
              className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333] transition-colors border border-gray-200/50 dark:border-[#333]/50"
              title={hfState?.soundEnabled ? "Mute Alert" : "Unmute Alert"}
            >
              {hfState?.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          <div className="text-center mb-6 mt-4">
            <div className="flex justify-center items-center gap-2 mb-2">
              {hfState?.isAutomated ? (
                <Activity className={`${currentMode?.textClass || 'text-blue-500'} animate-pulse`} size={20} />
              ) : (
                <Sparkles className="text-blue-500" size={20} />
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Focus Engine
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 max-w-[240px] mx-auto leading-normal">
              {hfState?.isAutomated 
                ? "Automation active. Stay immersed, ignore the noise." 
                : "Initiate the engine to trigger a smooth Pomodoro flow."}
            </p>
          </div>

          <div className={`relative flex items-center justify-center mb-6 transition-all duration-700 ${hfState?.isAutomated ? (currentMode?.glow || '') : ''} rounded-full`}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle 
                cx={center} cy={center} r={radius} 
                stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
                className="text-gray-150 dark:text-[#2C2C2C]" 
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
              <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mt-1.5 ${currentMode?.textClass || 'text-blue-500'}`}>
                {currentMode?.title || 'Deep Focus'}
              </p>
              <p className="text-[8px] sm:text-[9px] font-medium text-gray-400 mt-1 max-w-[120px] leading-tight px-2">
                {currentMode?.text || 'Immerse yourself.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="flex gap-2.5">
              {[1, 2, 3, 4].map((dot) => {
                const completed = hfState?.cyclesCompleted || 0;
                const isCompleted = completed % 4 >= dot || (completed > 0 && completed % 4 === 0);
                const isCurrent = hfState?.isAutomated && hfState?.modeId === 'focus' && (completed % 4) + 1 === dot;
                return (
                  <div 
                    key={dot} 
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 
                      ${isCompleted ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 
                        isCurrent ? 'bg-blue-500 animate-pulse scale-125' : 'bg-gray-300 dark:bg-[#333]'}`}
                  />
                );
              })}
            </div>
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-3">
              Cycle Stage {Math.floor((hfState?.cyclesCompleted || 0) / 4) + 1}
            </span>
          </div>

          {}
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex gap-3 w-full justify-center">
              <button 
                onClick={toggleAutomation}
                className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  hfState?.isAutomated 
                    ? 'bg-gray-800 hover:bg-gray-700 dark:bg-[#2A2A2A] dark:hover:bg-[#383838] flex-1' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20 flex-1'
                }`}
              >
                {hfState?.isAutomated ? (
                  <>
                    <Pause size={14} className="fill-current" />
                    PAUSE ENGINE
                  </>
                ) : (
                  <>
                    <Play size={14} className="fill-current" />
                    {isTimerDirty ? 'RESUME FLOW' : 'START ENGINE'}
                  </>
                )}
              </button>

              {isTimerDirty && (
                <button 
                  onClick={resetAutomation}
                  className="flex items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-[#252525] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Reset Engine"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            {}
            <div className={`w-full transition-all duration-500 ${hfState?.isAutomated && hfState?.modeId === 'short_break' ? 'opacity-100 h-10 mt-1' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}>
              <button 
                onClick={skipPhase}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold tracking-wider text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] shadow-sm hover:shadow transition-all"
              >
                <FastForward size={14} className="fill-current" /> SKIP BREAK
              </button>
            </div>
          </div>

        </div>

        {}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" /> Performance & Insights
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Real-time metrics and weekly focus analytics.
              </p>
            </div>
            
            <button
              onClick={openGoalModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] hover:border-blue-500 dark:hover:border-blue-500 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
            >
              <Settings size={14} className="text-blue-500" />
              <span>SET GOALS</span>
            </button>
          </div>

          {}
          <div className="grid grid-cols-2 gap-4">
            
            {}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition-all group">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 group-hover:scale-110 transition-transform">
                <Clock size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Total Focused</span>
                <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none block mt-1">
                  {formatHoursMinutes(monthlyMinutes)}
                </span>
                <span className="text-[9px] text-gray-400 mt-1 block">Focused this month</span>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition-all group">
              <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 group-hover:scale-110 transition-transform">
                <Flame size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Average Focus</span>
                <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none block mt-1">
                  {formatHoursMinutes(averageDuration)}
                </span>
                <span className="text-[9px] text-gray-400 mt-1 block">Target duration</span>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition-all group">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 group-hover:scale-110 transition-transform">
                <TrendingUp size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Productivity Boost</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block mt-1">
                  +{productivityBoost}%
                </span>
                <span className="text-[9px] text-gray-400 mt-1 block">Est. working efficiency</span>
              </div>
            </div>

            {}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition-all group">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500 group-hover:scale-110 transition-transform">
                <Target size={18} />
              </div>
              <div className="min-w-0 w-full">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Daily Progress</span>
                <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight leading-none block mt-1.5 truncate">
                  {isTodayOff ? (
                    <span className="text-orange-500 font-black">REST DAY ☕</span>
                  ) : (
                    <>
                      {formatHoursMinutes(todayMinutes)} <span className="text-[10px] font-bold text-gray-400">/ {formatHoursMinutes(todayGoalMinutes)}</span>
                    </>
                  )}
                </span>
                <span className="text-[9px] text-gray-400 mt-1 block truncate">
                  {isTodayOff ? 'Recharge your batteries!' : `${goalProgress}% daily goal reached`}
                </span>
              </div>
            </div>

          </div>

          {}
          <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {isTodayOff ? "Rest Protocol Active" : `${currentDayName} Focus Target Progress`}
              </span>
              <span className="text-xs font-black text-purple-600 dark:text-purple-400">{goalProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#2C2C2C] h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                  isTodayOff 
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' 
                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                }`}
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>

          {}
          <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-5 shadow-sm relative group/chart">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">
                Focus Analytics
              </h3>
              
              {}
              <div className="flex bg-gray-150 dark:bg-[#252525] p-0.5 rounded-xl border border-gray-200/40 dark:border-[#333]/40">
                {['day', 'week', 'month'].map(v => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className={`px-3 py-1.5 text-[9px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                      chartView === v 
                        ? 'bg-white dark:bg-[#1E1E1E] text-blue-500 shadow-sm' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="absolute top-3.5 left-36 text-[9px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-[#252525]/30 px-2 py-0.5 rounded-full pointer-events-none select-none opacity-0 group-hover/chart:opacity-100 transition-opacity">
              Scroll wheel to Zoom scale
            </div>
            
            {loading ? (
              <div className="h-[200px] w-full flex items-center justify-center text-xs text-gray-400 italic">
                Analyzing focus patterns...
              </div>
            ) : focusSessions.length === 0 ? (
              <div className="h-[200px] w-full flex flex-col items-center justify-center text-center p-4">
                <Clock size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">No focus history yet</p>
                <p className="text-[10px] text-gray-400 mt-1">Complete your first session to plot your graph!</p>
              </div>
            ) : (
              <div 
                key={chartView} 
                onWheel={handleChartWheel}
                className="h-[200px] w-full mt-2 animate-fadeIn cursor-ns-resize"
                title="Scroll inside to Zoom between Day, Week, and Month Views!"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={activeChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="label" 
                      stroke="#888888" 
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(30, 30, 30, 0.85)', 
                        backdropFilter: 'blur(8px)',
                        border: '1px solid #333', 
                        borderRadius: '12px',
                        padding: '10px 14px'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}
                      itemStyle={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '11px' }}
                      formatter={(value) => [`${formatHoursMinutes(value)}`, "Focused"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="minutes" 
                      stroke="#3B82F6" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorMinutes)" 
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {}
            <div className="mt-2 text-center">
              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-[#252525] px-3 py-1 rounded-full">
                Active Scale: {chartView} view
              </span>
            </div>

          </div>

        </div>

      </div>

      {}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn p-4">
          <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] p-6 rounded-3xl w-full max-w-lg shadow-2xl animate-scaleUp max-h-[90vh] flex flex-col">
            
            {}
            <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-[#2C2C2C] shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" /> Weekly Goal Configurator
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                  Adjust custom daily targets or specify rest protocol.
                </p>
              </div>
              <button 
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-[#252525] dark:hover:bg-[#333] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 pr-1 flex flex-col gap-3">
              {DAYS_OF_WEEK.map(day => {
                const dayNameFull = {
                  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
                }[day];
                const goalObj = tempGoals[day] || { goal: 60, isOff: false };
                
                return (
                  <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-gray-50 dark:bg-[#252525] rounded-2xl border border-gray-100/50 dark:border-[#2C2C2C]/50 gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{dayNameFull}</span>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                        {goalObj.isOff ? (
                          <span className="text-orange-500">Rest Day ☕</span>
                        ) : (
                          `Target: ${formatHoursMinutes(goalObj.goal)}`
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      {}
                      <button
                        onClick={() => handleToggleOff(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          goalObj.isOff 
                            ? 'bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/50 dark:text-orange-400' 
                            : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333] text-gray-500 hover:text-gray-700 dark:hover:text-white'
                        }`}
                      >
                        {goalObj.isOff ? 'REST DAY ☕' : 'ACTIVE 🎯'}
                      </button>

                      {}
                      {!goalObj.isOff && (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] p-1 rounded-xl shadow-sm">
                          <select
                            value={Math.floor(goalObj.goal / 60)}
                            onChange={(e) => handleHourChange(day, parseInt(e.target.value))}
                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 rounded p-1 outline-none cursor-pointer focus:text-blue-500"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                              <option key={h} value={h} className="dark:bg-[#1E1E1E]">{h} hr</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-gray-300 font-bold">:</span>
                          <select
                            value={goalObj.goal % 60}
                            onChange={(e) => handleMinChange(day, parseInt(e.target.value))}
                            className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-200 rounded p-1 outline-none cursor-pointer focus:text-blue-500"
                          >
                            {[0, 15, 30, 45].map(m => (
                              <option key={m} value={m} className="dark:bg-[#1E1E1E]">{m} min</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#2C2C2C] shrink-0">
              <button 
                onClick={() => setIsGoalModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveWeeklyGoals}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-md transition-all active:scale-95"
              >
                Save Protocol
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HyperFocus;