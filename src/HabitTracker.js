import React, { useState, useEffect } from 'react';
import { 
  Activity, Flame, Skull, Plus, CheckCircle2, RotateCcw, Trash2, 
  AlertTriangle, Target, ShieldAlert, BarChart3, Moon, Sun, Sunrise, Sunset, LayoutGrid, BookOpen, Award 
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NAMAZ_PRAYERS = [
  { id: 'fajr', name: 'Fajr', icon: Sunrise, color: 'text-indigo-400' },
  { id: 'zuhr', name: 'Zuhr', icon: Sun, color: 'text-yellow-500' },
  { id: 'asr', name: 'Asr', icon: Sun, color: 'text-orange-400' },
  { id: 'maghrib', name: 'Maghrib', icon: Sunset, color: 'text-rose-500' },
  { id: 'isha', name: 'Isha', icon: Moon, color: 'text-blue-500' },
];

export default function HabitTracker({ activeTab }) {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null, title: '', message: '', confirmText: '', btnStyle: '' });

  // Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('good');
  const [targetPerDay, setTargetPerDay] = useState(1);
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  const [strategy, setStrategy] = useState('cold_turkey');
  const [allowancePerWeek, setAllowancePerWeek] = useState(1);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, { headers: { 'x-auth-token': token } });
      if (res.ok) {
        let data = await res.json();
        
        let hasNamaz = data.some(h => h.name === 'Daily Namaz');

        if (!hasNamaz) {
          const payload = {
            name: 'Daily Namaz',
            type: 'good',
            targetPerDay: 5,
            targetPerWeek: 7
          };
          const createRes = await fetch(`${API_BASE}/api/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(payload)
          });
          if (createRes.ok) {
            const newNamaz = await createRes.json();
            data = [newNamaz, ...data];
          }
        }

        const taggedData = data.map(h => ({
          ...h,
          isSystemNamaz: h.name === 'Daily Namaz'
        }));
        
        setHabits(taggedData);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  // --- ACTIONS ---
  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const payload = {
      name: newHabitName,
      type: newHabitType,
      targetPerDay: newHabitType === 'good' ? parseInt(targetPerDay) : 1,
      targetPerWeek: newHabitType === 'good' ? parseInt(targetPerWeek) : 7,
      strategy: newHabitType === 'bad' ? strategy : undefined,
      allowancePerWeek: newHabitType === 'bad' && strategy === 'moderation' ? parseInt(allowancePerWeek) : 0
    };

    try {
      const res = await fetch(`${API_BASE}/api/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const added = await res.json();
        setHabits([added, ...habits]);
        setIsModalOpen(false);
        setNewHabitName('');
        setTargetPerDay(1);
        setTargetPerWeek(7);
      }
    } catch (err) { console.error(err); }
  };

  const executeConfirm = async () => {
    const { type, id } = confirmDialog;
    try {
      if (type === 'delete') {
        await fetch(`${API_BASE}/api/habits/${id}/delete`, { method: 'PUT', headers: { 'x-auth-token': token } });
        setHabits(habits.filter(h => h._id !== id));
      } else if (type === 'reset') {
        const res = await fetch(`${API_BASE}/api/habits/${id}/reset`, { method: 'PUT', headers: { 'x-auth-token': token } });
        if (res.ok) {
          const updatedHabit = await res.json();
          setHabits(habits.map(h => h._id === id ? { ...updatedHabit, isSystemNamaz: updatedHabit.name === 'Daily Namaz' } : h));
        }
      } else if (type === 'cheat') {
        const res = await fetch(`${API_BASE}/api/habits/${id}/cheat`, { method: 'PUT', headers: { 'x-auth-token': token } });
        if (res.ok) {
          const updatedHabit = await res.json();
          setHabits(habits.map(h => h._id === id ? { ...updatedHabit, isSystemNamaz: updatedHabit.name === 'Daily Namaz' } : h));
        }
      }
    } catch (err) { console.error(err); }
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/checkin`, { method: 'PUT', headers: { 'x-auth-token': token } });
      if (res.ok) {
         const updatedHabit = await res.json();
         setHabits(habits.map(h => h._id === id ? { ...updatedHabit, isSystemNamaz: updatedHabit.name === 'Daily Namaz' } : h));
      }
    } catch (err) { console.error(err); }
  };

  // --- HELPERS ---
  const isThisWeek = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0,0,0,0);
    return date >= startOfWeek;
  };

  const calculateStreak = (checkIns) => {
    if (!checkIns || checkIns.length === 0) return 0;
    const uniqueDays = [...new Set(checkIns.map(d => new Date(d).setHours(0,0,0,0)))].sort((a,b) => b - a);
    let streak = 0;
    let currentDate = new Date().setHours(0,0,0,0);
    if (uniqueDays[0] !== currentDate) currentDate -= 86400000; 
    
    for (const day of uniqueDays) {
      if (day === currentDate) { streak++; currentDate -= 86400000; } 
      else if (day < currentDate) break;
    }
    return streak;
  };

  const LiveTimer = ({ startDate }) => {
    const [time, setTime] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
    useEffect(() => {
      const interval = setInterval(() => {
        const diff = new Date() - new Date(startDate);
        setTime({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          mins: Math.floor((diff / 1000 / 60) % 60),
          secs: Math.floor((diff / 1000) % 60)
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [startDate]);

    return (
      <div className="flex gap-2 text-center my-4">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-inner"><div className="text-xl font-black text-rose-500">{time.days}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Days</div></div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-inner"><div className="text-xl font-black text-gray-700 dark:text-gray-300">{String(time.hours).padStart(2,'0')}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Hrs</div></div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-inner"><div className="text-xl font-black text-gray-700 dark:text-gray-300">{String(time.mins).padStart(2,'0')}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Min</div></div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 shadow-inner"><div className="text-xl font-black text-gray-400 dark:text-gray-500">{String(time.secs).padStart(2,'0')}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Sec</div></div>
      </div>
    );
  };

  // --- RENDERERS ---
  const renderOverview = () => {
    const totalGood = habits.filter(h => h.type === 'good' && !h.isSystemNamaz).length;
    const totalBad = habits.filter(h => h.type === 'bad').length;
    
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-brand-blue rounded-full"></div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
            Protocol Overview
          </h3>
        </div>

        {/* HADITH: CONSISTENCY (MOVED TO TOP) */}
        <div className="bg-gradient-to-br from-indigo-900 to-black p-8 md:p-10 rounded-[2rem] relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8 text-center lg:text-left">
            <div className="flex-1">
              <BookOpen className="text-blue-400/50 mb-4 mx-auto lg:mx-0" size={32} />
              <p className="text-white font-arabic text-3xl md:text-4xl leading-loose mb-4" dir="rtl">
                أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ
              </p>
              <p className="text-blue-50 font-medium text-lg leading-relaxed italic">
                "The most beloved of deeds to Allah are those that are most consistent, even if they are small."
              </p>
              <p className="text-blue-300 mt-3 font-bold text-sm uppercase tracking-wider">— Sahih al-Bukhari 6464</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 shrink-0">
              <Plus size={20} /> Establish Protocol
            </button>
          </div>
        </div>

        {/* STAT CARDS (MOVED BELOW HADITH) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Active Targets</p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalGood}</h3>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><Target size={28} className="text-emerald-600 dark:text-emerald-400" /></div>
          </div>
          <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Vices Tracked</p>
              <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">{totalBad}</h3>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20"><Skull size={28} className="text-rose-600 dark:text-rose-400" /></div>
          </div>
        </div>
      </div>
    );
  };

  const renderNamaz = () => {
    const namazHabit = habits.find(h => h.isSystemNamaz);
    if (!namazHabit) return <div className="text-center p-10 text-gray-400">Initializing Database...</div>;

    const today = new Date().setHours(0,0,0,0);
    const checksToday = (namazHabit.checkIns || []).filter(d => new Date(d).setHours(0,0,0,0) === today).length;

    return (
      <div className="animate-fadeIn space-y-8">
        
        {/* HADITH: NAMAZ (ALREADY AT TOP) */}
        <div className="bg-emerald-900 dark:bg-emerald-950 p-8 md:p-10 rounded-[2rem] relative overflow-hidden shadow-lg border border-emerald-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <p className="text-white font-arabic text-2xl md:text-4xl leading-loose mb-6" dir="rtl">
              مَثَلُ الصَّلَوَاتِ الْخَمْسِ كَمَثَلِ نَهَرٍ جَارٍ غَمْرٍ عَلَى بَابِ أَحَدِكُمْ يَغْتَسِلُ مِنْهُ كُلَّ يَوْمٍ خَمْسَ مَرَّاتٍ
            </p>
            <p className="text-emerald-50 font-medium text-lg italic leading-relaxed">
              "The five daily prayers are like a deep river flowing at the door of any of you, in which he bathes five times a day."
            </p>
            <p className="text-emerald-300 mt-4 font-bold text-sm uppercase tracking-wider">— Sahih Muslim 667</p>
          </div>
        </div>

        {/* PROGRESS & TRACKING BLOCKS */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Moon className="text-emerald-500" /> Daily Check-ins
            </h2>
          </div>
          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-800">
            {checksToday} / 5 Completed Today
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {NAMAZ_PRAYERS.map((prayer, idx) => {
            const isCompleted = checksToday > idx;
            const Icon = prayer.icon;
            
            return (
              <div key={prayer.id} className={`p-6 rounded-2xl border transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-[1.02]' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333]'}`}>
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-4 ${isCompleted ? 'bg-white/20' : 'bg-gray-50 dark:bg-[#252525]'}`}>
                    <Icon size={32} className={isCompleted ? 'text-white' : prayer.color} />
                  </div>
                  <h3 className={`text-xl font-bold mb-4 ${isCompleted ? 'text-white' : 'text-gray-800 dark:text-white'}`}>{prayer.name}</h3>
                  <button 
                    onClick={() => handleCheckIn(namazHabit._id)}
                    disabled={isCompleted || checksToday !== idx} 
                    className={`w-full py-3 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all ${isCompleted ? 'bg-white/20 text-white cursor-not-allowed' : checksToday === idx ? 'bg-brand-blue text-white shadow-lg hover:bg-blue-600' : 'bg-gray-100 dark:bg-[#333] text-gray-400 cursor-not-allowed'}`}
                  >
                    {isCompleted ? <CheckCircle2 size={18} /> : 'Offer Prayer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderActiveTracker = () => {
    const goodHabits = habits.filter(h => h.type === 'good' && !h.isSystemNamaz);
    const badHabits = habits.filter(h => h.type === 'bad');

    return (
      <div className="animate-fadeIn space-y-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="text-brand-blue" /> Protocol Dashboard
          </h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-brand-blue hover:bg-blue-600 text-white p-2 rounded-xl transition-colors"><Plus size={20}/></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* GOOD HABITS */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-gray-100 dark:border-[#333] pb-2">
              <Target size={20} /> Active Pursuits
            </h3>
            {goodHabits.map(habit => {
              const today = new Date().setHours(0,0,0,0);
              
              // Daily Calcs
              const checksToday = (habit.checkIns || []).filter(d => new Date(d).setHours(0,0,0,0) === today).length;
              const targetDaily = habit.targetPerDay || 1;
              const isCheckedInToday = checksToday >= targetDaily;

              // Weekly Calcs
              const checkInsThisWeek = (habit.checkIns || []).filter(isThisWeek);
              const uniqueDaysThisWeek = new Set(checkInsThisWeek.map(d => new Date(d).setHours(0,0,0,0))).size;
              const targetWeekly = habit.targetPerWeek || 7;
              const weeklyProgressPercent = Math.min(100, (uniqueDaysThisWeek / targetWeekly) * 100);

              return (
                <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg dark:text-white">{habit.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Flame size={12} className="text-orange-500"/> {calculateStreak(habit.checkIns)} Day Streak</p>
                    </div>
                    <button onClick={() => setConfirmDialog({ isOpen: true, type: 'delete', id: habit._id, title: 'Delete', message: 'Erase this?', confirmText: 'Delete', btnStyle: 'bg-red-600' })} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  
                  {/* Daily Target Segments */}
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                    <span>DAILY PROGRESS</span>
                    <span className={checksToday >= targetDaily ? "text-emerald-500" : ""}>{checksToday} / {targetDaily}</span>
                  </div>
                  <div className="flex gap-1.5 h-2.5 mb-4">
                    {Array.from({ length: targetDaily }).map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full ${idx < checksToday ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-[#333]'}`} />
                    ))}
                  </div>

                  {/* Weekly Progress Bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                      <span>WEEKLY TARGET</span>
                      <span className={uniqueDaysThisWeek >= targetWeekly ? "text-blue-500" : ""}>{uniqueDaysThisWeek} / {targetWeekly} Days</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-[#222] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${weeklyProgressPercent}%` }}></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleCheckIn(habit._id)} disabled={isCheckedInToday}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${isCheckedInToday ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02]'}`}
                  >
                    {isCheckedInToday ? 'Complete for Today' : 'Log Progress'}
                  </button>
                </div>
              );
            })}
            {goodHabits.length === 0 && <p className="text-gray-400 text-sm italic py-4">No active pursuits established.</p>}
          </div>

          {/* BAD HABITS */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 border-b border-gray-100 dark:border-[#333] pb-2">
              <Skull size={20} /> Vice Eradication
            </h3>
            {badHabits.map(habit => {
              const cheatsThisWeek = (habit.cheatDays || []).filter(isThisWeek).length;
              const allowancesLeft = Math.max(0, (habit.allowancePerWeek || 0) - cheatsThisWeek);
              const isModeration = habit.strategy === 'moderation';

              return (
                <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg dark:text-white">{habit.name}</h4>
                    <button onClick={() => setConfirmDialog({ isOpen: true, type: 'delete', id: habit._id, title: 'Delete', message: 'Erase this?', confirmText: 'Delete', btnStyle: 'bg-red-600' })} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                  
                  <LiveTimer startDate={habit.startDate} />

                  <div className={`mt-2 flex gap-2 ${isModeration ? '' : 'justify-center'}`}>
                    {isModeration && (
                      <button onClick={() => setConfirmDialog({ isOpen: true, type: 'cheat', id: habit._id, title: 'Use Allowance', message: 'Use exception?', confirmText: 'Use', btnStyle: 'bg-orange-500' })} disabled={allowancesLeft <= 0} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${allowancesLeft > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'bg-gray-100 text-gray-400 dark:bg-[#333]'}`}>
                        Use Exception ({allowancesLeft})
                      </button>
                    )}
                    <button onClick={() => setConfirmDialog({ isOpen: true, type: 'reset', id: habit._id, title: 'Relapse', message: 'Reset streak?', confirmText: 'Reset', btnStyle: 'bg-rose-600' })} className={`${isModeration ? 'flex-1' : 'w-full'} py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors`}>
                      Log Relapse
                    </button>
                  </div>
                </div>
              );
            })}
            {badHabits.length === 0 && <p className="text-gray-400 text-sm italic py-4">No vices tracked.</p>}
          </div>

        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const customGoodHabits = habits.filter(h => h.type === 'good' && !h.isSystemNamaz);
    const badHabits = habits.filter(h => h.type === 'bad');

    return (
      <div className="animate-fadeIn space-y-12">
        
        {/* GOOD HABIT ANALYTICS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <BarChart3 className="text-emerald-500" /> Objective Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customGoodHabits.map(habit => (
              <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
                <h3 className="font-bold text-lg dark:text-white mb-4 text-center">{habit.name}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-xl text-center border border-gray-100 dark:border-[#333]">
                      <Flame size={20} className="mx-auto text-orange-500 mb-1" />
                      <div className="text-2xl font-black text-gray-900 dark:text-white">{calculateStreak(habit.checkIns)}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Current Streak</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-xl text-center border border-gray-100 dark:border-[#333]">
                      <Award size={20} className="mx-auto text-yellow-500 mb-1" />
                      <div className="text-2xl font-black text-gray-900 dark:text-white">{habit.longestStreak || 0}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Best Streak</div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#333] text-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                      {habit.checkIns?.length || 0} Lifetime Actions
                    </span>
                </div>
              </div>
            ))}
            {customGoodHabits.length === 0 && <p className="text-gray-400 italic">No custom targets established yet.</p>}
          </div>
        </div>

        {/* BAD HABIT ANALYTICS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <Skull className="text-rose-500" /> Eradication Progress
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badHabits.map(habit => {
              const daysClean = Math.floor((new Date() - new Date(habit.startDate)) / (1000 * 60 * 60 * 24));
              const totalRelapses = habit.cheatDays?.length || 0;

              return (
                <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                  <h3 className="font-bold text-lg dark:text-white mb-4 text-center mt-2">{habit.name}</h3>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-xl text-center border border-gray-100 dark:border-[#333]">
                        <ShieldAlert size={20} className="mx-auto text-emerald-500 mb-1" />
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{daysClean}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Days Clean</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-xl text-center border border-gray-100 dark:border-[#333]">
                        <RotateCcw size={20} className="mx-auto text-rose-500 mb-1" />
                        <div className="text-2xl font-black text-gray-900 dark:text-white">{totalRelapses}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Total Relapses</div>
                      </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#333] text-center">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        Strategy: {habit.strategy.replace('_', ' ')}
                      </span>
                  </div>
                </div>
              );
            })}
            {badHabits.length === 0 && <p className="text-gray-400 italic">No vices being tracked.</p>}
          </div>
        </div>

      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Habits-Namaz': return renderNamaz();
      case 'Habits-Tracker': return renderActiveTracker();
      case 'Habits-Analytics': return renderAnalytics();
      default: return renderOverview();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white text-gray-900">Habit Protocol</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track prayers, build good habits, and eradicate vices.</p>
      </div>

      {isLoading ? <div className="text-center py-20 text-gray-400">Loading Protocol...</div> : renderContent()}

      {/* --- ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp">
            <div className="p-6 text-center border-b border-gray-100 dark:border-[#333]">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Initialize Protocol</h3>
            </div>
            
            <form onSubmit={handleAddHabit} className="p-6 space-y-5">
              <div className="flex bg-gray-50 dark:bg-[#252525] rounded-xl p-1 border border-gray-200 dark:border-[#333]">
                <button type="button" onClick={() => setNewHabitType('good')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${newHabitType === 'good' ? 'bg-white dark:bg-[#3E3E3E] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}>Target Objective</button>
                <button type="button" onClick={() => setNewHabitType('bad')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${newHabitType === 'bad' ? 'bg-white dark:bg-[#3E3E3E] text-rose-600 dark:text-rose-400 shadow-sm' : 'text-gray-500'}`}>Eradicate Vice</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Protocol Name</label>
                <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder={newHabitType === 'good' ? "e.g. Read 10 pages..." : "e.g. Doomscrolling..."} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-brand-blue" required autoFocus />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] space-y-4">
                {newHabitType === 'good' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Times per day:</label>
                      <input type="number" min="1" max="20" value={targetPerDay} onChange={e => setTargetPerDay(e.target.value)} className="w-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Days per week:</label>
                      <input type="number" min="1" max="7" value={targetPerWeek} onChange={e => setTargetPerWeek(e.target.value)} className="w-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Strategy</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setStrategy('cold_turkey')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${strategy === 'cold_turkey' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' : 'border-gray-200 dark:border-[#444] text-gray-500'}`}>Zero Tolerance</button>
                        <button type="button" onClick={() => setStrategy('moderation')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${strategy === 'moderation' ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' : 'border-gray-200 dark:border-[#444] text-gray-500'}`}>Moderation</button>
                      </div>
                    </div>
                    {strategy === 'moderation' && (
                      <div className="flex items-center justify-between mt-3">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Allowed uses per week:</label>
                        <input type="number" min="1" max="10" value={allowancePerWeek} onChange={e => setAllowancePerWeek(e.target.value)} className="w-16 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white outline-none" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] py-3 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all">Save Protocol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp text-center">
            <div className="p-6 text-center">
               <AlertTriangle size={32} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-500 text-sm">{confirmDialog.message}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#121212] border-t border-gray-100 dark:border-[#333] flex gap-3">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-3 font-bold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl">Cancel</button>
              <button onClick={executeConfirm} className={`flex-1 py-3 font-bold text-sm text-white rounded-xl ${confirmDialog.btnStyle}`}>{confirmDialog.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-arabic { font-family: 'Amiri', 'Traditional Arabic', serif; }
      `}</style>
    </div>
  );
}