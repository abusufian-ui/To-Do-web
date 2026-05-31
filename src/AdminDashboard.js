import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Activity, Search, Trash2,
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

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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

const StorageBar = ({ label, used, total, color, percentage, icon: Icon }) => {
  const pct = percentage !== undefined ? percentage : Math.min((used / total) * 100, 100);
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-gray-400" />} {label}
        </span>
        <span className="text-gray-700 dark:text-gray-300 font-bold">{used} <span className="text-gray-400 dark:text-gray-600">/ {total}</span></span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
};

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
const UserDirectoryApp = ({ users, loading, isSuperAdmin, token, onUsersChange, onRefresh }) => {
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

  const handleBulkLeaderboardToggle = async (enable) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/leaderboard-toggle-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ enable })
      });
      const data = await res.json();
      if (res.ok) {
        onUsersChange(users.map(u => ({ ...u, isLeaderboardEnabled: enable })));
        ToastConfig.show({
          title: 'Success',
          message: `Leaderboard ${enable ? 'enabled' : 'disabled'} for all users successfully.`,
          type: 'success'
        });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to update leaderboard access', type: 'error' });
      }
    } catch {
      ToastConfig.show({ title: 'Error', message: 'Failed to update leaderboard access', type: 'error' });
    }
  };

  const handleToggleLeaderboard = async (u) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${u._id}/leaderboard-toggle`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        onUsersChange(users.map(x => x._id === u._id ? { ...x, isLeaderboardEnabled: data.isLeaderboardEnabled } : x));
        ToastConfig.show({
          title: 'Success',
          message: `Leaderboard access ${data.isLeaderboardEnabled ? 'granted' : 'revoked'} for ${u.name}.`,
          type: 'success'
        });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to toggle access', type: 'error' });
      }
    } catch {
      ToastConfig.show({ title: 'Error', message: 'Failed to toggle access', type: 'error' });
    }
  };

  return (
    <div>
      <div className="p-5 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#27272a] border border-gray-200 dark:border-transparent rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500" />
          </div>
          <span className="text-xs font-mono bg-gray-100 dark:bg-[#27272a] px-3 py-2 rounded-lg text-gray-500">{users.length} total</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 bg-gray-100 dark:bg-[#27272a] hover:bg-gray-200 dark:hover:bg-[#323237] text-gray-600 dark:text-gray-300 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center border border-gray-200 dark:border-transparent"
              title="Refresh users from live DB"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkLeaderboardToggle(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            🔓 Enable Leaderboard for All
          </button>
          <button
            onClick={() => handleBulkLeaderboardToggle(false)}
            className="px-3.5 py-2 bg-gray-200 dark:bg-[#27272a] hover:bg-gray-300 dark:hover:bg-[#323237] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5"
          >
            🔒 Disable for All
          </button>
        </div>
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
              <th className="px-6 py-3">Leaderboard</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-12 text-gray-400 animate-pulse">Loading users…</td></tr>
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
                    {(() => {
                      const isTargetSuperAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                      const canToggle = !isTargetSuperAdmin && (isSuperAdmin || !u.isAdmin);
                      const isLdEnabled = isTargetSuperAdmin ? true : u.isLeaderboardEnabled;
                      return (
                        <button
                          onClick={() => handleToggleLeaderboard(u)}
                          disabled={!canToggle}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                            isLdEnabled
                              ? 'bg-indigo-600 dark:bg-indigo-500'
                              : 'bg-gray-300 dark:bg-gray-700'
                          } ${!canToggle ? 'opacity-45 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                          title={isTargetSuperAdmin 
                            ? 'Super Admin always has access' 
                            : u.isAdmin 
                              ? (isSuperAdmin ? 'Toggle Admin Leaderboard Access' : 'Only Super Admin can change Admin access') 
                              : 'Toggle Leaderboard Access'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${
                              isLdEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      );
                    })()}
                  </td>
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
              <tr><td colSpan="7" className="text-center py-12 text-gray-400">No users match "{search}"</td></tr>
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
const SessionInspectorApp = ({ users, token, loading, onRefresh }) => {
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <p className="text-sm text-gray-500 dark:text-gray-400">Verify whether a user's UCP portal session cookie is still active. Only portal-linked users with stored cookies are shown.</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 dark:bg-[#27272a] hover:bg-gray-200 dark:hover:bg-[#323237] text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-gray-200 dark:border-transparent shrink-0"
            title="Refresh users and session cookies from live DB"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Live Data</span>
          </button>
        )}
      </div>
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
// APP 6: SUPPORT TICKETS
// ────────────────────────────────────────────────────────────────────────────────
const SupportTicketsApp = ({ tickets, loading, token, onTicketsChange, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  
  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = tickets.filter(t => {
    const user = t.userId || { name: 'Unknown User', email: '' };
    const matchesSearch = 
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Clear selections when filter or search changes
  useEffect(() => {
    setSelectedIds([]);
  }, [search, statusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t._id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.some(t => t._id === id)));
    } else {
      const filteredIds = filtered.map(t => t._id);
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const handleResolve = async (id) => {
    if (!replyText.trim()) {
      ToastConfig.show({ title: 'Error', message: 'Please write a resolution response.', type: 'error' });
      return;
    }
    setSubmittingReplyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedback/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ adminResponse: replyText })
      });
      const data = await res.json();
      if (res.ok) {
        onTicketsChange(tickets.map(t => t._id === id ? data : t));
        ToastConfig.show({ title: 'Success', message: 'Ticket resolved and closed.', type: 'success' });
        setReplyText('');
        setExpandedId(null);
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to resolve ticket', type: 'error' });
      }
    } catch {
      ToastConfig.show({ title: 'Error', message: 'Network error resolving ticket', type: 'error' });
    }
    setSubmittingReplyId(null);
  };

  const handleReopen = async (id) => {
    setSubmittingReplyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedback/${id}/reopen`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token
        }
      });
      const data = await res.json();
      if (res.ok) {
        onTicketsChange(tickets.map(t => t._id === id ? data : t));
        ToastConfig.show({ title: 'Ticket Re-opened', message: 'The ticket has been re-opened for review.', type: 'success' });
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to re-open ticket', type: 'error' });
      }
    } catch {
      ToastConfig.show({ title: 'Error', message: 'Network error re-opening ticket', type: 'error' });
    }
    setSubmittingReplyId(null);
  };

  const executeBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedback/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (res.ok) {
        onTicketsChange(tickets.filter(t => !selectedIds.includes(t._id)));
        ToastConfig.show({ title: 'Success', message: `${selectedIds.length} tickets deleted successfully.`, type: 'success' });
        setSelectedIds([]);
      } else {
        ToastConfig.show({ title: 'Error', message: data.message || 'Failed to delete tickets', type: 'error' });
      }
    } catch {
      ToastConfig.show({ title: 'Error', message: 'Network error deleting tickets', type: 'error' });
    }
    setIsDeleting(false);
    setShowDeleteModal(false);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t._id));

  return (
    <div>
      <div className="p-5 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
            <input type="text" placeholder="Search tickets by user, title, desc…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#27272a] border border-gray-200 dark:border-transparent rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500" />
          </div>
          <span className="text-xs font-mono bg-gray-100 dark:bg-[#27272a] px-3 py-2 rounded-lg text-gray-500">{filtered.length} shown</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 bg-gray-100 dark:bg-[#27272a] hover:bg-gray-200 dark:hover:bg-[#323237] text-gray-600 dark:text-gray-300 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center border border-gray-200 dark:border-transparent"
              title="Refresh support tickets from live DB"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-red-600/10 animate-fadeIn"
            >
              <Trash2 size={13} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="flex bg-gray-100 dark:bg-[#27272a] p-1 rounded-xl">
          {['all', 'open', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${
                statusFilter === status 
                  ? 'bg-white dark:bg-[#151518] text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-[#1c1c1f] border-b border-gray-200 dark:border-[#27272a]">
            <tr>
              <th className="px-6 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#27272a] cursor-pointer"
                />
              </th>
              <th className="px-6 py-3">Identity</th>
              <th className="px-6 py-3">Subject / Title</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Submitted</th>
              <th className="px-6 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-12 text-gray-400 animate-pulse">Loading support tickets…</td></tr>
            ) : filtered.map(t => {
              const user = t.userId || { name: 'Unknown User', email: 'No email linked' };
              const isExpanded = expandedId === t._id;
              const isResolved = t.status === 'resolved';
              const isSelected = selectedIds.includes(t._id);

              return (
                <React.Fragment key={t._id}>
                  <tr className={`border-b border-gray-100 dark:border-[#27272a] hover:bg-gray-50 dark:hover:bg-[#1c1c1f] transition-colors ${isExpanded ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''} ${isSelected ? 'bg-blue-50/10 dark:bg-blue-900/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(t._id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-[#27272a] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar u={user} size={10} />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200 max-w-xs truncate">{t.subject}</td>
                    <td className="px-6 py-4">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Open
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setExpandedId(isExpanded ? null : t._id);
                          setReplyText('');
                        }}
                        className="px-3.5 py-1.5 bg-gray-100 dark:bg-[#27272a] hover:bg-gray-200 dark:hover:bg-[#323237] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold active:scale-95 transition-all"
                      >
                        {isExpanded ? 'Hide' : 'Inspect'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-gray-50/50 dark:bg-[#121214]/40">
                      <td colSpan="6" className="px-8 py-6 border-b border-gray-100 dark:border-[#27272a]">
                        <div className="max-w-4xl space-y-5 animate-fadeIn">
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Problem Details</h4>
                            <p className="text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed">{t.description}</p>
                          </div>

                          {t.screenshots && t.screenshots.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Attached Screenshots ({t.screenshots.length})</h4>
                              <div className="flex items-center gap-3.5 flex-wrap">
                                {t.screenshots.map((url, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setLightboxImage(url)}
                                    className="w-24 h-24 rounded-xl border border-gray-200 dark:border-[#27272a] overflow-hidden hover:scale-105 hover:border-blue-500 dark:hover:border-blue-400 transition-all shadow-sm active:scale-95 relative group"
                                  >
                                    <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye size={16} className="text-white" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {isResolved ? (
                            <div className="space-y-4">
                              <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400">
                                <h4 className="text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 size={14} /> Resolution Response from Admin
                                </h4>
                                <p className="text-sm font-medium leading-relaxed">{t.adminResponse}</p>
                              </div>
                              <button
                                onClick={() => handleReopen(t._id)}
                                disabled={submittingReplyId === t._id}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/15"
                              >
                                <RefreshCw size={13} />
                                Re-open Ticket
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 bg-gray-100/40 dark:bg-[#18181b]/50 p-5 rounded-2xl border border-gray-200/50 dark:border-[#27272a]/50">
                              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Send size={13} /> Respond & Resolve Ticket
                              </h4>
                              <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Explain the result, fix details, or response to the user. This will close the ticket instantly..."
                                rows={3}
                                className="w-full px-4 py-3 bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-[#27272a] rounded-xl text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-blue-500 resize-none leading-relaxed"
                              />
                              <button
                                onClick={() => handleResolve(t._id)}
                                disabled={submittingReplyId === t._id || !replyText.trim()}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                              >
                                {submittingReplyId === t._id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Resolve & Close Ticket
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="6" className="text-center py-12 text-gray-400">No tickets match search or filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Screenshot Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fadeIn cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-md active:scale-95 cursor-pointer z-55"
          >
            <X size={20} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen Screenshot" 
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-scaleIn cursor-default" 
          />
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeBulkDelete}
        title="Delete Selected Tickets?"
        message={`Are you sure you want to permanently delete these ${selectedIds.length} support tickets? Upon deletion, these queries will no longer be visible on the client side as well. This cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        confirmStyle="danger"
      />
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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState(false);
  const [isPinLoading, setIsPinLoading] = useState(false);
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
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (isUnlocked) {
      fetchUsers();
      fetchTickets();
      fetchRealStats();
      const iv = setInterval(fetchRealStats, 2000);
      return () => clearInterval(iv);
    }
  }, [isUnlocked]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch { }
    setLoadingUsers(false);
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/feedback`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch { }
    setLoadingTickets(false);
  };

  const fetchRealStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/system-stats`, { headers: { 'x-auth-token': token } });
      if (res.ok) {
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
    setIsPinLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ pin })
      });
      if (res.ok) setIsUnlocked(true);
      else { setPinError(true); setPinInput(['', '', '', '']); lockRefs[0].current.focus(); }
    } catch { }
    setIsPinLoading(false);
  };

  // ── PIN Lock ──────────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A] relative overflow-hidden animate-fadeIn">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
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
      </div>
    );
  }

  // ── App definitions ──────────────────────────────────────────────────────
  const apps = [
    { id: 'users',         label: 'User Directory',        icon: Users,        color: 'bg-blue-100 dark:bg-blue-900/30',    textColor: 'text-blue-600 dark:text-blue-400',    badge: users.length },
    { id: 'tickets',       label: 'Support Tickets',       icon: Mail,         color: 'bg-yellow-100 dark:bg-yellow-900/30', textColor: 'text-yellow-600 dark:text-yellow-500', badge: tickets.filter(t => t.status === 'open').length },
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
          {activeApp === 'users'         && <UserDirectoryApp users={users} loading={loadingUsers} isSuperAdmin={isSuperAdmin} token={token} onUsersChange={setUsers} onRefresh={fetchUsers} />}
          {activeApp === 'tickets'       && <SupportTicketsApp tickets={tickets} loading={loadingTickets} token={token} onTicketsChange={setTickets} onRefresh={fetchTickets} />}
          {activeApp === 'sessions'      && <SessionInspectorApp users={users} token={token} loading={loadingUsers} onRefresh={fetchUsers} />}
          {activeApp === 'diagnostics'   && <SyncDiagnostics />}
          {activeApp === 'notifications' && <NotificationsManagerApp users={users} isSuperAdmin={isSuperAdmin} token={token} />}
          {activeApp === 'security'      && <SecurityApp token={token} />}
        </div>
      </div>
    );
  }

  // ── Main dashboard ────────────────────────────────────────────────────────
  const currentCpu = cpuData[cpuData.length - 1] || 0;
  const dbLimitBytes = 512 * 1024 * 1024;
  const dbPercentage = Math.min((realDbSize / dbLimitBytes) * 100, 100);
  const diskPercentage = Math.min((diskData.used / diskData.total) * 100, 100);

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white animate-fadeIn pb-24 transition-colors duration-300">

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
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-50"><LiveGraph data={memoryData} color="#10b981" /></div>
        </div>
      </div>

      {/* App Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-4">Control Apps</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {apps.map(app => (
            <AppTile key={app.id} icon={app.icon} label={app.label} color={app.color} textColor={app.textColor} badge={app.badge} onClick={() => setActiveApp(app.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;