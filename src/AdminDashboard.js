import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Activity, Search, Trash2,
  Shield, HardDrive, Cpu, AlertTriangle, X,
  ShieldAlert, Lock, ShieldCheck, Mail, KeyRound, CheckCircle2
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- COMPONENTS ---

// 1. Live Line Graph Component
const LiveGraph = ({ data, color = "#3b82f6" }) => {
  const max = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val / max) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative h-32 w-full overflow-hidden">
      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#gradient-${color})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-0 border-t border-b border-gray-200/50 dark:border-gray-100/10 flex justify-between">
        {[...Array(5)].map((_, i) => <div key={i} className="h-full w-px bg-gray-200/50 dark:bg-gray-100/5"></div>)}
      </div>
    </div>
  );
};

// 2. Storage Bar Component
const StorageBar = ({ label, used, total, color, percentage }) => {
  const pct = percentage !== undefined ? percentage : Math.min((used / total) * 100, 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">{label}</span>
        <span className="text-gray-700 dark:text-gray-300 font-bold">{used} <span className="text-gray-400 dark:text-gray-600">/ {total}</span></span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        ></div>
      </div>
    </div>
  );
};

// 3. User Row Component
const UserRow = ({ u, onInitiateDelete }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-[#1c1c1f] transition-colors group border-b border-gray-100 dark:border-[#27272a]">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-gray-700 dark:text-white font-bold text-lg shadow-sm">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {u.name}
              {u.isAdmin && <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50">ADMIN</span>}
            </p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        {u.isPortalConnected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div> Pending
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {u.isPortalConnected ? (
            <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-200">
                    {u.lastSyncAt 
                        ? new Date(u.lastSyncAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                        : 'Waiting for extension...'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 uppercase tracking-wider font-bold">
                    Extension Active
                </span>
            </div>
        ) : (
            <span className="text-sm text-gray-500 italic">No data synced</span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        {u.email === "ranasuffyan9@gmail.com" ? (
          <span className="text-xs font-bold text-gray-400 dark:text-gray-600 flex items-center justify-end gap-1">
            <Shield size={12} /> Protected
          </span>
        ) : (
          <button
            onClick={() => onInitiateDelete(u._id)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-500 dark:hover:bg-red-900/10 transition-all"
            title="Delete User"
          >
            <Trash2 size={18} />
          </button>
        )}
      </td>
    </tr>
  );
};

// --- HELPER ---
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- MAIN DASHBOARD ---
const AdminDashboard = () => {
  const token = localStorage.getItem('token');

  // --- SECURITY PIN STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
  
  const [changePinModal, setChangePinModal] = useState({ isOpen: false, step: 'otp' }); 
  
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [modalError, setModalError] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const newPinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  // --- DASHBOARD STATE ---
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);

  const [cpuData, setCpuData] = useState(new Array(20).fill(0));
  const [memoryData, setMemoryData] = useState(new Array(20).fill(0));
  const [realDbSize, setRealDbSize] = useState(0);
  const [totalMemory, setTotalMemory] = useState(1);
  const [systemHealth, setSystemHealth] = useState('Syncing...');

  useEffect(() => {
    if (isUnlocked) {
      fetchUsers();
      fetchRealStats(); 
      const interval = setInterval(fetchRealStats, 2000);
      return () => clearInterval(interval);
    }
  }, [isUnlocked]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
      setLoading(false);
    } catch (e) { console.error("User Fetch Error"); }
  };

  const fetchRealStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/system-stats`);
      if (res.ok) {
        const stats = await res.json();
        setCpuData(prev => [...prev.slice(1), stats.cpu]);
        const memUsagePercent = (stats.memory.active / stats.memory.total) * 100;
        setMemoryData(prev => [...prev.slice(1), memUsagePercent]);
        setTotalMemory(stats.memory.total);
        setRealDbSize(stats.dbSize);
        setSystemHealth('Optimal');
      }
    } catch (e) { setSystemHealth('Offline'); }
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await fetch(`${API_BASE}/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      setUsers(users.filter(u => u._id !== userToDelete));
      setUserToDelete(null); 
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  // --- PIN LOGIC (4 Digits) ---
  const handlePinChange = (index, value, refs, stateSetter, stateValue) => {
    if (!/^\d*$/.test(value)) return; 
    const newPinState = [...stateValue];
    newPinState[index] = value;
    stateSetter(newPinState);
    setPinError(false);
    setModalError('');

    if (value && index < 3) {
      refs[index + 1].current.focus();
    }
  };

  const handlePinKeyDown = (index, e, refs, stateSetter, stateValue) => {
    if (e.key === 'Backspace' && !stateValue[index] && index > 0) {
      refs[index - 1].current.focus();
    }
    if (e.key === 'Enter' && index === 3 && stateValue.every(v => v !== '')) {
      if (refs === inputRefs) verifyPin(stateValue.join(''));
    }
  };

  const verifyPin = async (fullPin) => {
    setIsPinLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ pin: fullPin })
      });
      if (res.ok) {
        setIsUnlocked(true);
      } else {
        setPinError(true);
        setPinInput(['', '', '', '']);
        inputRefs[0].current.focus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPinLoading(false);
    }
  };

  // --- OTP LOGIC (6 Digits) ---
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    setModalError('');

    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData) {
      const newOtp = [...otpInput];
      for (let i = 0; i < pastedData.length; i++) {
        if (i < 6) newOtp[i] = pastedData[i];
      }
      setOtpInput(newOtp);
      setModalError('');
      const nextFocusIndex = Math.min(pastedData.length, 5);
      if (otpRefs[nextFocusIndex]) otpRefs[nextFocusIndex].current.focus();
    }
  };

  // --- CHANGE PIN FLOW ---
  const requestChangePin = async () => {
    setModalError('');
    setOtpInput(['', '', '', '', '', '']);
    setNewPin(['', '', '', '']);
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/request-pin-otp`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (res.ok) {
        setChangePinModal({ isOpen: true, step: 'otp' });
      } else {
        setModalError('Failed to send OTP.');
      }
    } catch (err) { console.error(err); }
  };

  const verifyOtpAndProceed = async (e) => {
    e.preventDefault();
    if (otpInput.join('').length < 6) return setModalError("Please enter the full 6-digit OTP.");
    setModalError('');
    setChangePinModal({ isOpen: true, step: 'new_pin' });
  };

  const confirmNewPin = async () => {
    const fullNewPin = newPin.join('');
    if (fullNewPin.length < 4) return setModalError("Please enter all 4 digits.");
    
    setIsPinLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/change-pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ otp: otpInput.join(''), newPin: fullNewPin })
      });
      if (res.ok) {
        alert("Security PIN successfully changed!");
        setChangePinModal({ isOpen: false, step: 'otp' });
        setOtpInput(['', '', '', '', '', '']);
        setNewPin(['', '', '', '']);
      } else {
        setModalError((await res.json()).message || "Failed to update PIN.");
      }
    } catch (err) { console.error(err); }
    setIsPinLoading(false);
  };

  // --- RENDER LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden animate-fadeIn">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        
        <div className={`relative z-10 w-full max-w-sm p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-[#222] shadow-2xl flex flex-col items-center transition-transform ${pinError ? 'animate-shake border-red-500/50 shadow-red-500/10' : ''}`}>
          
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert size={36} className="text-red-500" />
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Restricted Access</h2>
          {/* Default PIN Text removed! */}
          <p className="text-gray-400 text-sm text-center mb-8">Enter your 4-digit security PIN to access the Admin Command Center.</p>
          
          <div className="flex gap-4 mb-8">
            {pinInput.map((digit, i) => (
              <input
                key={i}
                ref={inputRefs[i]}
                type="password"
                maxLength={1}
                value={digit}
                autoComplete="new-password" // <-- FIX: Stops Chrome Autofill
                name={`admin-pin-${i}`}
                onChange={(e) => handlePinChange(i, e.target.value, inputRefs, setPinInput, pinInput)}
                onKeyDown={(e) => handlePinKeyDown(i, e, inputRefs, setPinInput, pinInput)}
                className={`w-14 h-16 text-center text-2xl font-black bg-[#121212] border-2 rounded-xl outline-none transition-all text-white
                  ${digit ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#333] focus:border-red-500/50'}
                  ${pinError ? 'border-red-600 bg-red-950/20 text-red-500' : ''}
                `}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button 
            onClick={() => verifyPin(pinInput.join(''))}
            disabled={pinInput.some(v => v === '') || isPinLoading}
            className="w-full py-4 rounded-xl font-bold bg-white hover:bg-gray-100 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPinLoading ? <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span> : <><Lock size={18}/> Authorize Access</>}
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.4s ease-in-out; }
        `}</style>
      </div>
    );
  }

  // --- RENDER UNLOCKED DASHBOARD ---
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
  const currentCpu = cpuData[cpuData.length - 1] || 0;
  const dbLimitBytes = 512 * 1024 * 1024;
  const dbPercentage = Math.min((realDbSize / dbLimitBytes) * 100, 100);

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white animate-fadeIn pb-24 transition-colors duration-300">

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
            <ShieldCheck className="text-red-600 fill-red-600/10" size={32} />
            Admin Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${systemHealth === 'Optimal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            System Status: <span className={systemHealth === 'Optimal' ? "text-green-600 dark:text-green-500" : "text-red-500"}>{systemHealth}</span>
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={requestChangePin}
            className="flex items-center gap-2 bg-white dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
          >
            <KeyRound size={16} /> Security Settings
          </button>
          
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              autoComplete="off" // <-- FIX: Stops Chrome Autofill
              name="admin-user-search"
              className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all shadow-sm" 
            />
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Real-time Load</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                {currentCpu}% <span className="text-xs font-normal text-gray-500">CPU Usage</span>
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-500 rounded-lg"><Cpu size={20} /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={cpuData} color="#3b82f6" /></div>
        </div>

        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Storage Metrics</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                {formatBytes(realDbSize)} <span className="text-xs font-normal text-gray-500">Database Size</span>
              </h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-500 rounded-lg"><HardDrive size={20} /></div>
          </div>
          <StorageBar label="MongoDB Data" used={formatBytes(realDbSize)} total="512 MB" color="bg-purple-500 dark:bg-purple-600" percentage={dbPercentage} />
          <StorageBar label="Server RAM" used={formatBytes((memoryData[memoryData.length - 1] / 100) * totalMemory)} total={formatBytes(totalMemory)} color="bg-gray-400 dark:bg-gray-600" percentage={memoryData[memoryData.length - 1]} />
        </div>

        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Active Memory</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                {Math.round(memoryData[memoryData.length - 1]) || 0}% <span className="text-xs font-normal text-gray-500">RAM Usage</span>
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500 rounded-lg"><Activity size={20} /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={memoryData} color="#10b981" /></div>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-lg overflow-hidden transition-colors">
        <div className="p-5 border-b border-gray-200 dark:border-[#27272a] flex justify-between items-center bg-gray-50 dark:bg-[#151518]">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Users size={18} className="text-blue-500" /> User Directory</h3>
          <span className="text-xs font-mono text-gray-500 bg-white dark:bg-[#27272a] border border-gray-200 dark:border-transparent px-2 py-1 rounded">Total: {users.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-[#1c1c1f] border-b border-gray-200 dark:border-[#27272a]">
              <tr>
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Portal Status</th>
                <th className="px-6 py-4">Last Sync Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#27272a]">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500 animate-pulse">Loading data stream...</td></tr>
              ) : filteredUsers.map((u) => <UserRow key={u._id} u={u} onInitiateDelete={setUserToDelete} />)}
            </tbody>
          </table>
        </div>
        {!loading && filteredUsers.length === 0 && <div className="p-8 text-center text-gray-500">No users found matching "{search}"</div>}
      </div>

      {/* --- CHANGE PIN MODAL --- */}
      {changePinModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] w-full max-w-md rounded-3xl border border-[#333] shadow-2xl overflow-hidden animate-slideUp">
            
            <div className="p-6 border-b border-[#222] flex justify-between items-center bg-[#1A1A1A]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound size={20} className="text-brand-blue" /> Update Security PIN</h3>
              <button onClick={() => {
                setChangePinModal({isOpen: false, step: 'otp'});
                setOtpInput(['', '', '', '', '', '']);
                setNewPin(['', '', '', '']);
              }} className="text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            {changePinModal.step === 'otp' ? (
              <form onSubmit={verifyOtpAndProceed} className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-4"><Mail size={28} className="text-blue-500"/></div>
                  <h4 className="text-lg font-bold text-white">Verification Required</h4>
                  <p className="text-sm text-gray-400 mt-1">We sent a 6-digit OTP to your admin email address.</p>
                </div>
                
                <div>
                  <div className="flex justify-center gap-2">
                    {otpInput.map((digit, i) => (
                      <input
                        key={`otp-${i}`}
                        ref={otpRefs[i]}
                        type="text"
                        maxLength={1}
                        value={digit}
                        autoComplete="off" // <-- FIX: Stops Chrome Autofill
                        name={`otp-box-${i}`}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={handleOtpPaste}
                        className={`w-11 h-14 text-center text-xl font-black bg-[#1A1A1A] border-2 rounded-xl outline-none transition-all text-white
                          ${digit ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-[#333] focus:border-blue-500/50'}
                        `}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  {modalError && <p className="text-red-500 text-xs text-center font-bold mt-4">{modalError}</p>}
                </div>

                <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all">Verify Identity</button>
              </form>
            ) : (
              <div className="p-6 space-y-6 text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4"><Lock size={28} className="text-emerald-500"/></div>
                <h4 className="text-lg font-bold text-white">Set New PIN</h4>
                <p className="text-sm text-gray-400 mt-1">Enter a new 4-digit code to secure the dashboard.</p>
                
                <div className="flex justify-center gap-3 my-4">
                  {newPin.map((digit, i) => (
                    <input
                      key={`newpin-${i}`}
                      ref={newPinRefs[i]}
                      type="password"
                      maxLength={1}
                      value={digit}
                      autoComplete="new-password" // <-- FIX: Stops Chrome Autofill
                      name={`new-admin-pin-${i}`}
                      onChange={(e) => handlePinChange(i, e.target.value, newPinRefs, setNewPin, newPin)}
                      onKeyDown={(e) => handlePinKeyDown(i, e, newPinRefs, setNewPin, newPin)}
                      className={`w-14 h-16 text-center text-2xl font-black bg-[#1A1A1A] border-2 rounded-xl outline-none transition-all text-white ${digit ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-[#333] focus:border-emerald-500/50'}`}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                {modalError && <p className="text-red-500 text-xs text-center font-bold mt-2">{modalError}</p>}

                <button 
                  onClick={confirmNewPin} 
                  disabled={newPin.some(v => v === '') || isPinLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex justify-center items-center"
                >
                  {isPinLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Save Security PIN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] p-6 animate-slideUp relative">

            <button
              onClick={() => setUserToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
                <AlertTriangle size={28} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete User?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this user? This action is <strong className="text-red-500">irreversible</strong> and will wipe all their associated data.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2C2C2C] hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;