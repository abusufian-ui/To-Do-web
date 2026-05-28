import React, { useState, useEffect } from 'react';
import { 
  Activity, Flame, Skull, Plus, CheckCircle2, RotateCcw, Trash2, Edit3, 
  AlertTriangle, Target, ShieldAlert, BarChart3, Moon, Sun, Sunrise, Sunset, LayoutGrid, BookOpen, Award, CalendarDays
} from 'lucide-react';
import Confetti from 'react-confetti';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NAMAZ_PRAYERS = [
  { id: 'fajr', name: 'Fajr', icon: Sunrise, color: 'text-indigo-400' },
  { id: 'zuhr', name: 'Zuhr', icon: Sun, color: 'text-yellow-500' },
  { id: 'asr', name: 'Asr', icon: Sun, color: 'text-orange-400' },
  { id: 'maghrib', name: 'Maghrib', icon: Sunset, color: 'text-rose-500' },
  { id: 'isha', name: 'Isha', icon: Moon, color: 'text-blue-500' },
];

const CATEGORIES = [
  { id: 'academic', label: 'Academic', color: '#3B82F6', icon: '📚' },
  { id: 'health', label: 'Health', color: '#10B981', icon: '🏃' },
  { id: 'spiritual', label: 'Spiritual', color: '#8B5CF6', icon: '🕌' },
  { id: 'social', label: 'Social', color: '#EC4899', icon: '👥' },
  { id: 'financial', label: 'Financial', color: '#F59E0B', icon: '💰' },
  { id: 'productivity', label: 'Productivity', color: '#6366F1', icon: '⚡' },
  { id: 'custom', label: 'Custom', color: '#6B7280', icon: '🎯' }
];

const ICONS = ['🎯','📚','🏃','🕌','👥','💰','⚡','💻','📖','🧘','💧','🍎','😴','🚫','📱','🎮'];
const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#6B7280', '#EF4444', '#14B8A6'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const RELAPSE_TRIGGERS = ['Stress', 'Boredom', 'Social Pressure', 'Late Night', 'Fatigue', 'Custom'];

export default function HabitTracker({ activeTab }) {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null, title: '', message: '', confirmText: '', btnStyle: '' });
  
  // Relapse Modal
  const [relapseModal, setRelapseModal] = useState({ isOpen: false, id: null });
  const [relapseTrigger, setRelapseTrigger] = useState('Stress');
  const [relapseNote, setRelapseNote] = useState('');

  // Form State
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('good');
  const [category, setCategory] = useState('custom');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#3B82F6');
  const [scheduleDays, setScheduleDays] = useState([0,1,2,3,4,5,6]);
  
  const [targetPerDay, setTargetPerDay] = useState(1);
  const [targetPerWeek, setTargetPerWeek] = useState(7);
  
  const [strategy, setStrategy] = useState('cold_turkey');
  const [allowancePerWeek, setAllowancePerWeek] = useState(1);
  const [replacement, setReplacement] = useState('');
  
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchHabits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, { headers: { 'x-auth-token': token } });
      if (res.ok) {
        let data = await res.json();
        let hasNamaz = data.some(h => h.name === 'Daily Namaz');

        if (!hasNamaz) {
          const payload = { name: 'Daily Namaz', type: 'good', category: 'spiritual', icon: '🕌', targetPerDay: 5, targetPerWeek: 7 };
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

        setHabits(data.map(h => ({ ...h, isSystemNamaz: h.name === 'Daily Namaz' })));
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewHabitName('');
    setNewHabitType('good');
    setCategory('custom');
    setIcon('🎯');
    setColor('#3B82F6');
    setScheduleDays([0,1,2,3,4,5,6]);
    setTargetPerDay(1);
    setTargetPerWeek(7);
    setStrategy('cold_turkey');
    setAllowancePerWeek(1);
    setReplacement('');
    setIsModalOpen(true);
  };

  const openEditModal = (habit) => {
    if (habit.isSystemNamaz) return;
    setIsEditMode(true);
    setEditId(habit._id);
    setNewHabitName(habit.name);
    setNewHabitType(habit.type);
    setCategory(habit.category || 'custom');
    setIcon(habit.icon || '🎯');
    setColor(habit.color || '#3B82F6');
    setScheduleDays(habit.scheduleDays || [0,1,2,3,4,5,6]);
    setTargetPerDay(habit.targetPerDay || 1);
    setTargetPerWeek(habit.targetPerWeek || 7);
    setStrategy(habit.strategy || 'cold_turkey');
    setAllowancePerWeek(habit.allowancePerWeek || 1);
    setReplacement(habit.replacement || '');
    setIsModalOpen(true);
  };

  const handleSaveHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const payload = {
      name: newHabitName,
      type: newHabitType,
      category, icon, color, scheduleDays,
      targetPerDay: newHabitType === 'good' ? parseInt(targetPerDay) : 1,
      targetPerWeek: newHabitType === 'good' ? parseInt(targetPerWeek) : 7,
      strategy: newHabitType === 'bad' ? strategy : undefined,
      allowancePerWeek: newHabitType === 'bad' && strategy === 'moderation' ? parseInt(allowancePerWeek) : 0,
      replacement: newHabitType === 'bad' ? replacement : ''
    };

    try {
      const url = isEditMode ? `${API_BASE}/api/habits/${editId}` : `${API_BASE}/api/habits`;
      const method = isEditMode ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEditMode) {
          setHabits(habits.map(h => h._id === editId ? { ...saved, isSystemNamaz: false } : h));
        } else {
          setHabits([saved, ...habits]);
        }
        setIsModalOpen(false);
      }
    } catch (err) { console.error(err); }
  };

  const executeConfirm = async () => {
    const { type, id } = confirmDialog;
    try {
      if (type === 'delete') {
        const res = await fetch(`${API_BASE}/api/habits/${id}/delete`, { method: 'PUT', headers: { 'x-auth-token': token } });
        if(res.ok) setHabits(habits.filter(h => h._id !== id));
      } else if (type === 'cheat') {
        const res = await fetch(`${API_BASE}/api/habits/${id}/cheat`, { method: 'PUT', headers: { 'x-auth-token': token } });
        if (res.ok) {
          const updated = await res.json();
          setHabits(habits.map(h => h._id === id ? { ...updated, isSystemNamaz: updated.name === 'Daily Namaz' } : h));
        }
      }
    } catch (err) {}
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const submitRelapse = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${relapseModal.id}/reset`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ trigger: relapseTrigger, note: relapseNote })
      });
      if (res.ok) {
        const updated = await res.json();
        setHabits(habits.map(h => h._id === relapseModal.id ? updated : h));
      }
    } catch (err) {}
    setRelapseModal({ isOpen: false, id: null });
    setRelapseNote('');
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/checkin`, { method: 'PUT', headers: { 'x-auth-token': token } });
      if (res.ok) {
         const updatedHabit = await res.json();
         // Check for new milestones to trigger confetti
         const oldHabit = habits.find(h => h._id === id);
         if (updatedHabit.milestones?.length > (oldHabit.milestones?.length || 0)) {
           setShowConfetti(true);
           setTimeout(() => setShowConfetti(false), 5000);
         }
         setHabits(habits.map(h => h._id === id ? { ...updatedHabit, isSystemNamaz: updatedHabit.name === 'Daily Namaz' } : h));
      }
    } catch (err) { console.error(err); }
  };

  const toggleDay = (dayIndex) => {
    if (scheduleDays.includes(dayIndex)) {
      setScheduleDays(scheduleDays.filter(d => d !== dayIndex));
    } else {
      setScheduleDays([...scheduleDays, dayIndex].sort());
    }
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
    const categoryCounts = {};
    habits.forEach(h => {
      if (!h.isSystemNamaz) categoryCounts[h.category || 'custom'] = (categoryCounts[h.category || 'custom'] || 0) + 1;
    });
    
    return (
      <div className="space-y-8 animate-fadeIn">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-brand-blue rounded-full"></div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Protocol Overview</h3>
        </div>

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
            <button onClick={openAddModal} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 shrink-0">
              <Plus size={20} /> Establish Protocol
            </button>
          </div>
        </div>

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

        {/* Weekly Heatmap Overview */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-100 dark:border-[#2C2C2C]">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Category Focus</h3>
           <div className="flex flex-wrap gap-3">
             {CATEGORIES.map(c => (
               <div key={c.id} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333]">
                 <span>{c.icon}</span>
                 <span className="font-bold text-gray-700 dark:text-gray-300">{c.label}</span>
                 <span className="bg-gray-200 dark:bg-[#444] px-2 py-0.5 rounded-md text-xs">{categoryCounts[c.id] || 0}</span>
               </div>
             ))}
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
        <div className="bg-emerald-900 dark:bg-emerald-950 p-8 md:p-10 rounded-[2rem] relative overflow-hidden shadow-lg border border-emerald-800">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <p className="text-white font-arabic text-2xl md:text-4xl leading-loose mb-6" dir="rtl">
              مَثَلُ الصَّلَوَاتِ الْخَمْسِ كَمَثَلِ نَهَرٍ جَارٍ غَمْرٍ عَلَى بَابِ أَحَدِكُمْ يَغْتَسِلُ مِنْهُ كُلَّ يَوْمٍ خَمْسَ مَرَّاتٍ
            </p>
            <p className="text-emerald-50 font-medium text-lg italic leading-relaxed">
              "The five daily prayers are like a deep river flowing at the door of any of you, in which he bathes five times a day."
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Moon className="text-emerald-500" /> Daily Check-ins
          </h2>
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
    let goodHabits = habits.filter(h => h.type === 'good' && !h.isSystemNamaz);
    let badHabits = habits.filter(h => h.type === 'bad');

    if (activeCategoryFilter !== 'all') {
      goodHabits = goodHabits.filter(h => (h.category || 'custom') === activeCategoryFilter);
      badHabits = badHabits.filter(h => (h.category || 'custom') === activeCategoryFilter);
    }

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="text-brand-blue" /> Protocol Dashboard
          </h2>
          <button onClick={openAddModal} className="bg-brand-blue hover:bg-blue-600 text-white p-2 rounded-xl transition-colors"><Plus size={20}/></button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveCategoryFilter('all')} className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${activeCategoryFilter === 'all' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-[#252525] text-gray-500 hover:bg-gray-200'}`}>All</button>
          {CATEGORIES.map(c => (
             <button key={c.id} onClick={() => setActiveCategoryFilter(c.id)} className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${activeCategoryFilter === c.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-[#252525] text-gray-500 hover:bg-gray-200'}`}>
               <span>{c.icon}</span> {c.label}
             </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          
          {/* GOOD HABITS */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-gray-100 dark:border-[#333] pb-2">
              <Target size={20} /> Active Pursuits
            </h3>
            {goodHabits.map(habit => {
              const today = new Date().setHours(0,0,0,0);
              const todayDayOfWeek = new Date().getDay();
              const isScheduledToday = habit.scheduleDays ? habit.scheduleDays.includes(todayDayOfWeek) : true;
              
              const checksToday = (habit.checkIns || []).filter(d => new Date(d).setHours(0,0,0,0) === today).length;
              const targetDaily = habit.targetPerDay || 1;
              const isCheckedInToday = checksToday >= targetDaily;

              const checkInsThisWeek = (habit.checkIns || []).filter(isThisWeek);
              const uniqueDaysThisWeek = new Set(checkInsThisWeek.map(d => new Date(d).setHours(0,0,0,0))).size;
              const targetWeekly = habit.targetPerWeek || 7;
              const weeklyProgressPercent = Math.min(100, (uniqueDaysThisWeek / targetWeekly) * 100);

              return (
                <div key={habit._id} style={{ borderColor: habit.color || '#3B82F6' }} className="bg-white dark:bg-[#1E1E1E] border-l-4 border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-[#333] dark:border-r-[#333] rounded-2xl p-5 shadow-sm relative">
                  {!isScheduledToday && (
                     <div className="absolute top-2 right-2 bg-gray-100 dark:bg-[#252525] text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">Not Scheduled Today</div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <div className="text-3xl">{habit.icon || '🎯'}</div>
                      <div>
                        <h4 className="font-bold text-lg dark:text-white leading-tight">{habit.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Flame size={12} className="text-orange-500"/> {calculateStreak(habit.checkIns)} Day Streak</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(habit)} className="text-gray-400 hover:text-blue-500 p-1"><Edit3 size={16}/></button>
                      <button onClick={() => setConfirmDialog({ isOpen: true, type: 'delete', id: habit._id, title: 'Archive', message: 'Archive this pursuit?', confirmText: 'Archive', btnStyle: 'bg-red-600' })} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  {/* Daily Target */}
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                    <span>DAILY PROGRESS</span>
                    <span className={checksToday >= targetDaily ? "text-emerald-500" : ""}>{checksToday} / {targetDaily}</span>
                  </div>
                  <div className="flex gap-1.5 h-2.5 mb-4">
                    {Array.from({ length: targetDaily }).map((_, idx) => (
                      <div key={idx} className={`flex-1 rounded-full ${idx < checksToday ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-[#333]'}`} />
                    ))}
                  </div>

                  {/* Weekly Target */}
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
                    onClick={() => handleCheckIn(habit._id)} disabled={isCheckedInToday || !isScheduledToday}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${isCheckedInToday ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 cursor-not-allowed' : !isScheduledToday ? 'bg-gray-100 dark:bg-[#333] text-gray-400 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02]'}`}
                  >
                    {isCheckedInToday ? 'Complete for Today' : isScheduledToday ? 'Log Progress' : 'Rest Day'}
                  </button>
                </div>
              );
            })}
            {goodHabits.length === 0 && <p className="text-gray-400 text-sm italic py-4">No active pursuits established in this category.</p>}
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
                <div key={habit._id} style={{ borderColor: habit.color || '#EF4444' }} className="bg-white dark:bg-[#1E1E1E] border-l-4 border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-[#333] dark:border-r-[#333] rounded-2xl p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="text-3xl">{habit.icon || '🚫'}</div>
                      <div>
                        <h4 className="font-bold text-lg dark:text-white leading-tight">{habit.name}</h4>
                        {habit.replacement && <p className="text-xs text-emerald-500 font-bold mt-1 uppercase tracking-wide">↳ {habit.replacement}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(habit)} className="text-gray-400 hover:text-blue-500 p-1"><Edit3 size={16}/></button>
                      <button onClick={() => setConfirmDialog({ isOpen: true, type: 'delete', id: habit._id, title: 'Archive', message: 'Archive this?', confirmText: 'Archive', btnStyle: 'bg-red-600' })} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  <LiveTimer startDate={habit.startDate} />

                  <div className={`mt-2 flex gap-2 ${isModeration ? '' : 'justify-center'}`}>
                    {isModeration && (
                      <button onClick={() => setConfirmDialog({ isOpen: true, type: 'cheat', id: habit._id, title: 'Use Allowance', message: 'Use exception?', confirmText: 'Use', btnStyle: 'bg-orange-500' })} disabled={allowancesLeft <= 0} className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${allowancesLeft > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'bg-gray-100 text-gray-400 dark:bg-[#333]'}`}>
                        Use Exception ({allowancesLeft})
                      </button>
                    )}
                    <button onClick={() => setRelapseModal({ isOpen: true, id: habit._id })} className={`${isModeration ? 'flex-1' : 'w-full'} py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors`}>
                      Log Relapse
                    </button>
                  </div>
                </div>
              );
            })}
            {badHabits.length === 0 && <p className="text-gray-400 text-sm italic py-4">No vices tracked in this category.</p>}
          </div>

        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const customGoodHabits = habits.filter(h => h.type === 'good' && !h.isSystemNamaz);
    const badHabits = habits.filter(h => h.type === 'bad');

    // 30 day heatmap generator
    const generateHeatmap = (checkIns) => {
      const days = [];
      for(let i=29; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const count = checkIns.filter(ci => new Date(ci).setHours(0,0,0,0) === d.getTime()).length;
        days.push({ date: d, count });
      }
      return days;
    };

    return (
      <div className="animate-fadeIn space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <BarChart3 className="text-emerald-500" /> Objective Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customGoodHabits.map(habit => {
              const heatmap = generateHeatmap(habit.checkIns || []);
              return (
                <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
                  <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">{habit.icon} {habit.name}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
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
                  <div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">30-Day Activity</div>
                    <div className="flex gap-1 flex-wrap">
                      {heatmap.map((d, i) => (
                        <div key={i} title={d.date.toDateString()} className={`w-3 h-3 rounded-sm ${d.count > 0 ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-[#333]'}`} style={{ opacity: d.count > 0 ? Math.min(1, 0.4 + (d.count * 0.3)) : 1 }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <AlertTriangle className="text-rose-500" /> Vice Eradication Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badHabits.map(habit => (
              <div key={habit._id} className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">{habit.icon} {habit.name}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl text-center border border-rose-100 dark:border-rose-900/30">
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{habit.totalRelapses || 0}</div>
                    <div className="text-[10px] font-bold text-rose-500/70 uppercase mt-1">Total Relapses</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#252525] p-4 rounded-xl text-center border border-gray-100 dark:border-[#333]">
                    <div className="text-2xl font-black text-gray-900 dark:text-white">
                       {Math.floor((new Date() - new Date(habit.startDate)) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Days Clean</div>
                  </div>
                </div>
                {habit.journal && habit.journal.filter(j => j.type === 'relapse').length > 0 && (
                  <div className="mt-4">
                    <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Recent Relapse Triggers</div>
                    <div className="space-y-2">
                      {habit.journal.filter(j => j.type === 'relapse').slice(-3).reverse().map((j, i) => (
                         <div key={i} className="text-xs flex justify-between bg-gray-50 dark:bg-[#252525] p-2 rounded-lg">
                           <span className="font-bold text-gray-700 dark:text-gray-300">{j.trigger}</span>
                           <span className="text-gray-400">{new Date(j.date).toLocaleDateString()}</span>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center p-20"><Activity className="animate-spin text-brand-blue" size={32} /></div>;
    switch (activeTab) {
      case 'Habits-Overview': return renderOverview();
      case 'Habits-Namaz': return renderNamaz();
      case 'Habits-Tracker': return renderActiveTracker();
      case 'Habits-Analytics': return renderAnalytics();
      default: return renderOverview();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
      {renderContent()}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
            <div className="p-6 border-b border-gray-100 dark:border-[#333] flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditMode ? 'Edit Protocol' : 'New Protocol'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSaveHabit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Type Toggle */}
              {!isEditMode && (
                <div className="flex bg-gray-100 dark:bg-[#252525] p-1 rounded-xl">
                  <button type="button" onClick={() => setNewHabitType('good')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newHabitType === 'good' ? 'bg-white dark:bg-[#333] shadow-sm text-brand-blue' : 'text-gray-500'}`}>Target Objective</button>
                  <button type="button" onClick={() => setNewHabitType('bad')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${newHabitType === 'bad' ? 'bg-white dark:bg-[#333] shadow-sm text-rose-500' : 'text-gray-500'}`}>Eradicate Vice</button>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Protocol Name</label>
                <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder={newHabitType === 'good' ? 'e.g. Read 10 Pages' : 'e.g. Doomscrolling'} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-brand-blue dark:text-white transition-colors" required />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(c => (
                    <div key={c.id} onClick={() => setCategory(c.id)} className={`cursor-pointer text-center py-2 rounded-xl text-xs font-bold border transition-all ${category === c.id ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent' : 'bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-[#333] text-gray-500'}`}>
                      {c.icon} {c.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Icon & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Icon</label>
                  <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none dark:text-white appearance-none">
                    {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Color Accent</label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full cursor-pointer transition-all ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : ''}`} style={{ backgroundColor: c }}></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Good Habit Fields */}
              {newHabitType === 'good' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Schedule Days</label>
                    <div className="flex justify-between">
                      {DAYS.map((d, i) => (
                        <div key={i} onClick={() => toggleDay(i)} className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer text-xs font-bold transition-all ${scheduleDays.includes(i) ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-[#333] text-gray-400'}`}>
                          {d[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Times Per Day</label>
                      <input type="number" min="1" max="20" value={targetPerDay} onChange={(e) => setTargetPerDay(e.target.value)} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-brand-blue dark:text-white transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Days Per Week</label>
                      <input type="number" min="1" max="7" value={targetPerWeek} onChange={(e) => setTargetPerWeek(e.target.value)} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-brand-blue dark:text-white transition-colors" />
                    </div>
                  </div>
                </>
              )}

              {/* Bad Habit Fields */}
              {newHabitType === 'bad' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Eradication Strategy</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div onClick={() => setStrategy('cold_turkey')} className={`p-3 rounded-xl border-2 cursor-pointer transition-colors text-center ${strategy === 'cold_turkey' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E]'}`}>
                        <div className="font-bold text-sm dark:text-white">Zero Tolerance</div>
                        <div className="text-xs text-gray-500 mt-1">No exceptions</div>
                      </div>
                      <div onClick={() => setStrategy('moderation')} className={`p-3 rounded-xl border-2 cursor-pointer transition-colors text-center ${strategy === 'moderation' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#1E1E1E]'}`}>
                        <div className="font-bold text-sm dark:text-white">Moderation</div>
                        <div className="text-xs text-gray-500 mt-1">Gradual reduction</div>
                      </div>
                    </div>
                  </div>
                  {strategy === 'moderation' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allowed uses per week</label>
                      <input type="number" min="1" max="10" value={allowancePerWeek} onChange={(e) => setAllowancePerWeek(e.target.value)} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-brand-blue dark:text-white transition-colors" />
                    </div>
                  )}
                  <div>
                     <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Replacement Habit (Optional)</label>
                     <input type="text" value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="e.g. Read 5 pages instead" className="w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 dark:text-white transition-colors" />
                  </div>
                </>
              )}

              <button type="submit" className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1">
                {isEditMode ? 'Save Changes' : 'Save Protocol'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Relapse Journal Modal */}
      {relapseModal.isOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slideUp">
             <div className="p-6 border-b border-gray-100 dark:border-[#333]">
               <h2 className="text-xl font-bold text-rose-600 flex items-center gap-2"><AlertTriangle/> Log Relapse</h2>
             </div>
             <div className="p-6 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">What triggered this?</label>
                 <select value={relapseTrigger} onChange={e => setRelapseTrigger(e.target.value)} className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none dark:text-white">
                    {RELAPSE_TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
                 <textarea value={relapseNote} onChange={e => setRelapseNote(e.target.value)} placeholder="How can you prevent this next time?" className="w-full bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none dark:text-white resize-none h-24"></textarea>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setRelapseModal({ isOpen: false, id: null })} className="flex-1 bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300 font-bold py-3 rounded-xl">Cancel</button>
                 <button onClick={submitRelapse} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/30">Submit Log</button>
               </div>
             </div>
           </div>
         </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-slideUp">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} className="text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-500 mb-8">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#333] hover:bg-gray-200 dark:hover:bg-[#444] transition-colors">Cancel</button>
                <button onClick={executeConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 ${confirmDialog.btnStyle}`}>{confirmDialog.confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}