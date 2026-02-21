import React, { useState, useEffect } from 'react';
import { Activity, Flame, Skull, Plus, CheckCircle2, RotateCcw, Trash2, Quote, AlertTriangle, Target, ShieldAlert } from 'lucide-react';

const quotes = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
  { text: "Success is the product of daily habits—not once-in-a-lifetime transformations.", author: "James Clear" }
];

const HabitTracker = () => {
  const [habits, setHabits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(quotes[0]);
  
  // Advanced Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('good');
  const [frequency, setFrequency] = useState('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(3);
  const [strategy, setStrategy] = useState('cold_turkey');
  const [allowancePerWeek, setAllowancePerWeek] = useState(1);
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, type: null, id: null, title: '', message: '', confirmText: '', btnStyle: ''
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000'; 
  const token = localStorage.getItem('token');

  useEffect(() => {
    setActiveQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/habits`, { headers: { 'x-auth-token': token } });
      if (res.ok) setHabits(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const payload = {
      name: newHabitName,
      type: newHabitType,
      frequency: newHabitType === 'good' ? frequency : undefined,
      targetPerWeek: newHabitType === 'good' && frequency === 'weekly' ? targetPerWeek : 7,
      strategy: newHabitType === 'bad' ? strategy : undefined,
      allowancePerWeek: newHabitType === 'bad' && strategy === 'moderation' ? allowancePerWeek : 0
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
      }
    } catch (err) { console.error(err); }
  };

  // --- ACTIONS & CONFIRMATIONS ---
  const triggerDelete = (id) => setConfirmDialog({ isOpen: true, type: 'delete', id, title: 'Delete Protocol', message: 'Erase this tracker completely?', confirmText: 'Delete', btnStyle: 'bg-red-600' });
  const triggerReset = (id) => setConfirmDialog({ isOpen: true, type: 'reset', id, title: 'Relapse Detected', message: 'This will reset your clean streak to zero.', confirmText: 'Confirm Relapse', btnStyle: 'bg-rose-600' });
  const triggerCheat = (id) => setConfirmDialog({ isOpen: true, type: 'cheat', id, title: 'Use Allowance', message: 'Use one of your weekly allowed exceptions? Your main streak will NOT reset.', confirmText: 'Use Allowance', btnStyle: 'bg-orange-500' });

  // --- UPDATED FOR SOFT DELETE & AWAIT RESOLUTION ---
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
          setHabits(habits.map(h => h._id === id ? updatedHabit : h));
        }
      } else if (type === 'cheat') {
        const res = await fetch(`${API_BASE}/api/habits/${id}/cheat`, { method: 'PUT', headers: { 'x-auth-token': token } });
        if (res.ok) {
          const updatedHabit = await res.json();
          setHabits(habits.map(h => h._id === id ? updatedHabit : h));
        }
      }
    } catch (err) { console.error(err); }
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleCheckInGoodHabit = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/habits/${id}/checkin`, { method: 'PUT', headers: { 'x-auth-token': token } });
      if (res.ok) {
        const updatedHabit = await res.json();
        setHabits(habits.map(h => h._id === id ? updatedHabit : h));
      }
    } catch (err) { console.error(err); }
  };

  // --- HELPER FUNCTIONS ---
  const isThisWeek = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0,0,0,0);
    return date >= startOfWeek;
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
      <div className="flex gap-2 text-center my-3">
        <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-lg p-2"><div className="text-xl font-black text-rose-500">{time.days}</div><div className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Days</div></div>
        <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-lg p-2"><div className="text-xl font-black text-rose-400">{String(time.hours).padStart(2,'0')}</div><div className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Hrs</div></div>
        <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-lg p-2"><div className="text-xl font-black text-rose-400">{String(time.mins).padStart(2,'0')}</div><div className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Min</div></div>
        <div className="flex-1 bg-black/5 dark:bg-black/40 rounded-lg p-2"><div className="text-xl font-black text-rose-300">{String(time.secs).padStart(2,'0')}</div><div className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Sec</div></div>
      </div>
    );
  };

  const goodHabits = habits.filter(h => h.type === 'good');
  const badHabits = habits.filter(h => h.type === 'bad');

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-[#121212] transition-colors duration-300 animate-fadeIn overflow-auto custom-scrollbar relative">
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-900 to-black p-8 md:p-12 shrink-0 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight flex items-center justify-center md:justify-start gap-3">
              <Activity className="text-blue-400" size={36} /> Habit Protocol
            </h1>
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl inline-block text-left">
              <Quote className="absolute -top-3 -left-3 text-blue-400/50" size={32} />
              <p className="text-blue-50 font-medium text-lg leading-relaxed italic pr-4">"{activeQuote.text}"</p>
            </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="group flex items-center gap-2 bg-white text-indigo-900 px-6 py-3.5 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shrink-0">
            <Plus size={20} className="group-hover:rotate-90 transition-transform" /> Establish Protocol
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col xl:flex-row gap-8">
        
        {/* LEFT COLUMN: BAD HABITS */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl"><Skull size={24} /></div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Eradicate Weakness</h2>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {badHabits.map(habit => {
              const cheatsThisWeek = (habit.cheatDays || []).filter(isThisWeek).length;
              const allowancesLeft = Math.max(0, (habit.allowancePerWeek || 0) - cheatsThisWeek);
              const isModeration = habit.strategy === 'moderation';

              return (
                <div key={habit._id} className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm hover:shadow-xl transition-shadow p-5 group flex flex-col">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-orange-500 rounded-l-2xl"></div>
                  
                  <div className="flex justify-between items-start mb-2 pl-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{habit.name}</h3>
                      {isModeration && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-md">
                          <ShieldAlert size={12} /> Moderation ({allowancesLeft} Allowances Left)
                        </span>
                      )}
                    </div>
                    <button onClick={() => triggerDelete(habit._id)} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  </div>
                  
                  <div className="pl-2 flex-1">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-3">Clean Since</p>
                    <LiveTimer startDate={habit.startDate} />
                  </div>

                  <div className={`mt-3 flex gap-2 pl-2 ${isModeration ? '' : 'justify-center'}`}>
                    {isModeration && (
                      <button onClick={() => triggerCheat(habit._id)} disabled={allowancesLeft <= 0} className={`flex-1 py-2.5 rounded-lg font-bold text-xs flex justify-center items-center gap-2 transition-all ${allowancesLeft > 0 ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-gray-100 text-gray-400 dark:bg-[#222] cursor-not-allowed'}`}>
                        Use Allowance
                      </button>
                    )}
                    <button onClick={() => triggerReset(habit._id)} className={`${isModeration ? 'flex-1' : 'w-full'} py-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs flex justify-center items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors`}>
                      <RotateCcw size={14} /> Full Relapse
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: GOOD HABITS */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"><Flame size={24} /></div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Forge Discipline</h2>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {goodHabits.map(habit => {
              const today = new Date().setHours(0,0,0,0);
              const isCheckedInToday = (habit.checkIns || []).some(d => new Date(d).setHours(0,0,0,0) === today);
              const isWeekly = habit.frequency === 'weekly';
              const checksThisWeek = (habit.checkIns || []).filter(isThisWeek).length;
              const progressPercent = isWeekly ? Math.min(100, (checksThisWeek / habit.targetPerWeek) * 100) : 0;

              return (
                <div key={habit._id} className="relative bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm hover:shadow-xl transition-shadow p-5 group flex flex-col">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-emerald-400 to-teal-500 rounded-l-2xl"></div>
                  
                  <div className="flex justify-between items-start pl-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{habit.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {!isWeekly && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md uppercase tracking-wider"><Flame size={12} /> Daily Streak: {habit.checkIns?.length || 0}</span>}
                        {isWeekly && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md uppercase tracking-wider"><Target size={12} /> Weekly Goal: {habit.targetPerWeek}</span>}
                      </div>
                    </div>
                    <button onClick={() => triggerDelete(habit._id)} className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  </div>

                  {isWeekly && (
                    <div className="pl-2 mt-4 mb-2">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1.5">
                        <span>WEEKLY PROGRESS</span>
                        <span className={checksThisWeek >= habit.targetPerWeek ? "text-emerald-500" : ""}>{checksThisWeek} / {habit.targetPerWeek}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-[#222] rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className={`mt-auto pt-4 border-t border-gray-100 dark:border-[#2C2C2C] pl-2`}>
                    <button 
                      onClick={() => handleCheckInGoodHabit(habit._id)} disabled={isCheckedInToday}
                      className={`w-full py-2.5 rounded-lg font-bold text-xs flex justify-center items-center gap-2 transition-all ${isCheckedInToday ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:-translate-y-0.5'}`}
                    >
                      <CheckCircle2 size={16} /> {isCheckedInToday ? "Logged Today" : "Check In"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- ADVANCED ADD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#333] animate-slideUp">
            <div className="p-6 border-b border-gray-100 dark:border-[#2A2A2A]">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">New Protocol</h3>
            </div>
            
            <form onSubmit={handleAddHabit} className="p-6 space-y-5">
              <div className="flex bg-gray-100 dark:bg-[#2C2C2C] rounded-xl p-1">
                <button type="button" onClick={() => setNewHabitType('good')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newHabitType === 'good' ? 'bg-white dark:bg-[#1A1A1A] text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Good Habit</button>
                <button type="button" onClick={() => setNewHabitType('bad')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newHabitType === 'bad' ? 'bg-white dark:bg-[#1A1A1A] text-rose-600 shadow-sm' : 'text-gray-500'}`}>Bad Habit</button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Protocol Name</label>
                <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder={newHabitType === 'good' ? "e.g. Read 10 pages..." : "e.g. Doomscrolling..."} className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" required autoFocus />
              </div>

              {/* Advanced Settings based on Type */}
              <div className="p-4 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-[#2A2A2A] space-y-4">
                {newHabitType === 'good' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Goal Frequency</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setFrequency('daily')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${frequency === 'daily' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'border-gray-200 dark:border-[#333] text-gray-500'}`}>Every Day</button>
                        <button type="button" onClick={() => setFrequency('weekly')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${frequency === 'weekly' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'border-gray-200 dark:border-[#333] text-gray-500'}`}>Weekly Target</button>
                      </div>
                    </div>
                    {frequency === 'weekly' && (
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Days per week:</label>
                        <input type="number" min="1" max="6" value={targetPerWeek} onChange={e => setTargetPerWeek(e.target.value)} className="w-16 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg p-1.5 text-center font-bold text-gray-900 dark:text-white focus:outline-none" />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Strategy</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setStrategy('cold_turkey')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${strategy === 'cold_turkey' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400' : 'border-gray-200 dark:border-[#333] text-gray-500'}`}>Cold Turkey</button>
                        <button type="button" onClick={() => setStrategy('moderation')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${strategy === 'moderation' ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' : 'border-gray-200 dark:border-[#333] text-gray-500'}`}>Moderation</button>
                      </div>
                    </div>
                    {strategy === 'moderation' && (
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Allowed uses per week:</label>
                        <input type="number" min="1" max="10" value={allowancePerWeek} onChange={e => setAllowancePerWeek(e.target.value)} className="w-16 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-lg p-1.5 text-center font-bold text-gray-900 dark:text-white focus:outline-none" />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5">Initialize</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- UNIVERSAL CONFIRMATION MODAL --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#333] animate-slideUp">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mb-4 text-gray-500 dark:text-gray-400">
                <AlertTriangle size={28} />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{confirmDialog.message}</p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#333] flex gap-3">
              <button onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} className="flex-1 py-3 font-bold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Cancel</button>
              <button onClick={executeConfirm} className={`flex-1 py-3 font-bold text-sm text-white rounded-xl shadow-lg transition-all ${confirmDialog.btnStyle}`}>{confirmDialog.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #333; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-slideUp { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default HabitTracker;