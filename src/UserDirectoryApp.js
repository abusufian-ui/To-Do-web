import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Activity, Search, Trash2, Shield, Eye, EyeOff,
  RefreshCw, BanIcon, UserCheck, Laptop, Smartphone, Chrome,
  Mail, Calendar, BookOpen, Layers, Database, ShieldAlert,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Lock
} from 'lucide-react';
import { ToastConfig } from './CustomToast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '15.00 KB'; // baseline fallback
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const UserAvatar = ({ pic, name, size = 10, isBlocked = false }) => {
  const sizeClasses = {
    7: 'w-7 h-7 text-xs',
    10: 'w-10 h-10 text-sm',
    16: 'w-16 h-16 text-lg',
    20: 'w-20 h-20 text-xl'
  };

  return (
    <div className={`relative ${sizeClasses[size] || 'w-10 h-10'} rounded-full overflow-hidden flex items-center justify-center font-bold bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shrink-0`}>
      {pic ? (
        <img src={pic} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{name ? name.charAt(0).toUpperCase() : '?'}</span>
      )}
      {isBlocked && (
        <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center backdrop-blur-[0.5px]">
          <BanIcon className="text-white w-4 h-4" />
        </div>
      )}
    </div>
  );
};

const UserDirectoryApp = ({ isSuperAdmin, token }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeSyncing, setActiveSyncing] = useState(0);
  const [webUsers, setWebUsers] = useState(0);
  const [mobileUsers, setMobileUsers] = useState(0);
  const [extensionUsers, setExtensionUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  // Operation states
  const [blockingId, setBlockingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [roleChangingId, setRoleChangingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [leaderboardId, setLeaderboardId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page to 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch counts/stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/stats`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setTotalUsers(data.totalUsers || 0);
        setActiveSyncing(data.activeSyncingUsers || 0);
        setWebUsers(data.webUsers || 0);
        setMobileUsers(data.mobileUsers || 0);
        setExtensionUsers(data.extensionUsers || 0);
      }
    } catch (err) {
      console.error("Failed to fetch user directory stats:", err);
    }
  };

  // Fetch paginated user list
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?page=${page}&limit=12&search=${encodeURIComponent(debouncedSearch)}`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        const usersList = data.users || [];
        setUsers(usersList);
        setTotalPages(data.pages || 1);

        // Auto-select first user if none selected or if previously selected user is no longer in view
        if (usersList.length > 0) {
          if (!selectedUser || !usersList.some(u => u._id === selectedUser._id)) {
            setSelectedUser(usersList[0]);
          } else {
            // Update selected user reference with latest data
            const updated = usersList.find(u => u._id === selectedUser._id);
            if (updated) setSelectedUser(updated);
          }
        } else {
          setSelectedUser(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user directory users:", err);
      ToastConfig.show({ title: 'Error', message: 'Failed to retrieve student directory.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Run on mount and search/page change
  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [page, debouncedSearch]);

  // Sync specific user's materials
  const triggerMaterialSync = async (u) => {
    setSyncingId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/trigger-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ userId: u._id, type: 'single_user_process' })
      });
      const data = await res.json();
      if (res.ok) {
        ToastConfig.show({ title: 'Sync Started', message: data.message || 'Scrape processor triggered.', type: 'success' });
        // Refresh local details
        fetchUsers();
      } else {
        ToastConfig.show({ title: 'Sync Failed', message: data.message || 'Failed to start sync.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Network communication failure.', type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  // Toggle user blocked state
  const toggleBlock = async (u) => {
    setBlockingId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/block`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isBlocked: data.isBlocked } : x));
        if (selectedUser?._id === u._id) {
          setSelectedUser(prev => ({ ...prev, isBlocked: data.isBlocked }));
        }
        ToastConfig.show({
          title: data.isBlocked ? 'Blocked' : 'Unblocked',
          message: `${u.name} status updated.`,
          type: data.isBlocked ? 'error' : 'success'
        });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to toggle block.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Failed to update block state.', type: 'error' });
    } finally {
      setBlockingId(null);
    }
  };

  // Delete User completely
  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${u.name}? This will wipe all associated data. This action is IRREVERSIBLE!`)) {
      return;
    }
    setDeletingId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        ToastConfig.show({ title: 'Deleted', message: `${u.name} has been removed.`, type: 'success' });
        fetchStats();
        fetchUsers();
      } else {
        const data = await res.json();
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to delete user.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Failed to connect to server.', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  // Promote / Demote Admin
  const toggleAdminRole = async (u) => {
    if (!window.confirm(`Are you sure you want to change the admin status for ${u.name}?`)) {
      return;
    }
    setRoleChangingId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/role`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isAdmin: data.isAdmin } : x));
        if (selectedUser?._id === u._id) {
          setSelectedUser(prev => ({ ...prev, isAdmin: data.isAdmin }));
        }
        ToastConfig.show({
          title: 'Role Updated',
          message: `${u.name} is ${data.isAdmin ? 'now an Admin' : 'no longer an Admin'}.`,
          type: 'success'
        });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to update role.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Server communication error.', type: 'error' });
    } finally {
      setRoleChangingId(null);
    }
  };

  // Toggle Leaderboard access
  const handleToggleLeaderboard = async (u) => {
    setLeaderboardId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/leaderboard-toggle`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isLeaderboardEnabled: data.isLeaderboardEnabled } : x));
        if (selectedUser?._id === u._id) {
          setSelectedUser(prev => ({ ...prev, isLeaderboardEnabled: data.isLeaderboardEnabled }));
        }
        ToastConfig.show({
          title: 'Leaderboard Access Updated',
          message: `Leaderboard access for ${u.name} has been ${data.isLeaderboardEnabled ? 'granted' : 'revoked'}.`,
          type: 'success'
        });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to toggle access.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Failed to communicate with leaderboard settings.', type: 'error' });
    } finally {
      setLeaderboardId(null);
    }
  };

  // Quick action: Enable Leaderboard for all users in the DB
  const handleBulkLeaderboardToggle = async (enable) => {
    if (!window.confirm(`Are you sure you want to ${enable ? 'grant' : 'revoke'} leaderboard access for ALL users in the database?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/leaderboard-toggle-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ enable })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => ({ ...u, isLeaderboardEnabled: enable })));
        if (selectedUser) {
          setSelectedUser(prev => ({ ...prev, isLeaderboardEnabled: enable }));
        }
        ToastConfig.show({
          title: 'Success',
          message: `Leaderboard ${enable ? 'enabled' : 'disabled'} for all users successfully.`,
          type: 'success'
        });
      } else {
        const data = await res.json();
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to apply bulk settings.', type: 'error' });
      }
    } catch (err) {
      ToastConfig.show({ title: 'Error', message: 'Failed to connect for bulk updates.', type: 'error' });
    }
  };

  return (
    <div className="p-6 space-y-6 text-gray-200 animate-fadeIn">
      {/* SECTION 1: HEADER & STATS CARDS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Users className="text-blue-500" size={24} />
            Student Directory
          </h2>
          <p className="text-xs text-gray-400 mt-1">Manage, audit, and analyze student accounts across all myPortal environments.</p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => handleBulkLeaderboardToggle(true)}
            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-indigo-500/30"
          >
            🔓 Enable Leaderboard for All
          </button>
          <button
            onClick={() => handleBulkLeaderboardToggle(false)}
            className="flex-1 md:flex-none px-4 py-2 bg-[#27272a] hover:bg-[#323237] text-gray-300 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-transparent"
          >
            🔒 Disable for All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Stat Card 1: Total Users */}
        <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 flex items-center gap-4 hover:border-blue-500/40 transition-colors shadow-sm relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Total Registered</p>
            <h3 className="text-xl font-black text-white mt-0.5 font-mono">{totalUsers}</h3>
          </div>
        </div>

        {/* Stat Card 2: Active Syncing */}
        <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/40 transition-colors shadow-sm relative overflow-hidden group col-span-2 md:col-span-1">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Active Syncing</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <h3 className="text-xl font-black text-white font-mono">{activeSyncing}</h3>
              {activeSyncing > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat Card 3: Web Users */}
        <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/40 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <Laptop size={20} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Web Users</p>
            <h3 className="text-xl font-black text-white mt-0.5 font-mono">{webUsers}</h3>
          </div>
        </div>

        {/* Stat Card 4: Mobile Users */}
        <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/40 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all"></div>
          <div className="p-3.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Mobile Users</p>
            <h3 className="text-xl font-black text-white mt-0.5 font-mono">{mobileUsers}</h3>
          </div>
        </div>

        {/* Stat Card 5: Extension Users */}
        <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 flex items-center gap-4 hover:border-rose-500/40 transition-colors shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all"></div>
          <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <Chrome size={20} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Extension Users</p>
            <h3 className="text-xl font-black text-white mt-0.5 font-mono">{extensionUsers}</h3>
          </div>
        </div>
      </div>

      {/* SECTION 2: SEARCH & SPLIT LAYOUT */}
      <div className="bg-[#131316] border border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
        {/* Search bar */}
        <div className="p-4 border-b border-[#27272a] bg-[#161619] flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[280px]">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, primary email or secondary email…" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#202024] border border-[#2d2d31] rounded-xl text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500 focus:bg-[#25252a] transition-all" 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-[#202024] border border-[#2d2d31] px-2.5 py-1.5 rounded-lg text-gray-400">
              {loading ? 'Searching...' : `Found ${users.length} results`}
            </span>
            <button
              onClick={() => { fetchStats(); fetchUsers(); }}
              disabled={loading}
              className="p-2 bg-[#202024] hover:bg-[#2a2a2f] text-gray-300 rounded-xl border border-[#2d2d31] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
              title="Reload data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Split container */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#27272a] min-h-[580px]">
          
          {/* LEFT PANEL: Users list table */}
          <div className="flex-1 overflow-x-auto min-w-0 bg-[#121214] flex flex-col justify-between">
            <div className="align-middle inline-block min-w-full">
              <table className="min-w-full divide-y divide-[#27272a]">
                <thead className="bg-[#18181b]/40">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Program / Academics</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Platforms</th>
                    <th scope="col" className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Sync State</th>
                    <th scope="col" className="relative px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/50">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="animate-spin text-blue-500 w-8 h-8" />
                          <p className="text-sm text-gray-400 animate-pulse font-medium">Fetching students list...</p>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-24 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center gap-3 text-gray-500">
                          <Users size={36} className="opacity-30" />
                          <p className="font-bold text-sm text-gray-400">No students found</p>
                          <p className="text-xs text-gray-500 text-center">No accounts matched your search keyword. Check spelling or clear search filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : users.map(u => {
                    const isSelected = selectedUser?._id === u._id;
                    const isTargetSuperAdmin = u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                    return (
                      <tr 
                        key={u._id} 
                        onClick={() => setSelectedUser(u)}
                        className={`cursor-pointer transition-colors group ${
                          isSelected 
                            ? 'bg-blue-500/10 hover:bg-blue-500/15 border-l-2 border-blue-500' 
                            : 'hover:bg-[#1a1a1f]/50'
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* Portal profile pic as primary */}
                            <UserAvatar pic={u.portalProfilePic} name={u.name} size={10} isBlocked={u.isBlocked} />
                            <div className="min-w-0">
                              <p className="font-black text-xs text-white flex items-center gap-1.5 flex-wrap">
                                {u.name}
                                {isTargetSuperAdmin && (
                                  <span className="text-[8px] bg-yellow-900/30 text-yellow-500 px-1 py-0.5 rounded border border-yellow-800/30 font-extrabold uppercase">Super Admin</span>
                                )}
                                {!isTargetSuperAdmin && u.isAdmin && (
                                  <span className="text-[8px] bg-red-900/30 text-red-400 px-1 py-0.5 rounded border border-red-900/30 font-extrabold uppercase">Admin</span>
                                )}
                                {u.isBlocked && (
                                  <span className="text-[8px] bg-red-500/15 text-red-500 px-1 py-0.5 rounded border border-red-500/20 font-bold uppercase">Blocked</span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-300">{u.program || 'Unknown Program'}</p>
                          <p className="text-[9px] text-gray-500 font-mono mt-0.5">Sem: {u.currentSemester || '—'} ({u.academicOrdinalSemester || '—'})</p>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className={`p-1 rounded ${u.accessedWeb ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800/40 text-gray-500'}`}
                              title={`Web: ${u.accessedWeb ? 'Connected' : 'Not connected'}`}
                            >
                              <Laptop size={12} />
                            </span>
                            <span 
                              className={`p-1 rounded ${u.accessedMobile ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800/40 text-gray-500'}`}
                              title={`App: ${u.accessedMobile ? 'Connected' : 'Not connected'}`}
                            >
                              <Smartphone size={12} />
                            </span>
                            <span 
                              className={`p-1 rounded ${u.accessedExtension ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800/40 text-gray-500'}`}
                              title={`Extension: ${u.accessedExtension ? 'Connected' : 'Not connected'}`}
                            >
                              <Chrome size={12} />
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {u.syncStatus === 'scraping' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                              <RefreshCw size={8} className="animate-spin" /> Scraping
                            </span>
                          ) : u.lastSyncAt ? (
                            <span className="text-[10px] text-gray-400 font-mono" title={new Date(u.lastSyncAt).toLocaleString()}>
                              {new Date(u.lastSyncAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-600">Never synced</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                          <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">Details →</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-[#27272a] bg-[#141416] flex items-center justify-between gap-3">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-[#202024] hover:bg-[#2c2c31] border border-[#2d2d31] text-gray-300 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-mono text-gray-500">
                  Page <span className="text-gray-300">{page}</span> of <span className="text-gray-300">{totalPages}</span>
                </span>
                <button
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-[#202024] hover:bg-[#2c2c31] border border-[#2d2d31] text-gray-300 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: User detailed profile card */}
          <div className="w-full lg:w-96 bg-[#161619] p-5 overflow-y-auto max-h-[720px] custom-scrollbar flex flex-col justify-between">
            {selectedUser ? (
              <div className="space-y-6">
                {/* Header: Dual Avatars & Name */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-[#27272a] relative">
                  
                  {/* Avatars Container */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    {/* Primary Portal profile picture (Always shown) */}
                    <div className="flex flex-col items-center">
                      <UserAvatar 
                        pic={selectedUser.portalProfilePic || selectedUser.originalPortalProfilePic} 
                        name={selectedUser.name} 
                        size={16} 
                        isBlocked={selectedUser.isBlocked} 
                      />
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 mt-1">Portal Photo</span>
                    </div>

                    {/* Secondary Custom picture (Only shown if added by the student) */}
                    {(() => {
                      const hasSecondaryPic = selectedUser.customProfilePic || (
                        selectedUser.profilePic && 
                        selectedUser.profilePic !== selectedUser.portalProfilePic && 
                        selectedUser.profilePic !== selectedUser.originalPortalProfilePic
                      );
                      if (!hasSecondaryPic) return null;
                      return (
                        <div className="flex flex-col items-center">
                          <UserAvatar 
                            pic={selectedUser.customProfilePic || selectedUser.profilePic} 
                            name={selectedUser.name} 
                            size={16} 
                            isBlocked={selectedUser.isBlocked} 
                          />
                          <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 mt-1">Custom Photo</span>
                        </div>
                      );
                    })()}
                  </div>

                  <h3 className="font-black text-lg text-white tracking-tight flex items-center gap-1.5 justify-center">
                    {selectedUser.name}
                  </h3>
                  <p className="text-xs font-semibold text-blue-400 mt-0.5 font-mono">{selectedUser.email}</p>
                  {selectedUser.secondaryEmail && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono flex items-center justify-center gap-1">
                      <Mail size={10} /> {selectedUser.secondaryEmail}
                    </p>
                  )}

                  {/* Profile Status Badge (Public vs Private) */}
                  <div className="mt-3">
                    {(selectedUser.showProfilePicToCommunity ?? false) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                        <Eye size={10} /> Public Profile
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wide">
                        <EyeOff size={10} /> Private Profile
                      </span>
                    )}
                  </div>
                </div>

                {/* Info List */}
                <div className="space-y-4 text-xs">
                  {/* Academic Profile */}
                  <div className="bg-[#18181b]/55 border border-[#27272a] rounded-xl p-4 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5 mb-2.5">
                      <BookOpen size={12} className="text-blue-500" /> Academic Information
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">DOB</p>
                        <p className="font-semibold text-gray-300 mt-0.5">{selectedUser.dob || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Faculty</p>
                        <p className="font-semibold text-gray-300 mt-0.5 truncate" title={selectedUser.faculty}>{selectedUser.faculty || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Program</p>
                        <p className="font-semibold text-gray-300 mt-0.5 truncate" title={selectedUser.program}>{selectedUser.program || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Career Type</p>
                        <p className="font-semibold text-gray-300 mt-0.5 uppercase">{selectedUser.careerType || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ordinal Semester</p>
                        <p className="font-semibold text-gray-300 mt-0.5">{selectedUser.academicOrdinalSemester || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Joined Since</p>
                        <p className="font-semibold text-gray-300 mt-0.5" title={new Date(selectedUser.createdAt).toLocaleDateString()}>
                          {new Date(selectedUser.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Platform & Sync status */}
                  <div className="bg-[#18181b]/55 border border-[#27272a] rounded-xl p-4 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5 mb-2.5">
                      <Activity size={12} className="text-emerald-500" /> Platform & Sync Status
                    </h4>

                    {/* Platform connectivity */}
                    <div className="space-y-2 pb-2.5 border-b border-[#27272a]/50">
                      <div className="flex items-center justify-between text-gray-300">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          <Laptop size={11} /> Web Portal
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${selectedUser.accessedWeb ? 'text-emerald-400' : 'text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.accessedWeb ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                          {selectedUser.accessedWeb ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          <Smartphone size={11} /> Mobile App
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${selectedUser.accessedMobile ? 'text-emerald-400' : 'text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.accessedMobile ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                          {selectedUser.accessedMobile ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-300">
                        <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          <Chrome size={11} /> Extension
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${selectedUser.accessedExtension ? 'text-emerald-400' : 'text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.accessedExtension ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                          {selectedUser.accessedExtension ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                    </div>

                    {/* Sync status */}
                    <div className="space-y-2 pt-1 pb-2 border-b border-[#27272a]/50">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Sync State</span>
                        {selectedUser.syncStatus === 'scraping' ? (
                          <span className="text-blue-400 text-[10px] font-extrabold flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin" /> ACTIVE SCRAPING
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider font-mono">IDLE</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Last Synced</span>
                        <span className="text-gray-300 font-mono text-[10px]">
                          {selectedUser.lastSyncAt 
                            ? new Date(selectedUser.lastSyncAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) 
                            : 'NEVER SYNCED'}
                        </span>
                      </div>
                    </div>

                    {/* Storage info */}
                    <div className="flex items-center justify-between pt-1 text-gray-300">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                        <Database size={11} /> MongoDB Storage
                      </div>
                      <span className="text-xs font-black text-gray-200 font-mono">{formatBytes(selectedUser.storageUsed)}</span>
                    </div>
                  </div>

                  {/* Leaderboard Toggle Access */}
                  <div className="bg-[#18181b]/55 border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                        🏆 Leaderboard Placement
                      </h4>
                      <p className="text-[9px] text-gray-500 mt-1">Allows student to appear in global rankings.</p>
                    </div>

                    {(() => {
                      const isTargetSuperAdmin = selectedUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      const canToggle = !isTargetSuperAdmin && (isSuperAdmin || !selectedUser.isAdmin);
                      const isLdEnabled = isTargetSuperAdmin ? true : selectedUser.isLeaderboardEnabled !== false;
                      
                      return (
                        <button
                          onClick={() => handleToggleLeaderboard(selectedUser)}
                          disabled={!canToggle || leaderboardId === selectedUser._id}
                          className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-all duration-300 focus:outline-none ${
                            isLdEnabled ? 'bg-indigo-600' : 'bg-[#27272a] border border-[#3f3f46]'
                          } ${!canToggle ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                              isLdEnabled ? 'translate-x-5.5' : 'translate-x-0.75'
                            }`}
                          />
                        </button>
                      );
                    })()}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="pt-2 space-y-2">
                    <p className="text-[9px] uppercase tracking-widest font-black text-gray-500 mb-1">Administrative Actions</p>

                    {/* Sync Trigger button */}
                    {selectedUser.isPortalConnected && (
                      <button
                        onClick={() => triggerMaterialSync(selectedUser)}
                        disabled={syncingId === selectedUser._id}
                        className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-300 border border-indigo-500/25 rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {syncingId === selectedUser._id ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                        <span>Trigger Material Sync & Process</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Block/Unblock */}
                      {(() => {
                        const isTargetSuperAdmin = selectedUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                        const canBlock = !isTargetSuperAdmin && (isSuperAdmin || !selectedUser.isAdmin);
                        
                        return (
                          <button
                            onClick={() => toggleBlock(selectedUser)}
                            disabled={!canBlock || blockingId === selectedUser._id}
                            className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                              selectedUser.isBlocked
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                : 'bg-orange-500/10 hover:bg-orange-500/15 text-orange-400 border-orange-500/20'
                            }`}
                          >
                            {blockingId === selectedUser._id ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : selectedUser.isBlocked ? (
                              <>
                                <UserCheck size={12} />
                                <span>Unblock</span>
                              </>
                            ) : (
                              <>
                                <BanIcon size={12} />
                                <span>Block</span>
                              </>
                            )}
                          </button>
                        );
                      })()}

                      {/* Promote / Demote admin */}
                      {isSuperAdmin && selectedUser.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() ? (
                        <button
                          onClick={() => toggleAdminRole(selectedUser)}
                          disabled={roleChangingId === selectedUser._id}
                          className={`py-2 px-3 border rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                            selectedUser.isAdmin
                              ? 'bg-yellow-500/10 hover:bg-yellow-500/15 text-yellow-500 border-yellow-500/25'
                              : 'bg-gray-500/10 hover:bg-gray-500/15 text-gray-400 border-gray-500/20'
                          }`}
                        >
                          {roleChangingId === selectedUser._id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Shield size={12} />
                              <span>{selectedUser.isAdmin ? 'Demote' : 'Promote'}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="py-2 px-3 border border-gray-800 bg-[#121214] text-gray-600 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1 select-none">
                          <Lock size={11} /> Admin Role
                        </div>
                      )}
                    </div>

                    {/* Delete user */}
                    {(!selectedUser.isAdmin || isSuperAdmin) && selectedUser.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() ? (
                      <button
                        onClick={() => handleDeleteUser(selectedUser)}
                        disabled={deletingId === selectedUser._id}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/15 text-red-500 border border-red-500/20 hover:border-red-500/35 rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {deletingId === selectedUser._id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Trash2 size={13} />
                            <span>Delete Student Account</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full py-2 border border-gray-800 bg-[#121214] text-gray-600 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1 select-none">
                        <ShieldAlert size={12} /> Protected System Account
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-3 py-20">
                <Users size={48} className="opacity-20 animate-pulse text-indigo-400" />
                <p className="font-bold text-sm text-gray-400">Select a student</p>
                <p className="text-xs text-gray-600 max-w-[200px]">Choose a user from the directory table to inspect their profile records and access controls.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserDirectoryApp;
