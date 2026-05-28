import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Activity, Search, Trash2,
<<<<<<< HEAD
  Shield, HardDrive, Cpu, X,
  ShieldAlert, Lock, ShieldCheck, Mail, KeyRound, Server,
  Eye, Cookie, RefreshCw, Bell, BanIcon, CheckCircle2,
  ChevronLeft, Send, Clock, Wifi, WifiOff, FlaskConical,
  UserCheck, AlertTriangle
} from 'lucide-react';
import { ToastConfig } from './CustomToast';
import ConfirmationModal from './ConfirmationModal';
import SyncDiagnostics from './SyncDiagnostics';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
=======
  Shield, HardDrive, Cpu, AlertTriangle, X,
  ShieldAlert, Lock, ShieldCheck, Mail, KeyRound, CheckCircle2, Server
} from 'lucide-react';
import { ToastConfig } from './CustomToast';
import ConfirmationModal from './ConfirmationModal';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

<<<<<<< HEAD
const formatTimeAgo = (ms) => {
  if (!ms) return 'Unknown';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

=======
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
const LiveGraph = ({ data, color = "#3b82f6" }) => {
  const max = 100;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val / max) * 100);
    return `${x},${y}`;
  }).join(' ');
<<<<<<< HEAD
=======

>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
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

const StorageBar = ({ label, used, total, color, percentage, icon: Icon }) => {
  const pct = percentage !== undefined ? percentage : Math.min((used / total) * 100, 100);
<<<<<<< HEAD
=======

>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-gray-400" />} {label}
        </span>
        <span className="text-gray-700 dark:text-gray-300 font-bold">{used} <span className="text-gray-400 dark:text-gray-600">/ {total}</span></span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
<<<<<<< HEAD
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }}></div>
=======
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        ></div>
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
      </div>
    </div>
  );
};

<<<<<<< HEAD
// App tile for main grid
const AppTile = ({ icon: Icon, label, color, textColor, onClick, badge }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-5 rounded-3xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#151518] hover:scale-105 hover:shadow-xl transition-all duration-200 group relative shadow-sm"
  >
    {badge != null && badge > 0 && (
      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{badge}</span>
    )}
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-3 shadow-inner`}>
      <Icon size={28} className={textColor} />
    </div>
    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center leading-tight">{label}</span>
  </button>
);

// ────────────────────────────────────────────────────────────────────────────────
// Primary profile pic helper — portal pic is the "primary" face
// ────────────────────────────────────────────────────────────────────────────────
const getPrimaryPic = (u) => u.portalProfilePic || u.originalPortalProfilePic || u.profilePic || u.customProfilePic || null;

// User avatar
const UserAvatar = ({ u, size = 10, showBlock = false }) => {
  const pic = getPrimaryPic(u);
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-gray-700 dark:text-white font-bold shadow-sm overflow-hidden shrink-0 relative`}
      style={{ width: size * 4, height: size * 4, minWidth: size * 4 }}>
      {pic ? <img src={pic} alt={u.name} className="w-full h-full object-cover" /> : <span style={{ fontSize: size * 1.8 }}>{u.name.charAt(0).toUpperCase()}</span>}
      {showBlock && u.isBlocked && <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center"><BanIcon size={size * 1.5} className="text-white" /></div>}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// APP 1: USER DIRECTORY
// ────────────────────────────────────────────────────────────────────────────────
const UserDirectoryApp = ({ users, loading, isSuperAdmin, token, onUsersChange }) => {
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [roleToToggle, setRoleToToggle] = useState(null);
  const [blockingId, setBlockingId] = useState(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    const aIsSuper = a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const bIsSuper = b.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    if (aIsSuper && !bIsSuper) return -1;
    if (!aIsSuper && bIsSuper) return 1;
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    return 0;
  });

  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userToDelete}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (res.ok) {
        onUsersChange(users.filter(u => u._id !== userToDelete));
        ToastConfig.show({ title: 'Deleted', message: 'User removed successfully.', type: 'success' });
      } else {
        const data = await res.json();
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to delete', type: 'error' });
      }
    } catch { ToastConfig.show({ title: 'Error', message: 'Failed to delete user', type: 'error' }); }
    setUserToDelete(null);
  };

  const executeToggleRole = async () => {
    if (!roleToToggle) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${roleToToggle._id}/role`, { method: 'PUT', headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (res.ok) {
        onUsersChange(users.map(u => u._id === roleToToggle._id ? { ...u, isAdmin: data.isAdmin } : u));
        ToastConfig.show({ title: 'Success', message: 'Role updated.', type: 'success' });
      } else ToastConfig.show({ title: 'Error', message: data.message || 'Failed', type: 'error' });
    } catch { ToastConfig.show({ title: 'Error', message: 'Failed to update role', type: 'error' }); }
    setRoleToToggle(null);
  };

  const toggleBlock = async (u) => {
    setBlockingId(u._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/block`, { method: 'PUT', headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (res.ok) {
        onUsersChange(users.map(x => x._id === u._id ? { ...x, isBlocked: data.isBlocked } : x));
        ToastConfig.show({ title: data.isBlocked ? 'Blocked' : 'Unblocked', message: `${u.name} has been ${data.isBlocked ? 'blocked' : 'unblocked'}.`, type: data.isBlocked ? 'error' : 'success' });
      } else ToastConfig.show({ title: 'Error', message: data.message || 'Failed', type: 'error' });
    } catch { ToastConfig.show({ title: 'Error', message: 'Failed', type: 'error' }); }
    setBlockingId(null);
  };

  return (
    <div>
      <div className="p-5 border-b border-gray-200 dark:border-[#27272a] flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#27272a] border border-gray-200 dark:border-transparent rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500" />
        </div>
        <span className="text-xs font-mono bg-gray-100 dark:bg-[#27272a] px-3 py-2 rounded-lg text-gray-500">{users.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-[#1c1c1f] border-b border-gray-200 dark:border-[#27272a]">
            <tr>
              <th className="px-6 py-3">Identity</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Last Sync</th>
              <th className="px-6 py-3">Storage</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-12 text-gray-400 animate-pulse">Loading users…</td></tr>
            ) : filtered.map(u => {
              const isTargetSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              return (
                <tr key={u._id} className={`border-b border-gray-100 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#1c1c1f] transition-colors ${u.isBlocked ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar u={u} size={10} showBlock />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          {u.name}
                          {isTargetSuperAdmin && <span className="text-[9px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/50">SUPER ADMIN</span>}
                          {!isTargetSuperAdmin && u.isAdmin && <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50">ADMIN</span>}
                          {u.isBlocked && <span className="text-[9px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-900/50">BLOCKED</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{u.email}</td>
                  <td className="px-6 py-3">
                    {u.isPortalConnected
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Linked</span>
                      : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Pending</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {u.lastSyncAt ? new Date(u.lastSyncAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-6 py-3 text-xs font-bold text-gray-700 dark:text-gray-300">{formatBytes(u.storageUsed)}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-1">
                      {!isTargetSuperAdmin && (isSuperAdmin || !u.isAdmin) && (
                        <button onClick={() => toggleBlock(u)} disabled={blockingId === u._id}
                          className={`p-2 rounded-lg transition-all ${u.isBlocked ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10' : 'text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10'} disabled:opacity-50`}
                          title={u.isBlocked ? 'Unblock Account' : 'Block Account'}>
                          {blockingId === u._id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block"></span> : u.isBlocked ? <UserCheck size={16} /> : <BanIcon size={16} />}
                        </button>
                      )}
                      {(!u.isAdmin || isSuperAdmin) && !isTargetSuperAdmin && (
                        <button onClick={() => setUserToDelete(u._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all" title="Delete User">
                          <Trash2 size={16} />
                        </button>
                      )}
                      {isSuperAdmin && !isTargetSuperAdmin && (
                        <button onClick={() => setRoleToToggle(u)}
                          className={`p-2 rounded-lg transition-all ${u.isAdmin ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10' : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/10'}`}
                          title={u.isAdmin ? 'Demote Admin' : 'Promote to Admin'}>
                          <Shield size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="6" className="text-center py-12 text-gray-400">No users match "{search}"</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmationModal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} onConfirm={executeDelete}
        title="Delete User?" message="This will permanently wipe the account and all associated data. This cannot be undone." confirmText="Delete" confirmStyle="danger" />
      <ConfirmationModal isOpen={!!roleToToggle} onClose={() => setRoleToToggle(null)} onConfirm={executeToggleRole}
        title="Change Role?" message={`Are you sure you want to ${roleToToggle?.isAdmin ? 'demote' : 'promote'} ${roleToToggle?.name}?`} confirmText="Confirm" confirmStyle="warning" />
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// APP 2: SESSION INSPECTOR
// ────────────────────────────────────────────────────────────────────────────────
const SessionInspectorApp = ({ users, token }) => {
  const [results, setResults] = useState({});
  const [checking, setChecking] = useState({});

  const portalUsers = users.filter(u => u.isPortalConnected && u.ucpCookie);

  const checkSession = async (userId) => {
    setChecking(p => ({ ...p, [userId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/validate-session/${userId}`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      setResults(p => ({ ...p, [userId]: data }));
    } catch {
      setResults(p => ({ ...p, [userId]: { isAlive: false, reason: 'Request failed' } }));
    }
    setChecking(p => ({ ...p, [userId]: false }));
  };

  return (
    <div className="p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Verify whether a user's UCP portal session cookie is still active. Only portal-linked users with stored cookies are shown.</p>
      {portalUsers.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Cookie size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">No portal-linked users with cookies found.</p>
        </div>
      )}
      <div className="space-y-3">
        {portalUsers.map(u => {
          const result = results[u._id];
          return (
            <div key={u._id} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b]">
              <UserAvatar u={u} size={10} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                {result && (
                  <div className="mt-1">
                    {result.isAlive
                      ? <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1"><Wifi size={12} /> Session Active · started {formatTimeAgo(result.sinceMs)}</span>
                      : <span className="text-red-500 dark:text-red-400 text-xs font-bold flex items-center gap-1"><WifiOff size={12} /> Session Dead · {result.reason || 'Cookie invalid'}</span>
                    }
                  </div>
                )}
              </div>
              <button onClick={() => checkSession(u._id)} disabled={checking[u._id]}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-60 shrink-0">
                <RefreshCw size={14} className={checking[u._id] ? 'animate-spin' : ''} />
                {checking[u._id] ? 'Checking…' : result ? 'Re-Check' : 'Verify'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// APP 4: NOTIFICATIONS MANAGER
// ────────────────────────────────────────────────────────────────────────────────
const NotificationsManagerApp = ({ users, isSuperAdmin, token }) => {
  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch { }
    setLoadingHistory(false);
  };

  const pushUsers = users.filter(u => u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase());
  const filteredPushUsers = pushUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const allFilteredSelected = filteredPushUsers.length > 0 && filteredPushUsers.every(u => selectedUserIds.includes(u._id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all currently filtered
      setSelectedUserIds(prev => prev.filter(id => !filteredPushUsers.find(u => u._id === id)));
    } else {
      // Select all filtered (merge with existing)
      const newIds = filteredPushUsers.map(u => u._id);
      setSelectedUserIds(prev => [...new Set([...prev, ...newIds])]);
    }
  };

  const toggleUser = (id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSend = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      ToastConfig.show({ title: 'Error', message: 'Title and message are required.', type: 'error' });
      return;
    }
    if (targetType === 'specific' && selectedUserIds.length === 0) {
      ToastConfig.show({ title: 'Error', message: 'Select at least one user.', type: 'error' });
      return;
    }
    setIsSending(true);
    try {
      const body = { title: pushTitle, message: pushMessage };
      if (targetType === 'specific') body.userIds = selectedUserIds;
      const res = await fetch(`${API_BASE}/api/admin/push-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        ToastConfig.show({ title: '🎉 Sent!', message: `Delivered to ${data.deliveredCount} device(s) out of ${data.targetCount} users.`, type: 'success' });
        setPushTitle('');
        setPushMessage('');
        setSelectedUserIds([]);
        setUserSearch('');
        fetchHistory();
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to send', type: 'error' });
      }
    } catch { ToastConfig.show({ title: 'Error', message: 'Network error', type: 'error' }); }
    setIsSending(false);
  };

  const handleDeleteRecord = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (res.ok) {
        setHistory(prev => prev.filter(r => r._id !== id));
        ToastConfig.show({ title: 'Deleted', message: 'Broadcast record removed.', type: 'success' });
      }
    } catch { }
    setDeletingId(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Compose */}
      <div className="bg-gray-50 dark:bg-[#18181b] rounded-2xl border border-gray-200 dark:border-[#27272a] p-5">
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Send size={16} className="text-blue-500" /> Compose Broadcast</h3>

        {/* Target toggle */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTargetType('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${targetType === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#27272a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#27272a]'}`}>
            📢 All Users
          </button>
          <button onClick={() => setTargetType('specific')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${targetType === 'specific' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#27272a] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#27272a]'}`}>
            🎯 Specific Users {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
          </button>
        </div>

        {/* User picker */}
        {targetType === 'specific' && (
          <div className="mb-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#111113] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1d]">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-[#27272a] border border-gray-200 dark:border-[#3f3f46] rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500"
                />
              </div>
              <button onClick={toggleSelectAll}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${allFilteredSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#27272a] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3f3f46] hover:border-blue-400'}`}>
                {allFilteredSelected ? '✓ Deselect All' : 'Select All'}
              </button>
              {selectedUserIds.length > 0 && (
                <button onClick={() => setSelectedUserIds([])} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                  Clear
                </button>
              )}
            </div>
            {/* List */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {filteredPushUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">No users match</div>
              ) : filteredPushUsers.map(u => {
                const isSelected = selectedUserIds.includes(u._id);
                return (
                  <button key={u._id} onClick={() => toggleUser(u._id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all border-b border-gray-50 dark:border-[#1c1c1f] last:border-0 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#1c1c1f]'}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {isSelected && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <UserAvatar u={u} size={7} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedUserIds.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30 text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Notification Title</label>
            <input type="text" placeholder="e.g., 🎉 Eid Mubarak from MyPortal!" value={pushTitle} onChange={e => setPushTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 font-medium" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Message Body</label>
            <textarea placeholder="Write your message here… emojis and special characters are fully supported! 🌙✨" value={pushMessage} onChange={e => setPushMessage(e.target.value)}
              rows={4} className="w-full px-4 py-2.5 bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 resize-none leading-relaxed" />
          </div>
          <button onClick={handleSend} disabled={isSending || !pushTitle.trim() || !pushMessage.trim() || (targetType === 'specific' && selectedUserIds.length === 0)}
            className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
            {isSending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Sending…</> : <><Send size={16} /> Send Broadcast</>}
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3"><Clock size={16} className="text-gray-400" /> Broadcast History</h3>
        {loadingHistory ? (
          <div className="text-center py-8 text-gray-400 animate-pulse text-sm">Loading history…</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-sm">No broadcasts sent yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map(record => (
              <div key={record._id} className="p-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#18181b] flex items-start gap-3">
                <Bell size={18} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{record.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{record.message}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">By {record.sentByName}</span>
                    <span className="text-[10px] text-gray-400">·</span>
                    <span className="text-[10px] text-gray-400">{new Date(record.createdAt).toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{record.deliveredCount} delivered</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${record.targetType === 'all' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                      {record.targetType === 'all' ? '→ All Users' : `→ ${record.targetCount} specific`}
                    </span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <button onClick={() => handleDeleteRecord(record._id)} disabled={deletingId === record._id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shrink-0 disabled:opacity-50">
                    {deletingId === record._id ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin block"></span> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// APP 5: SECURITY (PIN CHANGE)
// ────────────────────────────────────────────────────────────────────────────────
const SecurityApp = ({ token }) => {
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [step, setStep] = useState('start');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async () => {
    setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/request-pin-otp`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (res.ok) setStep('otp');
      else setError('Failed to send OTP. Try again.');
    } catch { setError('Network error.'); }
    setIsLoading(false);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr = [...otpInput]; arr[i] = val; setOtpInput(arr); setError('');
    if (val && i < 5) otpRefs[i + 1].current.focus();
  };
  const handlePinChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr = [...newPin]; arr[i] = val; setNewPin(arr); setError('');
    if (val && i < 3) pinRefs[i + 1].current.focus();
  };

  const savePin = async () => {
    if (newPin.join('').length < 4) return setError('Enter all 4 digits.');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/change-pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ otp: otpInput.join(''), newPin: newPin.join('') })
      });
      if (res.ok) { ToastConfig.show({ title: '✅ Done!', message: 'Admin PIN updated.', type: 'success' }); setStep('done'); }
      else { const d = await res.json(); setError(d.message || 'Invalid OTP.'); }
    } catch { setError('Network error.'); }
    setIsLoading(false);
  };

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
      {step === 'start' && (
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-5"><KeyRound size={28} className="text-blue-500" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Change Admin PIN</h3>
          <p className="text-sm text-gray-500 mb-6">We'll send a 6-digit OTP to your registered admin email to verify your identity.</p>
          {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          <button onClick={requestOtp} disabled={isLoading} className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <><Mail size={16} /> Send OTP to Email</>}
          </button>
        </div>
      )}
      {step === 'otp' && (
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-5"><Mail size={28} className="text-blue-500" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Enter OTP</h3>
          <p className="text-sm text-gray-500 mb-6">Check your admin email for the 6-digit code.</p>
          <div className="flex justify-center gap-2 mb-5">
            {otpInput.map((d, i) => <input key={i} ref={otpRefs[i]} type="text" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} autoFocus={i === 0}
              className={`w-11 h-14 text-center text-xl font-black bg-gray-100 dark:bg-[#27272a] border-2 rounded-xl outline-none text-gray-900 dark:text-white ${d ? 'border-blue-500' : 'border-gray-200 dark:border-[#3f3f46]'}`} />
            )}
          </div>
          {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          <button onClick={() => { if (otpInput.join('').length < 6) return setError('Enter full OTP.'); setStep('newpin'); }}
            className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white">Verify Identity</button>
        </div>
      )}
      {step === 'newpin' && (
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5"><Lock size={28} className="text-emerald-500" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Set New PIN</h3>
          <p className="text-sm text-gray-500 mb-6">Enter a new 4-digit PIN.</p>
          <div className="flex justify-center gap-3 mb-5">
            {newPin.map((d, i) => <input key={i} ref={pinRefs[i]} type="password" maxLength={1} value={d} onChange={e => handlePinChange(i, e.target.value)} autoFocus={i === 0}
              className={`w-14 h-16 text-center text-2xl font-black bg-gray-100 dark:bg-[#27272a] border-2 rounded-xl outline-none text-gray-900 dark:text-white ${d ? 'border-emerald-500' : 'border-gray-200 dark:border-[#3f3f46]'}`} />
            )}
          </div>
          {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}
          <button onClick={savePin} disabled={isLoading || newPin.some(v => v === '')}
            className="w-full py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center justify-center gap-2">
            {isLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Save New PIN'}
          </button>
        </div>
      )}
      {step === 'done' && (
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-5"><CheckCircle2 size={28} className="text-emerald-500" /></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">PIN Updated!</h3>
          <p className="text-sm text-gray-500">Your admin PIN has been successfully changed.</p>
          <button onClick={() => { setStep('start'); setOtpInput(['','','','','','']); setNewPin(['','','','']); }}
            className="mt-6 px-6 py-2 rounded-xl text-sm font-bold bg-gray-100 dark:bg-[#27272a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3f3f46]">Change Again</button>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN DASHBOARD
// ────────────────────────────────────────────────────────────────────────────────
const AdminDashboard = ({ currentUser }) => {
  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const token = localStorage.getItem('token');

  // PIN lock
=======
const UserRow = ({ u, onInitiateDelete, isSuperAdmin, onToggleRole }) => {
  const superAdminEmail = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
  const isTargetSuperAdmin = u.email.toLowerCase() === superAdminEmail.toLowerCase();
  const profileImg = u.originalPortalProfilePic || u.portalProfilePic || u.profilePic;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-[#1c1c1f] transition-colors group border-b border-gray-100 dark:border-[#27272a]">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-gray-700 dark:text-white font-bold text-lg shadow-sm overflow-hidden">
            {profileImg ? (
              <img src={profileImg} alt={u.name} className="w-full h-full object-cover" />
            ) : (
              u.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {u.name}
              {isTargetSuperAdmin ? (
                <span className="text-[9px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-900/50">SUPER ADMIN</span>
              ) : u.isAdmin ? (
                <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50">ADMIN</span>
              ) : (
                <span className="text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">STUDENT</span>
              )}
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
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white">
            {formatBytes(u.storageUsed)}
          </span>
          <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
            Local Footprint
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-right flex justify-end gap-2">
        {u.isAdmin ? (
          <span className="text-xs font-bold text-gray-400 dark:text-gray-600 flex items-center justify-end gap-1 px-2 py-2">
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
        {isSuperAdmin && !isTargetSuperAdmin && (
          <button
            onClick={() => onToggleRole(u)}
            className={`p-2 rounded-lg transition-all ${u.isAdmin ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10' : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:text-gray-500 dark:hover:text-yellow-500 dark:hover:bg-yellow-900/10'}`}
            title={u.isAdmin ? "Demote Admin" : "Promote to Admin"}
          >
            <Shield size={18} />
          </button>
        )}
      </td>
    </tr>
  );
};

const AdminDashboard = ({ currentUser }) => {
  const superAdminEmail = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
  const isSuperAdmin = currentUser?.email?.toLowerCase() === superAdminEmail.toLowerCase();
  const token = localStorage.getItem('token');

>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
<<<<<<< HEAD
  const lockRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // System stats
  const [cpuData, setCpuData] = useState(new Array(20).fill(0));
  const [memoryData, setMemoryData] = useState(new Array(20).fill(0));
  const [realDbSize, setRealDbSize] = useState(0);
  const [diskData, setDiskData] = useState({ used: 0, total: 30 * 1024 * 1024 * 1024 });
  const [systemHealth, setSystemHealth] = useState('Syncing…');

  // Users & active app
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeApp, setActiveApp] = useState(null);
=======
  const [changePinModal, setChangePinModal] = useState({ isOpen: false, step: 'otp' });
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [modalError, setModalError] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const newPinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [roleToToggle, setRoleToToggle] = useState(null);

  const [cpuData, setCpuData] = useState(new Array(20).fill(0));
  const [memoryData, setMemoryData] = useState(new Array(20).fill(0));
  const [realDbSize, setRealDbSize] = useState(0);
  const [totalMemory, setTotalMemory] = useState(1);
  const [diskData, setDiskData] = useState({ used: 0, total: 30 * 1024 * 1024 * 1024 });
  const [systemHealth, setSystemHealth] = useState('Syncing...');
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b

  useEffect(() => {
    if (isUnlocked) {
      fetchUsers();
      fetchRealStats();
<<<<<<< HEAD
      const iv = setInterval(fetchRealStats, 2000);
      return () => clearInterval(iv);
=======
      const interval = setInterval(fetchRealStats, 2000);
      return () => clearInterval(interval);
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
    }
  }, [isUnlocked]);

  const fetchUsers = async () => {
<<<<<<< HEAD
    setLoadingUsers(true);
=======
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
<<<<<<< HEAD
    } catch { }
    setLoadingUsers(false);
=======
      setLoading(false);
    } catch (e) { console.error("User Fetch Error"); }
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  };

  const fetchRealStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/system-stats`, { headers: { 'x-auth-token': token } });
      if (res.ok) {
<<<<<<< HEAD
        const s = await res.json();
        setCpuData(prev => [...prev.slice(1), s.cpu]);
        setMemoryData(prev => [...prev.slice(1), (s.memory.active / s.memory.total) * 100]);
        setRealDbSize(s.dbSize);
        if (s.disk) setDiskData(s.disk);
        setSystemHealth('Optimal');
      }
    } catch { setSystemHealth('Offline'); }
  };

  const handleLockPinChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr = [...pinInput]; arr[i] = val; setPinInput(arr); setPinError(false);
    if (val && i < 3) lockRefs[i + 1].current.focus();
  };
  const handleLockKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pinInput[i] && i > 0) lockRefs[i - 1].current.focus();
    if (e.key === 'Enter' && i === 3 && pinInput.every(v => v !== '')) verifyPin(pinInput.join(''));
  };

  const verifyPin = async (pin) => {
=======
        const stats = await res.json();
        setCpuData(prev => [...prev.slice(1), stats.cpu]);
        const memUsagePercent = (stats.memory.active / stats.memory.total) * 100;
        setMemoryData(prev => [...prev.slice(1), memUsagePercent]);
        setTotalMemory(stats.memory.total);
        setRealDbSize(stats.dbSize);
        if (stats.disk) setDiskData(stats.disk);
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
      ToastConfig.show({ title: "Error", message: "Failed to delete user", type: "error" });
    }
  };

  const executeToggleRole = async () => {
    if (!roleToToggle) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${roleToToggle._id}/role`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u._id === roleToToggle._id ? { ...u, isAdmin: data.isAdmin } : u));
        ToastConfig.show({ title: "Success", message: "User role updated", type: "success" });
      } else {
        ToastConfig.show({ title: "Error", message: data.message || "Failed to update role", type: "error" });
      }
    } catch (err) {
      ToastConfig.show({ title: "Error", message: "Failed to update role", type: "error" });
    }
    setRoleToToggle(null);
  };

  const handlePinChange = (index, value, refs, stateSetter, stateValue) => {
    if (!/^\d*$/.test(value)) return;
    const newPinState = [...stateValue];
    newPinState[index] = value;
    stateSetter(newPinState);
    setPinError(false);
    setModalError('');
    if (value && index < 3) refs[index + 1].current.focus();
  };

  const handlePinKeyDown = (index, e, refs, stateSetter, stateValue) => {
    if (e.key === 'Backspace' && !stateValue[index] && index > 0) refs[index - 1].current.focus();
    if (e.key === 'Enter' && index === 3 && stateValue.every(v => v !== '')) {
      if (refs === inputRefs) verifyPin(stateValue.join(''));
    }
  };

  const verifyPin = async (fullPin) => {
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
    setIsPinLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
<<<<<<< HEAD
        body: JSON.stringify({ pin })
      });
      if (res.ok) setIsUnlocked(true);
      else { setPinError(true); setPinInput(['', '', '', '']); lockRefs[0].current.focus(); }
    } catch { }
    setIsPinLoading(false);
  };

  // ── PIN Lock ──────────────────────────────────────────────────────────────
=======
        body: JSON.stringify({ pin: fullPin })
      });
      if (res.ok) setIsUnlocked(true);
      else {
        setPinError(true);
        setPinInput(['', '', '', '']);
        inputRefs[0].current.focus();
      }
    } catch (err) { console.error(err); }
    finally { setIsPinLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpInput];
    newOtp[index] = value;
    setOtpInput(newOtp);
    setModalError('');
    if (value && index < 5) otpRefs[index + 1].current.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) otpRefs[index - 1].current.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData) {
      const newOtp = [...otpInput];
      for (let i = 0; i < pastedData.length; i++) if (i < 6) newOtp[i] = pastedData[i];
      setOtpInput(newOtp);
      setModalError('');
      const nextFocusIndex = Math.min(pastedData.length, 5);
      if (otpRefs[nextFocusIndex]) otpRefs[nextFocusIndex].current.focus();
    }
  };

  const requestChangePin = async () => {
    setModalError('');
    setOtpInput(['', '', '', '', '', '']);
    setNewPin(['', '', '', '']);
    try {
      const res = await fetch(`${API_BASE}/api/admin/request-pin-otp`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (res.ok) setChangePinModal({ isOpen: true, step: 'otp' });
      else setModalError('Failed to send OTP.');
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
        ToastConfig.show({ title: "Success", message: "Security PIN successfully changed!", type: "success" });
        setChangePinModal({ isOpen: false, step: 'otp' });
        setOtpInput(['', '', '', '', '', '']);
        setNewPin(['', '', '', '']);
      } else {
        setModalError((await res.json()).message || "Failed to update PIN.");
      }
    } catch (err) { console.error(err); }
    setIsPinLoading(false);
  };

>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  if (!isUnlocked) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden animate-fadeIn">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
<<<<<<< HEAD
        <div className={`relative z-10 w-full max-w-sm p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-[#222] shadow-2xl flex flex-col items-center ${pinError ? 'animate-shake border-red-500/50' : ''}`}>
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert size={36} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Restricted Access</h2>
          <p className="text-gray-400 text-sm text-center mb-8">Enter your 4-digit security PIN to access the Admin Control Panel.</p>
          <div className="flex gap-4 mb-8">
            {pinInput.map((d, i) => (
              <input key={i} ref={lockRefs[i]} type="password" maxLength={1} value={d} autoComplete="new-password" name={`admin-pin-${i}`}
                onChange={e => handleLockPinChange(i, e.target.value)}
                onKeyDown={e => handleLockKeyDown(i, e)}
                className={`w-14 h-16 text-center text-2xl font-black bg-[#121212] border-2 rounded-xl outline-none text-white ${d ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#333] focus:border-red-500/50'} ${pinError ? 'border-red-600 bg-red-950/20 text-red-500' : ''}`}
                autoFocus={i === 0} />
            ))}
          </div>
          <button onClick={() => verifyPin(pinInput.join(''))} disabled={pinInput.some(v => v === '') || isPinLoading}
            className="w-full py-4 rounded-xl font-bold bg-white hover:bg-gray-100 text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isPinLoading ? <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span> : <><Lock size={18} /> Authorize Access</>}
          </button>
        </div>
        <style>{`@keyframes shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-5px)}20%,40%,60%,80%{transform:translateX(5px)}}.animate-shake{animation:shake .4s ease-in-out}`}</style>
=======
        <div className={`relative z-10 w-full max-w-sm p-8 rounded-3xl bg-black/40 backdrop-blur-xl border border-[#222] shadow-2xl flex flex-col items-center transition-transform ${pinError ? 'animate-shake border-red-500/50 shadow-red-500/10' : ''}`}>
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20"><ShieldAlert size={36} className="text-red-500" /></div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Restricted Access</h2>
          <p className="text-gray-400 text-sm text-center mb-8">Enter your 4-digit security PIN to access the Admin Command Center.</p>
          <div className="flex gap-4 mb-8">
            {pinInput.map((digit, i) => (
              <input key={i} ref={inputRefs[i]} type="password" maxLength={1} value={digit} autoComplete="new-password" name={`admin-pin-${i}`} onChange={(e) => handlePinChange(i, e.target.value, inputRefs, setPinInput, pinInput)} onKeyDown={(e) => handlePinKeyDown(i, e, inputRefs, setPinInput, pinInput)} className={`w-14 h-16 text-center text-2xl font-black bg-[#121212] border-2 rounded-xl outline-none transition-all text-white ${digit ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-[#333] focus:border-red-500/50'} ${pinError ? 'border-red-600 bg-red-950/20 text-red-500' : ''}`} autoFocus={i === 0} />
            ))}
          </div>
          <button onClick={() => verifyPin(pinInput.join(''))} disabled={pinInput.some(v => v === '') || isPinLoading} className="w-full py-4 rounded-xl font-bold bg-white hover:bg-gray-100 text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isPinLoading ? <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span> : <><Lock size={18} /> Authorize Access</>}
          </button>
        </div>
        <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } } .animate-shake { animation: shake 0.4s ease-in-out; }`}</style>
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
      </div>
    );
  }

<<<<<<< HEAD
  // ── App definitions ──────────────────────────────────────────────────────
  const apps = [
    { id: 'users',         label: 'User Directory',        icon: Users,        color: 'bg-blue-100 dark:bg-blue-900/30',    textColor: 'text-blue-600 dark:text-blue-400',    badge: users.length },
    { id: 'sessions',      label: 'Session Inspector',      icon: Cookie,       color: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'diagnostics',   label: 'Scraping Diagnostics',   icon: FlaskConical, color: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600 dark:text-purple-400' },
    { id: 'notifications', label: 'Notifications Manager',  icon: Bell,         color: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' },
    { id: 'security',      label: 'Security & PIN',         icon: KeyRound,     color: 'bg-red-100 dark:bg-red-900/30',      textColor: 'text-red-600 dark:text-red-400' },
  ];

  const activeAppConfig = apps.find(a => a.id === activeApp);

  // ── Active App full-layout view ──────────────────────────────────────────
  if (activeApp) {
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white animate-fadeIn">
        {/* App header with back button */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#111113]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#27272a] px-6 py-4 flex items-center gap-3">
          <button onClick={() => setActiveApp(null)}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            Admin Panel
          </button>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${activeAppConfig.color} flex items-center justify-center`}>
              <activeAppConfig.icon size={15} className={activeAppConfig.textColor} />
            </div>
            <span className="font-black text-gray-900 dark:text-white">{activeAppConfig.label}</span>
          </div>
        </div>

        {/* App content — full width */}
        <div className="bg-white dark:bg-[#111113] min-h-[calc(100%-65px)]">
          {activeApp === 'users'         && <UserDirectoryApp users={users} loading={loadingUsers} isSuperAdmin={isSuperAdmin} token={token} onUsersChange={setUsers} />}
          {activeApp === 'sessions'      && <SessionInspectorApp users={users} token={token} />}
          {activeApp === 'diagnostics'   && <SyncDiagnostics />}
          {activeApp === 'notifications' && <NotificationsManagerApp users={users} isSuperAdmin={isSuperAdmin} token={token} />}
          {activeApp === 'security'      && <SecurityApp token={token} />}
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────────
=======
  const filteredUsers = users
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.email && u.email.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      const aIsSuper = a.email.toLowerCase() === superAdminEmail.toLowerCase();
      const bIsSuper = b.email.toLowerCase() === superAdminEmail.toLowerCase();
      if (aIsSuper && !bIsSuper) return -1;
      if (!aIsSuper && bIsSuper) return 1;
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return 0;
    });
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
  const currentCpu = cpuData[cpuData.length - 1] || 0;
  const dbLimitBytes = 512 * 1024 * 1024;
  const dbPercentage = Math.min((realDbSize / dbLimitBytes) * 100, 100);
  const diskPercentage = Math.min((diskData.used / diskData.total) * 100, 100);

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white animate-fadeIn pb-24 transition-colors duration-300">
<<<<<<< HEAD

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white">
            <ShieldCheck className="text-red-600 fill-red-600/10" size={32} />
            Admin Control Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${systemHealth === 'Optimal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            System Status: <span className={systemHealth === 'Optimal' ? 'text-green-600 dark:text-green-500' : 'text-red-500'}>{systemHealth}</span>
            {isSuperAdmin && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-900/50 font-black">SUPER ADMIN</span>}
          </p>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Real-time Load</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">{currentCpu}% <span className="text-xs font-normal text-gray-500">CPU Usage</span></h3></div>
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-500 rounded-lg"><Cpu size={20} /></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={cpuData} color="#3b82f6" /></div>
        </div>
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Server Storage</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">Infrastructure Health</h3></div>
            <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-500 rounded-lg"><HardDrive size={20} /></div>
          </div>
          <div className="space-y-1">
            <StorageBar label="MongoDB Vault" used={formatBytes(realDbSize)} total="512 MB" color="bg-purple-500 dark:bg-purple-600" percentage={dbPercentage} icon={Server} />
            <StorageBar label="Azure VM Disk (30GB)" used={formatBytes(diskData.used)} total={formatBytes(diskData.total)} color="bg-blue-500 dark:bg-blue-600" percentage={diskPercentage} icon={HardDrive} />
          </div>
        </div>
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Active Memory</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">{Math.round(memoryData[memoryData.length - 1]) || 0}% <span className="text-xs font-normal text-gray-500">RAM Usage</span></h3></div>
            <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500 rounded-lg"><Activity size={20} /></div>
          </div>
=======
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-gray-900 dark:text-white"><ShieldCheck className="text-red-600 fill-red-600/10" size={32} />Admin Command Center</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${systemHealth === 'Optimal' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>System Status: <span className={systemHealth === 'Optimal' ? "text-green-600 dark:text-green-500" : "text-red-500"}>{systemHealth}</span></p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={requestChangePin} className="flex items-center gap-2 bg-white dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-[#27272a] border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"><KeyRound size={16} /> Security Settings</button>
          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" name="admin-user-search" className="w-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl pl-10 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all shadow-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10"><div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Real-time Load</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">{currentCpu}% <span className="text-xs font-normal text-gray-500">CPU Usage</span></h3></div><div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-500 rounded-lg"><Cpu size={20} /></div></div>
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={cpuData} color="#3b82f6" /></div>
        </div>
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm dark:shadow-lg transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4"><div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Server Storage</p><h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">Infrastructure Health</h3></div><div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-500 rounded-lg"><HardDrive size={20} /></div></div>
          <div className="space-y-1"><StorageBar label="MongoDB Vault" used={formatBytes(realDbSize)} total="512 MB" color="bg-purple-500 dark:bg-purple-600" percentage={dbPercentage} icon={Server} /><StorageBar label="Azure VM Disk (30GB)" used={formatBytes(diskData.used)} total={formatBytes(diskData.total)} color="bg-blue-500 dark:bg-blue-600" percentage={diskPercentage} icon={HardDrive} /></div>
        </div>
        <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 relative overflow-hidden shadow-sm dark:shadow-lg transition-colors">
          <div className="flex justify-between items-start mb-4 relative z-10"><div><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Active Memory</p><h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">{Math.round(memoryData[memoryData.length - 1]) || 0}% <span className="text-xs font-normal text-gray-500">RAM Usage</span></h3></div><div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-500 rounded-lg"><Activity size={20} /></div></div>
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={memoryData} color="#10b981" /></div>
        </div>
      </div>

<<<<<<< HEAD
      {/* App Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">Control Apps</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {apps.map(app => (
            <AppTile key={app.id} icon={app.icon} label={app.label} color={app.color} textColor={app.textColor} badge={app.badge} onClick={() => setActiveApp(app.id)} />
          ))}
        </div>
      </div>
=======
      <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-lg overflow-hidden transition-colors mb-6">
        <div className="p-5 border-b border-gray-200 dark:border-[#27272a] flex justify-between items-center bg-gray-50 dark:bg-[#151518]">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Users size={18} className="text-blue-500" /> User Directory</h3>
          <span className="text-xs font-mono text-gray-500 bg-white dark:bg-[#27272a] border border-gray-200 dark:border-transparent px-2 py-1 rounded">Total: {users.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-[#1c1c1f] border-b border-gray-200 dark:border-[#27272a]">
              <tr><th className="px-6 py-4">User Identity</th><th className="px-6 py-4">Portal Status</th><th className="px-6 py-4">Last Sync Activity</th><th className="px-6 py-4">Storage Footprint</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#27272a]">
              {loading ? <tr><td colSpan="5" className="text-center py-8 text-gray-500 animate-pulse">Loading data stream...</td></tr> : filteredUsers.map((u) => <UserRow key={u._id} u={u} onInitiateDelete={setUserToDelete} isSuperAdmin={isSuperAdmin} onToggleRole={setRoleToToggle} />)}
            </tbody>
          </table>
        </div>
        {!loading && filteredUsers.length === 0 && <div className="p-8 text-center text-gray-500">No users found matching "{search}"</div>}
      </div>

      {changePinModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] w-full max-w-md rounded-3xl border border-[#333] shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-[#222] flex justify-between items-center bg-[#1A1A1A]"><h3 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound size={20} className="text-blue-500" /> Update Security PIN</h3><button onClick={() => { setChangePinModal({ isOpen: false, step: 'otp' }); setOtpInput(['', '', '', '', '', '']); setNewPin(['', '', '', '']); }} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button></div>
            {changePinModal.step === 'otp' ? (
              <form onSubmit={verifyOtpAndProceed} className="p-6 space-y-6">
                <div className="text-center"><div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center mb-4"><Mail size={28} className="text-blue-500" /></div><h4 className="text-lg font-bold text-white">Verification Required</h4><p className="text-sm text-gray-400 mt-1">We sent a 6-digit OTP to your admin email address.</p></div>
                <div>
                  <div className="flex justify-center gap-2">
                    {otpInput.map((digit, i) => (<input key={`otp-${i}`} ref={otpRefs[i]} type="text" maxLength={1} value={digit} autoComplete="off" name={`otp-box-${i}`} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)} onPaste={handleOtpPaste} className={`w-11 h-14 text-center text-xl font-black bg-[#1A1A1A] border-2 rounded-xl outline-none transition-all text-white ${digit ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-[#333] focus:border-blue-500/50'}`} autoFocus={i === 0} />))}
                  </div>
                  {modalError && <p className="text-red-500 text-xs text-center font-bold mt-4">{modalError}</p>}
                </div>
                <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all">Verify Identity</button>
              </form>
            ) : (
              <div className="p-6 space-y-6 text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4"><Lock size={28} className="text-emerald-500" /></div><h4 className="text-lg font-bold text-white">Set New PIN</h4><p className="text-sm text-gray-400 mt-1">Enter a new 4-digit code to secure the dashboard.</p>
                <div className="flex justify-center gap-3 my-4">
                  {newPin.map((digit, i) => (<input key={`newpin-${i}`} ref={newPinRefs[i]} type="password" maxLength={1} value={digit} autoComplete="new-password" name={`new-admin-pin-${i}`} onChange={(e) => handlePinChange(i, e.target.value, newPinRefs, setNewPin, newPin)} onKeyDown={(e) => handlePinKeyDown(i, e, newPinRefs, setNewPin, newPin)} className={`w-14 h-16 text-center text-2xl font-black bg-[#1A1A1A] border-2 rounded-xl outline-none transition-all text-white ${digit ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'border-[#333] focus:border-emerald-500/50'}`} autoFocus={i === 0} />))}
                </div>
                {modalError && <p className="text-red-500 text-xs text-center font-bold mt-2">{modalError}</p>}
                <button onClick={confirmNewPin} disabled={newPin.some(v => v === '') || isPinLoading} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex justify-center items-center">{isPinLoading ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Save Security PIN'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDelete}
        title="Delete User?"
        message="Are you sure you want to delete this user? This action is irreversible and will wipe all their associated data."
        confirmText="Delete User"
        confirmStyle="danger"
      />

      <ConfirmationModal
        isOpen={!!roleToToggle}
        onClose={() => setRoleToToggle(null)}
        onConfirm={executeToggleRole}
        title="Change Role?"
        message={`Are you sure you want to ${roleToToggle?.isAdmin ? "demote" : "promote"} ${roleToToggle?.name}? This modifies their access permissions.`}
        confirmText="Confirm Change"
        confirmStyle="warning"
      />
>>>>>>> 76eb399872c50f5e25d4c3ac8316e5f5dc92b77b
    </div>
  );
};

export default AdminDashboard;