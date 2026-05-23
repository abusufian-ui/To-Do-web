import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SyncDiagnostics = () => {
  const [data, setData] = useState({
    attendance: [],
    announcements: [],
    submissions: [],
    grades: [],
    timetable: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/sync-diagnostics`, {
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
    fetchDiagnostics();
  }, []);

  const tabs = [
    { id: 'attendance', label: 'Attendance', count: data.attendance?.length || 0 },
    { id: 'announcements', label: 'Announcements', count: data.announcements?.length || 0 },
    { id: 'submissions', label: 'Submissions', count: data.submissions?.length || 0 },
    { id: 'grades', label: 'Grades (Control)', count: data.grades?.length || 0 },
    { id: 'timetable', label: 'Timetable (Control)', count: data.timetable?.length || 0 },
  ];

  const activeData = data[activeTab] || [];

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B] flex-col p-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2 text-gray-900 dark:text-white">
            <Database className="text-blue-500" /> Sync Diagnostics
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <Clock size={14} /> Last pulled: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Fetching DB...' : 'Refresh DB View'}
        </button>
      </div>

      <div className="bg-white dark:bg-[#121214] border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mb-6 flex gap-3 text-red-800 dark:text-red-300">
        <AlertCircle className="shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <p className="font-bold mb-1">How to test if the scraper is failing:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Keep this page open. Note the array counts below (e.g., Attendance: 0).</li>
            <li>Click the "Sync from UCP Portal" button in your Chrome Extension.</li>
            <li>Once the extension says "Synced!", click the blue <strong>Refresh DB View</strong> button above.</li>
            <li>If the arrays for Announcements/Attendance/Submissions are still empty, the scraper is failing to extract them on the frontend and is sending empty arrays to the server.</li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
              activeTab === tab.id
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400 shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 dark:bg-[#1A1A1D] dark:border-gray-800 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeData.length > 0 && activeTab === tab.id ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Data Viewer */}
      <div className="flex-1 bg-[#1E1E1E] rounded-xl overflow-hidden shadow-inner border border-gray-800 flex flex-col">
        <div className="bg-[#2D2D2D] px-4 py-2 flex items-center justify-between border-b border-gray-900">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            MongoDB Collection: {activeTab.toUpperCase()}
          </span>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            {activeData.length > 0 ? <CheckCircle2 size={14} /> : <XCircle className="text-red-400" size={14} />}
            {activeData.length} documents found
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {loading ? (
             <div className="h-full flex items-center justify-center text-gray-500 font-mono text-sm animate-pulse">
               Querying database...
             </div>
          ) : activeData.length === 0 ? (
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
  );
};

export default SyncDiagnostics;
