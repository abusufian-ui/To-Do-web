import React, { useState, useEffect } from 'react';
import { 
  Users, Server, Activity, Search, Trash2, 
  Shield, AlertCircle, HardDrive, Cpu, Cloud, Eye, EyeOff
} from 'lucide-react';

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
      <div className="absolute inset-0 border-t border-b border-gray-100/10 flex justify-between">
        {[...Array(5)].map((_, i) => <div key={i} className="h-full w-px bg-gray-100/5"></div>)}
      </div>
    </div>
  );
};

// 2. Storage Bar Component
const StorageBar = ({ label, used, total, color }) => {
  const percentage = Math.min((used / total) * 100, 100);
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400 font-medium flex items-center gap-2">{label}</span>
        <span className="text-gray-300 font-bold">{used}MB <span className="text-gray-600">/ {total}MB</span></span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

// 3. User Row Component (Handles Password Toggle)
const UserRow = ({ u, onDelete }) => {
  const [showPass, setShowPass] = useState(false);

  return (
    <tr className="hover:bg-[#1c1c1f] transition-colors group">
      
      {/* USER IDENTITY */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-lg">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white flex items-center gap-2">
              {u.name}
              {u.isAdmin && <span className="text-[9px] bg-red-900/30 text-red-500 px-1.5 py-0.5 rounded border border-red-900/50">ADMIN</span>}
            </p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      </td>

      {/* PORTAL STATUS */}
      <td className="px-6 py-4">
        {u.isPortalConnected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-900/20 text-emerald-500 border border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Pending
          </span>
        )}
      </td>

      {/* CREDENTIALS (WITH TOGGLE) */}
      <td className="px-6 py-4">
        <div className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 w-fit min-w-[220px]">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">
            <Cloud size={10} /> Portal Credentials
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-gray-300 font-mono bg-[#151518] px-2 py-1 rounded border border-[#27272a]">
              <span>ID:</span>
              <span className="text-blue-400">{u.portalId || "N/A"}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-300 font-mono bg-[#151518] px-2 py-1 rounded border border-[#27272a]">
              <span>Pass:</span>
              <div className="flex items-center gap-2">
                <span className={showPass ? "text-emerald-400" : "text-gray-500 tracking-widest"}>
                  {u.portalPassword ? (showPass ? u.portalPassword : '••••••••') : 'N/A'}
                </span>
                {u.portalPassword && (
                  <button 
                    onClick={() => setShowPass(!showPass)} 
                    className="text-gray-500 hover:text-white transition-colors focus:outline-none"
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
          <span className="text-xs font-bold text-gray-600 flex items-center justify-end gap-1">
            <Shield size={12} /> Protected
          </span>
        ) : (
          <button 
            onClick={() => onDelete(u._id)}
            className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-900/10 transition-all"
            title="Delete User"
          >
            <Trash2 size={18} />
          </button>
        )}
      </td>

    </tr>
  );
};

// --- MAIN DASHBOARD ---
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Real-time Mock Data
  const [cpuData, setCpuData] = useState(new Array(20).fill(20));
  const [memoryData, setMemoryData] = useState(new Array(20).fill(40));
  const [systemHealth, setSystemHealth] = useState('Optimal');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if(!window.confirm("Are you sure? This action is irreversible.")) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      setUsers(users.filter(u => u._id !== id));
    } catch (error) {
      alert("Failed to delete user");
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(() => {
      setCpuData(prev => [...prev.slice(1), Math.floor(Math.random() * 30) + 10]);
      setMemoryData(prev => [...prev.slice(1), Math.floor(Math.random() * 20) + 30]);
      if(Math.random() > 0.95) setSystemHealth('Syncing...');
      else setSystemHealth('Optimal');
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const dbUsed = (users.length * 15) + 50; 
  const totalStorage = 512; 

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-[#0c0c0c] text-white animate-fadeIn pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Shield className="text-red-600 fill-red-600/10" size={32} />
            Admin Command Center
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Status: <span className="text-green-500">{systemHealth}</span>
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative group w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search students..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 outline-none focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* --- METRICS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* SERVER LOAD */}
        <div className="bg-[#151518] border border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Server Load</p>
              <h3 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                {cpuData[cpuData.length - 1]}% <span className="text-xs font-normal text-gray-500">CPU Usage</span>
              </h3>
            </div>
            <div className="p-2 bg-blue-900/20 rounded-lg text-blue-500"><Cpu size={20} /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50">
            <LiveGraph data={cpuData} color="#3b82f6" />
          </div>
        </div>

        {/* STORAGE */}
        <div className="bg-[#151518] border border-[#27272a] rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Storage Metrics</p>
              <h3 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                {totalStorage - dbUsed} MB <span className="text-xs font-normal text-gray-500">Free</span>
              </h3>
            </div>
            <div className="p-2 bg-purple-900/20 rounded-lg text-purple-500"><HardDrive size={20} /></div>
          </div>
          <StorageBar label="MongoDB Database" used={dbUsed} total={totalStorage} color="bg-purple-600" />
          <StorageBar label="Assets & Cache" used={45} total={200} color="bg-gray-600" />
        </div>

        {/* ACTIVE USERS */}
        <div className="bg-[#151518] border border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-lg">
           <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Active Sessions</p>
              <h3 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                {users.length} <span className="text-xs font-normal text-gray-500">Registered Users</span>
              </h3>
            </div>
            <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-500"><Activity size={20} /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50">
            <LiveGraph data={memoryData} color="#10b981" />
          </div>
        </div>

      </div>

      {/* --- USER TABLE --- */}
      <div className="bg-[#151518] border border-[#27272a] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#27272a] flex justify-between items-center">
          <h3 className="font-bold text-gray-200 flex items-center gap-2">
            <Users size={18} className="text-blue-500" /> User Directory
          </h3>
          <span className="text-xs font-mono text-gray-500 bg-[#27272a] px-2 py-1 rounded">Total: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-[#1c1c1f] border-b border-[#27272a]">
              <tr>
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Portal Status</th>
                <th className="px-6 py-4">Credentials</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500 animate-pulse">Loading data stream...</td></tr>
              ) : filteredUsers.map((u) => (
                <UserRow key={u._id} u={u} onDelete={handleDeleteUser} />
              ))}
            </tbody>
          </table>
        </div>
        
        {!loading && filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No users found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;