// src/Settings.js
import React, { useState, useEffect } from 'react';
import { 
  Trash2, Plus, BookOpen, Book, AlertTriangle, Shield, Clock, 
  Lock, RefreshCw, X, CheckCircle2, Link2, Unlink 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

// --- HELPER: TOAST ---
const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-600 text-white shadow-emerald-900/20",
    error: "bg-red-600 text-white shadow-red-900/20",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 p-4 rounded-xl shadow-xl animate-slideUp ${styles[type]}`}>
      <CheckCircle2 size={20} />
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100" /></button>
    </div>
  );
};

const Settings = ({ 
  courses = [], addCourse, removeCourse, tasks = [], updateTask, idleTimeout, setIdleTimeout 
}) => {
  const [newCourse, setNewCourse] = useState("");
  const [selectedType, setSelectedType] = useState('uni');
  
  // Portal Connection State
  const [portalId, setPortalId] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [savedPortalId, setSavedPortalId] = useState('');
  const [connectionLoading, setConnectionLoading] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null); 
  
  // Confirmation Modal
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [affectedTasks, setAffectedTasks] = useState([]);

  // Toast State
  const [toast, setToast] = useState({ message: null, type: null });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: null }), 3000);
  };

  // --- FETCH PORTAL STATUS ---
  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/user/portal-status', {
          headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        setIsConnected(data.isConnected);
        if (data.isConnected) setSavedPortalId(data.portalId || 'Linked Account');
      } catch (err) { console.error(err); }
    };
    fetchStatus();
  }, []);

  // --- PORTAL ACTIONS ---
  const handleLink = async (e) => {
    e.preventDefault();
    setConnectionLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/user/link-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ portalId, portalPassword })
      });
      if (res.ok) {
        setIsConnected(true);
        setSavedPortalId(portalId);
        setPortalPassword('');
        showToast("Account connected securely!", "success");
      } else {
        showToast("Failed to connect.", "error");
      }
    } catch (err) {
       showToast("Server error.", "error");
    } finally { setConnectionLoading(false); }
  };

  const handleUnlink = async () => {
    if(!window.confirm("Disconnect portal? Automatic sync will stop.")) return;
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/user/unlink-portal', { 
        method: 'POST', 
        headers: { 'x-auth-token': token } 
      });
      setIsConnected(false);
      setSavedPortalId('');
      setPortalId('');
      showToast("Account disconnected.", "success");
    } catch (err) { console.error(err); }
  };

  // --- SYNC ACTION ---
  const handleSync = async () => {
    if (!isConnected) {
        setSyncError("NO_CREDENTIALS");
        return;
    }
    setIsSyncing(true);
    setSyncError(null); 

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sync-grades', { 
          method: 'POST',
          headers: { 'x-auth-token': token } 
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Sync Complete! Reloading...", "success");
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        setSyncError(data.message || "Connection Failed");
      }
    } catch (error) {
      setSyncError("Could not connect to server.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdd = () => {
    if (newCourse.trim()) {
      addCourse(newCourse.trim(), selectedType);
      setNewCourse("");
      showToast("Category added.", "success");
    }
  };

  const initiateDelete = (course) => {
    if (!course) return;
    const linkedTasks = tasks.filter(t => t.course === course.name);
    if (linkedTasks.length > 0) {
      setAffectedTasks(linkedTasks);
      setCourseToDelete(course);
    } else {
      removeCourse(course.id || course._id);
      showToast("Category removed.", "success");
    }
  };

  const confirmDelete = () => {
    if (courseToDelete) {
      affectedTasks.forEach(task => {
        if (updateTask) updateTask(task.id, 'course', 'Course Deleted');
      });
      removeCourse(courseToDelete.id || courseToDelete._id);
      showToast("Category deleted.", "success");
      setCourseToDelete(null);
      setAffectedTasks([]);
    }
  };

  const filteredCourses = courses.filter(c => c && c.name && c.type === selectedType);

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fadeIn pb-24 relative">
      <h2 className="text-3xl font-bold mb-6 dark:text-white text-gray-800">Settings</h2>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: null, type: null })} />
      
      {/* --- SECTION 1: UNIVERSITY PORTAL CONNECTION (NEW) --- */}
      <div className={`p-6 rounded-2xl border mb-8 transition-all ${isConnected ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#2C2C2C]'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-brand-blue'}`}>
                  {isConnected ? <Link2 size={24} /> : <Unlink size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg dark:text-white">University Portal Connection</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isConnected ? `Connected as ${savedPortalId}` : "Link your account to enable auto-sync."}
                  </p>
                </div>
            </div>
            {isConnected && (
              <button onClick={handleUnlink} className="text-red-500 hover:text-red-600 text-sm font-medium">Disconnect</button>
            )}
          </div>

          {!isConnected ? (
            <form onSubmit={handleLink} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Student ID (e.g., L1F21BSCS...)" 
                  value={portalId}
                  onChange={e => setPortalId(e.target.value)}
                  className="p-3 rounded-xl border border-gray-200 dark:border-[#444] bg-white dark:bg-[#252525] dark:text-white outline-none focus:ring-2 focus:ring-brand-blue"
                  required
                />
                <input 
                  type="password" 
                  placeholder="Portal Password" 
                  value={portalPassword}
                  onChange={e => setPortalPassword(e.target.value)}
                  className="p-3 rounded-xl border border-gray-200 dark:border-[#444] bg-white dark:bg-[#252525] dark:text-white outline-none focus:ring-2 focus:ring-brand-blue"
                  required
                />
              </div>
              <button disabled={connectionLoading} className="px-6 py-2.5 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all">
                {connectionLoading ? 'Connecting...' : 'Save & Connect'}
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 rounded-lg w-fit">
              <CheckCircle2 size={16} /> Automation Active
            </div>
          )}
      </div>

      {/* --- SECTION 2: MANAGE COURSES --- */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] p-6 shadow-sm mb-8">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="text-xl font-semibold flex items-center gap-2 dark:text-white text-gray-800">
               <BookOpen size={24} className="text-blue-600 dark:text-blue-500" />
               Manage Courses
             </h3>
             <p className="text-gray-500 dark:text-gray-400 mt-1">
               Manage categories. Syncing relies on the portal connection above.
             </p>
           </div>
           
           <button 
             onClick={handleSync} 
             disabled={isSyncing}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all active:scale-95 ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-600 shadow-blue-500/30'}`}
           >
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
             {isSyncing ? 'Syncing...' : 'Sync Now'}
           </button>
        </div>

        {/* Sync Notifications */}
        {isSyncing && !syncError && (
          <div className="mb-6 p-5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-4 text-white animate-slideUp">
             <div className="p-2 bg-white/20 rounded-full animate-spin"><RefreshCw size={24} className="text-white" /></div>
             <div><h4 className="font-bold text-base">Syncing...</h4><p className="text-sm opacity-90">Logging in securely and updating grades.</p></div>
          </div>
        )}

        {syncError && (
           <div className="mb-6 p-5 bg-red-600 rounded-xl shadow-lg shadow-red-900/20 flex items-start gap-4 text-white animate-slideUp">
             <div className="p-2 bg-white/20 rounded-full shrink-0"><AlertTriangle size={24} className="text-white" /></div>
             <div className="flex-1">
                <h4 className="font-bold text-base">Sync Failed</h4>
                <p className="text-sm opacity-90 mt-1">
                  {syncError === "NO_CREDENTIALS" ? "Please link your university account above first." : 
                   syncError === "LOGIN_FAILED" ? "Login failed. Please check your saved password." : syncError}
                </p>
             </div>
             <button onClick={() => setSyncError(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button>
          </div>
        )}

        {/* Course Filters & List */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex gap-3">
            <button onClick={() => setSelectedType('uni')} className={`flex items-center gap-3 px-5 py-3 rounded-xl font-medium border ${selectedType === 'uni' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 text-blue-600' : 'bg-white dark:bg-[#2C2C2C] border-gray-200 text-gray-700 dark:text-gray-300'}`}><UCPLogo className="w-8 h-8 text-current" /> University</button>
            <button onClick={() => setSelectedType('general')} className={`flex items-center gap-3 px-5 py-3 rounded-xl font-medium border ${selectedType === 'general' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 text-blue-600' : 'bg-white dark:bg-[#2C2C2C] border-gray-200 text-gray-700 dark:text-gray-300'}`}><Book size={28} className="text-current" /> General</button>
          </div>

          {selectedType === 'general' && (
             <div className="flex gap-3 relative z-10 animate-fadeIn">
               <input type="text" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} placeholder="Add category..." className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-[#2C2C2C] rounded-lg px-4 py-3 dark:text-white" />
               <button onClick={handleAdd} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium shadow-lg"><Plus size={20} /> Add</button>
             </div>
          )}
        </div>

        <div className="grid gap-3 relative z-0">
          {filteredCourses.map((course, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#2C2C2C] group animate-slideUp">
              <div className="flex items-center gap-4">
                 {course.type === 'uni' ? <UCPLogo className="w-8 h-8 text-blue-600 dark:text-blue-400" /> : <Book size={28} className="text-gray-400" />}
                 <div><span className="font-medium dark:text-white text-gray-700 text-lg block">{course.name}</span></div>
              </div>
              {course.type === 'uni' ? <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-200 dark:bg-[#2a2a2a] px-3 py-1.5 rounded-full"><Lock size={12} /> Synced</div> : <button onClick={() => initiateDelete(course)} className="text-gray-400 hover:text-red-500 p-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#333]"><Trash2 size={20} /></button>}
            </div>
          ))}
          {filteredCourses.length === 0 && <div className="text-center text-gray-400 italic py-12">No courses found.</div>}
        </div>
      </div>

      {/* --- SECTION 3: SECURITY --- */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-[#2C2C2C] p-3 rounded-full border border-gray-200 dark:border-[#3E3E3E]"><Clock size={20} className="text-gray-500 dark:text-gray-400" /></div>
            <div><h4 className="text-base font-bold text-gray-900 dark:text-white">Auto-Lock Timer</h4><p className="text-sm text-gray-500 dark:text-gray-400">Duration before screen lock.</p></div>
          </div>
          <select value={idleTimeout} onChange={(e) => setIdleTimeout(Number(e.target.value))} className="w-full md:w-48 px-4 py-2.5 bg-white dark:bg-[#2C2C2C] border border-gray-300 dark:border-[#3E3E3E] rounded-lg text-gray-800 dark:text-gray-200 text-sm outline-none">
            <option value={300000}>5 Minutes</option>
            <option value={900000}>15 Minutes</option>
            <option value={1800000}>30 Minutes</option>
            <option value={0}>Never</option>
          </select>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-red-600 dark:text-red-500" /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Category?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tasks will be marked as "Course Deleted".</p>
              <div className="flex gap-3">
                <button onClick={() => setCourseToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-[#2C2C2C]">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg">Yes, Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;