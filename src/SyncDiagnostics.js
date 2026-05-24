import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle2, XCircle, AlertCircle, Clock, Activity, FileText, UserCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SyncDiagnostics = () => {
  const [data, setData] = useState({
    attendance: [],
    announcements: [],
    submissions: [],
    grades: [],
    timetable: [],
    syncLogs: [],
    courses: [],
    studentStats: null,
    user: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Admin Features
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');

  const fetchUsersList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/sync-diagnostics/users`, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const json = await res.json();
        setUsersList(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiagnostics = async (targetId = selectedUser) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = targetId 
        ? `${API_BASE}/api/sync-diagnostics?targetUserId=${targetId}` 
        : `${API_BASE}/api/sync-diagnostics`;
        
      const res = await fetch(url, {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
    fetchDiagnostics();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchDiagnostics(selectedUser);
    }
  }, [selectedUser]);

  const tabs = [
    { id: 'courses', label: 'Courses', count: data.courses?.length || 0 },
    { id: 'user', label: 'User Info', count: data.user ? 1 : 0 },
    { id: 'studentStats', label: 'Student Stats', count: data.studentStats ? 1 : 0 },
    { id: 'attendance', label: 'Attendance', count: data.attendance?.length || 0 },
    { id: 'announcements', label: 'Announcements', count: data.announcements?.length || 0 },
    { id: 'submissions', label: 'Submissions', count: data.submissions?.length || 0 },
    { id: 'grades', label: 'Grades', count: data.grades?.length || 0 },
    { id: 'timetable', label: 'Timetable', count: data.timetable?.length || 0 },
  ];

  const getActiveData = () => {
    if (activeTab === 'user') return data.user;
    if (activeTab === 'studentStats') return data.studentStats;
    return data[activeTab] || [];
  };

  const activeData = getActiveData();

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'FAILED': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'PENDING': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B] flex-col p-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2 text-gray-900 dark:text-white">
            <Activity className="text-blue-500" /> Sync Control Room
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Clock size={14} /> Last pulled: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {usersList.length > 0 && (
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-[#1A1A1D] border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">My Account</option>
              {usersList.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.portalId || 'No ID'})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => fetchDiagnostics(selectedUser)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh DB View'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        
        {/* Left Panel: Sync Logs */}
        <div className="w-1/3 flex flex-col bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1D] flex justify-between items-center">
            <h2 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Database size={18} /> Server Sync History
            </h2>
            <span className="text-xs font-mono text-gray-500 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
              {data.syncLogs?.length || 0} Logs
            </span>
          </div>
          
          <div className="flex-1 overflow-auto p-2 custom-scrollbar">
            {loading && data.syncLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading logs...</div>
            ) : data.syncLogs?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-4">
                No sync logs found. Trigger a sync from the mobile app to see history.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.syncLogs.map(log => (
                  <div key={log._id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1A1A1D] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">
                      Mode: <span className="text-blue-600 dark:text-blue-400 font-mono">{log.mode}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-gray-500">
                        {new Date(log.startTime).toLocaleDateString()}
                      </div>
                      {log.durationMs ? (
                        <div className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {(log.durationMs / 1000).toFixed(2)}s
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-gray-500 animate-pulse">Running...</div>
                      )}
                    </div>

                    {/* Diff Tracker Visualization */}
                    {log.status === 'SUCCESS' && (
                      <div className="mt-2 text-[11px]">
                        {!log.changesSummary ? (
                          <div className="text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded inline-block">
                            No new changes detected
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(log.changesSummary).map(([key, val]) => (
                              <span key={key} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">
                                {key}: {val.length} 
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {log.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30 word-break">
                        {log.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Data Explorer */}
        <div className="w-2/3 flex flex-col bg-white dark:bg-[#121214] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1A1D]">
            <div className="flex overflow-x-auto gap-1 pb-1 custom-scrollbar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 shadow-sm'
                      : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${activeData && activeTab === tab.id ? 'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1E1E1E] flex-1 overflow-hidden flex flex-col">
            <div className="bg-[#2D2D2D] px-4 py-2 flex items-center justify-between border-b border-gray-900 shrink-0">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                Raw JSON: {activeTab}
              </span>
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                {(Array.isArray(activeData) ? activeData.length > 0 : !!activeData) ? <CheckCircle2 size={14} /> : <XCircle className="text-red-400" size={14} />}
                {(Array.isArray(activeData) ? activeData.length : (activeData ? 1 : 0))} items found
              </span>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {loading && !activeData ? (
                <div className="h-full flex items-center justify-center text-gray-500 font-mono text-sm animate-pulse">
                  Querying database...
                </div>
              ) : (!activeData || (Array.isArray(activeData) && activeData.length === 0)) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 font-mono text-sm">
                  <Database size={32} className="mb-2 opacity-50" />
                  No records exist in the database for this collection.
                </div>
              ) : (
                <pre className="text-[13px] font-mono text-gray-300 whitespace-pre-wrap word-break">
                  {JSON.stringify(activeData, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SyncDiagnostics;
