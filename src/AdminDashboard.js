import React, { useState, useEffect } from 'react';
import {
  Users, Activity, Search, Trash2,
  Shield, HardDrive, Cpu, Cloud, Eye, EyeOff, AlertTriangle, X
} from 'lucide-react';



const API_BASE = process.env.REACT_APP_API_URL || '';

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
  // If percentage is passed directly, use it, otherwise calculate
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
  const [showPass, setShowPass] = useState(false);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-[#1c1c1f] transition-colors group border-b border-gray-100 dark:border-[#27272a]">

      {/* USER IDENTITY */}
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

      {/* PORTAL STATUS */}
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

      {/* CREDENTIALS */}
      <td className="px-6 py-4">
        <div className="bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 w-fit min-w-[220px]">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">
            <Cloud size={10} /> Portal Credentials
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 font-mono bg-white dark:bg-[#151518] px-2 py-1 rounded border border-gray-200 dark:border-[#27272a]">
              <span className="text-gray-500">ID:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{u.portalId || "N/A"}</span>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-700 dark:text-gray-300 font-mono bg-white dark:bg-[#151518] px-2 py-1 rounded border border-gray-200 dark:border-[#27272a]">
              <span className="text-gray-500">Pass:</span>
              <div className="flex items-center gap-2">
                <span className={showPass ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500 tracking-widest"}>
                  {u.portalPassword ? (showPass ? u.portalPassword : '••••••••') : 'N/A'}
                </span>
                {u.portalPassword && (
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors focus:outline-none"
                    title={showPass ? "Hide Password" : "Show Password"}
                  >
                    {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* ACTIONS */}
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [userToDelete, setUserToDelete] = useState(null);

  // Stats State
  const [cpuData, setCpuData] = useState(new Array(20).fill(0));
  const [memoryData, setMemoryData] = useState(new Array(20).fill(0));
  const [realDbSize, setRealDbSize] = useState(0);
  const [totalMemory, setTotalMemory] = useState(1);
  const [systemHealth, setSystemHealth] = useState('Syncing...');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
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

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchRealStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/admin/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      setUsers(users.filter(u => u._id !== userToDelete));
      setUserToDelete(null); // Close modal
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  const currentCpu = cpuData[cpuData.length - 1] || 0;
  const dbLimitBytes = 512 * 1024 * 1024;
  const dbPercentage = Math.min((realDbSize / dbLimitBytes) * 100, 100);

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white animate-fadeIn pb-24 transition-colors duration-300">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
            <Shield className="text-red-600 fill-red-600/10" size={32} />
            Admin Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${systemHealth === 'Optimal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            System Status: <span className={systemHealth === 'Optimal' ? "text-green-600 dark:text-green-500" : "text-red-500"}>{systemHealth}</span>
          </p>
        </div>
        <div className="relative group w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all shadow-sm" />
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* CPU */}
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

        {/* STORAGE */}
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

        {/* MEMORY */}
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
                <th className="px-6 py-4">Credentials</th>
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

      {/* --- CUSTOM PORTAL CONFIRMATION MODAL --- */}
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