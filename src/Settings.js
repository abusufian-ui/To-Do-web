import React, { useState } from 'react';
import { 
  Trash2, Plus, BookOpen, Book, AlertTriangle, Shield, Clock, 
  Lock, RefreshCw, X, CheckCircle2 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

// --- HELPER: TOAST FOR SMALL ACTIONS (Add/Delete) ---
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
  courses = [], 
  addCourse, 
  removeCourse, 
  tasks = [], 
  updateTask,
  idleTimeout,
  setIdleTimeout 
}) => {
  const [newCourse, setNewCourse] = useState("");
  const [selectedType, setSelectedType] = useState('uni');
  
  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null); // To show red box
  
  // Confirmation Modal State
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [affectedTasks, setAffectedTasks] = useState([]);

  // Toast State (For Add/Delete only)
  const [toast, setToast] = useState({ message: null, type: null });

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: null }), 3000);
  };

  const handleAdd = () => {
    if (newCourse.trim()) {
      addCourse(newCourse.trim(), selectedType);
      setNewCourse("");
      showToast("Category added successfully.", "success");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null); // Reset error

    try {
      const res = await fetch('/api/sync-grades', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        showToast("Sync Complete! Reloading...", "success");
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        // Error: Show RED INLINE BOX
        if (res.status === 503) {
            setSyncError("PORTAL_DOWN");
        } else {
            setSyncError(data.message || "Connection Failed");
        }
      }
    } catch (error) {
      setSyncError("Could not connect to server.");
    } finally {
      setIsSyncing(false);
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
      
      {/* --- SECTION 1: MANAGE COURSES --- */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] p-6 shadow-sm mb-8">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="text-xl font-semibold flex items-center gap-2 dark:text-white text-gray-800">
               <BookOpen size={24} className="text-blue-600 dark:text-blue-500" />
               Manage Courses
             </h3>
             <p className="text-gray-500 dark:text-gray-400 mt-1">
               View your synced university courses or manage your personal categories.
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

        {/* --- INLINE NOTIFICATIONS (RESTORED) --- */}
        
        {/* 1. SYNCING (Real Blue) */}
        {isSyncing && !syncError && (
          <div className="mb-6 p-5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20 flex items-center gap-4 text-white animate-slideUp">
             <div className="p-2 bg-white/20 rounded-full animate-spin">
                <RefreshCw size={24} className="text-white" />
             </div>
             <div>
                <h4 className="font-bold text-base">Syncing with Portal...</h4>
                <p className="text-sm opacity-90 leading-snug">
                  Please wait while we fetch your grades. This may take up to 30 seconds.
                </p>
             </div>
          </div>
        )}

        {/* 2. ERROR (Real Red) */}
        {syncError && (
           <div className="mb-6 p-5 bg-red-600 rounded-xl shadow-lg shadow-red-900/20 flex items-start gap-4 text-white animate-slideUp">
             <div className="p-2 bg-white/20 rounded-full shrink-0">
                <AlertTriangle size={24} className="text-white" />
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-base">Sync Failed</h4>
                <p className="text-sm opacity-90 leading-relaxed mt-1">
                  {syncError === "PORTAL_DOWN" 
                    ? "The University Portal is currently down (403 Forbidden). We cannot access your grades right now."
                    : syncError}
                </p>
             </div>
             <button onClick={() => setSyncError(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
             </button>
          </div>
        )}

        {/* --- REST OF SETTINGS UI --- */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedType('uni')}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all border 
                ${selectedType === 'uni' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800' 
                  : 'bg-white dark:bg-[#2C2C2C] border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 opacity-60 hover:opacity-100'
                }`}
            >
              <UCPLogo className="w-8 h-8 text-current" /> University Courses
            </button>

            <button 
              onClick={() => setSelectedType('general')}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all border 
                ${selectedType === 'general' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800' 
                  : 'bg-white dark:bg-[#2C2C2C] border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 opacity-60 hover:opacity-100'
                }`}
            >
              <Book size={28} className="text-current" /> General Tasks
            </button>
          </div>

          {selectedType === 'uni' ? (
             <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-start gap-3">
                <Shield size={20} className="text-brand-blue mt-1 shrink-0" />
                <div>
                   <h4 className="font-bold text-brand-blue text-sm">Automated Sync Active</h4>
                   <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                     University courses are managed automatically by the Portal Robot.
                     <br/>To update this list, click the <b>Sync Now</b> button above.
                   </p>
                </div>
             </div>
          ) : (
             <div className="flex gap-3 relative z-10 animate-fadeIn">
               <input 
                 type="text" 
                 value={newCourse} 
                 onChange={(e) => setNewCourse(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                 placeholder="Add a new general category..."
                 className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-[#2C2C2C] rounded-lg px-4 py-3 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors text-base"
               />
               <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors text-base shadow-lg shadow-blue-500/30">
                 <Plus size={20} /> Add
               </button>
             </div>
          )}
        </div>

        {/* --- LIST --- */}
        <div className="grid gap-3 relative z-0">
          {filteredCourses.map((course, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#2C2C2C] group animate-slideUp">
              <div className="flex items-center gap-4">
                 {course.type === 'uni' ? <UCPLogo className="w-8 h-8 text-blue-600 dark:text-blue-400" /> : <Book size={28} className="text-gray-400" />}
                 <div>
                    <span className="font-medium dark:text-white text-gray-700 text-lg block">{course.name}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      {course.type === 'uni' ? 'University Course' : 'Personal Category'}
                    </span>
                 </div>
              </div>

              {course.type === 'uni' ? (
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-200 dark:bg-[#2a2a2a] px-3 py-1.5 rounded-full" title="Managed by Portal Sync">
                   <Lock size={12} /> Synced
                </div>
              ) : (
                <button onClick={() => initiateDelete(course)} className="text-gray-400 hover:text-red-500 transition-colors p-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#333]" title="Remove category">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}

          {filteredCourses.length === 0 && (
            <div className="text-center text-gray-400 italic py-12 bg-gray-50/50 dark:bg-[#121212]/50 rounded-xl border border-dashed border-gray-200 dark:border-[#2C2C2C]">
              No {selectedType === 'uni' ? 'University' : 'General'} courses found. 
              {selectedType === 'general' && <><br/> Add one above!</>}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: SECURITY & SESSION --- */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white text-gray-800">
          <Shield size={24} className="text-green-600 dark:text-green-500" />
          Security & Session
        </h3>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#2C2C2C]">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-[#2C2C2C] p-3 rounded-full border border-gray-200 dark:border-[#3E3E3E]">
              <Clock size={20} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">Auto-Lock Timer</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how long the portal waits before locking the screen.
              </p>
            </div>
          </div>

          <select 
            value={idleTimeout}
            onChange={(e) => setIdleTimeout(Number(e.target.value))}
            className="w-full md:w-48 px-4 py-2.5 bg-white dark:bg-[#2C2C2C] border border-gray-300 dark:border-[#3E3E3E] rounded-lg text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value={300000}>5 Minutes</option>
            <option value={900000}>15 Minutes (Default)</option>
            <option value={1800000}>30 Minutes</option>
            <option value={3600000}>1 Hour</option>
            <option value={0}>Never (Stay Logged In)</option>
          </select>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Category?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                The following tasks are assigned to <strong>"{courseToDelete.name}"</strong>. 
                Deleting this category will mark them as <span className="text-red-500 font-bold">"Course Deleted"</span>.
              </p>
              
              <div className="bg-gray-50 dark:bg-[#121212] rounded-lg p-3 mb-6 max-h-32 overflow-y-auto text-left border border-gray-200 dark:border-[#333]">
                {affectedTasks.map(t => (
                  <div key={t.id} className="text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-[#2C2C2C] last:border-0 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> {t.name}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setCourseToDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-[#2C2C2C] transition-colors">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/30 transition-all">
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;