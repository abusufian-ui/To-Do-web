import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TaskTable from './TaskTable';
import Settings from './Settings';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import Bin from './Bin';
import Login from './Login';
import Calendar from './Calendar'; 
import GradeBook from './GradeBook'; 
import ResultHistory from './ResultHistory';
import AdminDashboard from './AdminDashboard';
import { Heart, ArrowRight, StickyNote } from 'lucide-react'; 
import CashManager from './CashManager';
import TaskSummaryModal from './TaskSummaryModal';
import MyProfile from './MyProfile'; 

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  
  const isAuthenticated = !!token;

  // --- THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- TIMEOUT STATE ---
  const [idleTimeout, setIdleTimeout] = useState(() => {
    const saved = localStorage.getItem('idleTimeout');
    return saved ? parseInt(saved, 10) : 300000;
  });

  useEffect(() => {
    localStorage.setItem('idleTimeout', idleTimeout);
  }, [idleTimeout]);

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState('Welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null); 
  const [prefilledDate, setPrefilledDate] = useState(''); 
  const [viewTask, setViewTask] = useState(null);

  const [courses, setCourses] = useState([]); 
  const [tasks, setTasks] = useState([]); 
  const [deletedTasks, setDeletedTasks] = useState([]); 

  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: ''
  });

  const authHeaders = { 'Content-Type': 'application/json', 'x-auth-token': token };

  // --- AUTH HANDLERS ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setActiveTab('Welcome');
  };

  const handleLogin = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  // --- IDLE CHECK ---
  const checkForInactivity = useCallback(() => {
    if (!isAuthenticated || idleTimeout === 0) return;
    const timer = setTimeout(() => {
      console.log("Session timed out. Logging out...");
      handleLogout();
    }, idleTimeout);
    return timer;
  }, [isAuthenticated, idleTimeout]);

  useEffect(() => {
    let timeoutId = checkForInactivity();
    const handleUserActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = checkForInactivity();
    };
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, [checkForInactivity]);

  // --- DATA FETCHING ---
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/user', { headers: authHeaders });
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }
    } catch (error) { console.error("Error fetching user:", error); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      const formattedTasks = data.map(t => ({ ...t, id: t._id }));
      setTasks(formattedTasks);
    } catch (error) { console.error("Error fetching tasks:", error); }
  };

  const fetchBin = async () => {
    try {
      const res = await fetch('/api/bin', { headers: authHeaders });
      const data = await res.json();
      const formattedBin = data.map(t => ({ ...t, id: t._id }));
      setDeletedTasks(formattedBin);
    } catch (error) { console.error("Error fetching bin:", error); }
  };

  // --- FETCH COURSES ---
  const fetchCourses = async () => {
    // 1. UPDATED: Fixed "General Course" (Not General Task)
    const fixedCourses = [{ id: 'general-task', name: 'General Course', type: 'general' }];
    let uniCourses = [];
    let customCourses = [];

    // 2. Fetch Uni Courses
    try {
      const res = await fetch('/api/grades', { headers: authHeaders });
      const gradeData = await res.json();
      const safeData = Array.isArray(gradeData) ? gradeData : [];
      uniCourses = safeData.map(g => ({
        id: g._id, name: g.courseName, type: 'uni'
      }));
    } catch (error) { console.error("Error fetching uni courses:", error); }

    // 3. Fetch Custom Courses
    try {
      const res = await fetch('/api/courses', { headers: authHeaders });
      const customData = await res.json();
      const safeCustom = Array.isArray(customData) ? customData : [];
      customCourses = safeCustom.map(c => ({
        id: c._id, name: c.name, type: 'general'
      }));
    } catch (error) { console.error("Error fetching custom courses:", error); }

    // 4. Merge all
    setCourses([...fixedCourses, ...uniCourses, ...customCourses]);
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUser(); 
      fetchTasks();
      fetchBin();
      fetchCourses();
    }
  }, [isAuthenticated, token]);

  // --- TASK ACTIONS ---
  const handleAddTask = async (newTaskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newTaskData)
      });
      if (!res.ok) throw new Error("Server Error");
      const savedTask = await res.json();
      setTasks(prev => [{ ...savedTask, id: savedTask._id }, ...prev]);
      if (activeTab !== 'Tasks' && activeTab !== 'Calendar') setActiveTab('Tasks');
    } catch (error) { alert("Failed to save task."); }
  };

  const deleteTask = (taskId) => setTaskToDelete(taskId); 

  const executeDelete = async () => {
    if (!taskToDelete) return;
    try {
      await fetch(`/api/tasks/${taskToDelete}/delete`, { method: 'PUT', headers: authHeaders });
      const taskObj = tasks.find(t => t.id === taskToDelete);
      if (taskObj) {
        setDeletedTasks([{ ...taskObj, deletedAt: new Date().toISOString() }, ...deletedTasks]);
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToDelete));
      }
      setTaskToDelete(null);
    } catch (error) { console.error("Error deleting task:", error); }
  };

  const restoreTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}/restore`, { method: 'PUT', headers: authHeaders });
      const taskToRestore = deletedTasks.find(t => t.id === taskId);
      if (taskToRestore) {
        const { deletedAt, ...rest } = taskToRestore; 
        setTasks([rest, ...tasks]);
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) { console.error("Error restoring task:", error); }
  };

  const permanentlyDeleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders });
      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) { console.error("Error deleting permanently:", error); }
  };

  const restoreAll = async () => {
    try {
      await fetch('/api/bin/restore-all', { method: 'PUT', headers: authHeaders });
      fetchTasks(); fetchBin();
    } catch (error) { console.error("Error restoring all:", error); }
  };

  const deleteAll = async () => {
    try {
      await fetch('/api/bin/empty', { method: 'DELETE', headers: authHeaders });
      setDeletedTasks([]);
    } catch (error) { console.error("Error emptying bin:", error); }
  };

  const updateTask = async (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, [field]: value } : task));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) { console.error("Error updating task:", error); }
  };

  const openAddTaskWithDate = (dateString) => {
    setPrefilledDate(dateString);
    setIsAddTaskOpen(true);
  };

  // --- HELPER FUNCTIONS ---
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = task.name?.toLowerCase().includes(query) || false;
        const matchesCourse = task.course?.toLowerCase().includes(query) || false;
        if (!matchesName && !matchesCourse) return false; 
      }
      if (filters.course !== 'All' && task.course !== filters.course) return false;
      if (filters.status !== 'All' && task.status !== filters.status) return false;
      if (filters.priority !== 'All' && task.priority !== filters.priority) return false;
      if (filters.startDate && task.date < filters.startDate) return false;
      if (filters.endDate && task.date > filters.endDate) return false;
      return true;
    });
  };

  // --- SETTINGS ACTIONS ---
  const handleManualSync = async () => {
    try {
      await fetch('/api/sync-grades', { method: 'POST', headers: authHeaders });
      fetchCourses();
    } catch (e) { throw e; }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/user/unlink-portal', { method: 'POST', headers: authHeaders });
      const updatedUser = { ...user, isPortalConnected: false, portalId: null };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCourses(prev => prev.filter(c => c.type !== 'uni')); 
    } catch (e) { console.error(e); }
  };

  const handleLinkPortal = async (portalId, portalPassword) => {
    try {
      const res = await fetch('/api/user/link-portal', { 
        method: 'POST', 
        headers: authHeaders,
        body: JSON.stringify({ portalId, portalPassword })
      });
      if (res.ok) {
        const updatedUser = { ...user, isPortalConnected: true, portalId };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        fetchCourses();
      } else {
        throw new Error("Failed to link");
      }
    } catch (e) { throw e; }
  };

  const handleUpdateProfile = async (name) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        throw new Error("Update failed");
      }
    } catch (e) { throw e; }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
    } catch (e) { throw e; }
  };

  // --- NEW ADD COURSE (Server Call) ---
  const addCourse = async (courseName) => {
    if (!courseName || !courseName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: courseName.trim() })
      });
      if (res.ok) {
        fetchCourses(); // Reload list from server
      }
    } catch (e) { console.error("Add course failed", e); }
  };

  // --- NEW REMOVE COURSE (Server Call) ---
  const removeCourse = async (courseId) => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        fetchCourses(); // Reload list from server
      }
    } catch (e) { console.error("Delete course failed", e); }
  };

  const handleUpdateLocalUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-dark-bg' : 'bg-gray-50'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        binCount={deletedTasks.length} 
        user={user} 
      />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
        <Header 
          activeTab={activeTab}
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme} 
          filters={filters} 
          setFilters={setFilters} 
          courses={courses} 
          onAddClick={() => { setPrefilledDate(''); setIsAddTaskOpen(true); }} 
          user={user}
          onLogout={handleLogout}
          tasks={tasks}
          onOpenTask={(task) => setViewTask(task)}
          onNavigate={(tab) => setActiveTab(tab)} 
        />
        <div className="flex-1 overflow-auto p-0 relative custom-scrollbar-hide">
          
          {activeTab === 'Welcome' && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold mb-6 dark:text-white text-gray-900 tracking-tight">Welcome, {user?.name || 'Student'}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-12">Select a module from the sidebar to manage your academic journey.</p>
                <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-8 rounded-2xl shadow-lg relative overflow-hidden transition-colors">
                  <Heart className="w-8 h-8 text-brand-pink mb-4 mx-auto animate-pulse" fill="#E11D48" />
                  <p className="text-xl md:text-2xl font-medium dark:text-white text-gray-800 leading-relaxed font-serif italic">"Your mom and dad are still waiting to celebrate your success."</p>
                  <div className="mt-6 flex justify-center">
                    <button onClick={() => setActiveTab('Tasks')} className="text-brand-blue hover:text-blue-600 flex items-center gap-2 transition-colors font-medium">Start working now <ArrowRight size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Notes' && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="max-w-md bg-white dark:bg-[#1E1E1E] border border-dashed border-gray-300 dark:border-[#333] p-12 rounded-3xl shadow-sm">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
                  <StickyNote size={40} />
                </div>
                <h2 className="text-2xl font-bold dark:text-white text-gray-900 mb-3 tracking-tight">Notes Module</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                  We're crafting a workspace for your lecture insights and quick thoughts. 
                  This section is currently <strong>under development</strong>.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-widest rounded-full border border-gray-200 dark:border-dark-border">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  Coming Soon
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tasks' && <TaskTable tasks={getFilteredTasks()} updateTask={updateTask} courses={courses} deleteTask={deleteTask}/>}
          {activeTab === 'Calendar' && <Calendar tasks={tasks} courses={courses} onAddWithDate={openAddTaskWithDate} onUpdate={updateTask} onDelete={deleteTask} />}
          {activeTab === 'Grade Book' && <GradeBook />}
          {activeTab === 'History' && <ResultHistory />}
          {activeTab.startsWith('Cash-') && <CashManager activeTab={activeTab} />}
          {activeTab === 'Bin' && <Bin deletedTasks={deletedTasks} restoreTask={restoreTask} permanentlyDeleteTask={permanentlyDeleteTask} deleteAll={deleteAll} restoreAll={restoreAll}/>}
          {activeTab === 'Admin' && <AdminDashboard />}
          {activeTab === 'Profile' && <MyProfile user={user} />}
          
          {activeTab === 'Settings' && (
            <Settings 
              user={user} 
              idleTimeout={idleTimeout} 
              setIdleTimeout={setIdleTimeout}
              onManualSync={handleManualSync}
              onDisconnect={handleDisconnect}
              onLinkPortal={handleLinkPortal} 
              onUpdateProfile={handleUpdateProfile} 
              onChangePassword={handleChangePassword} 
              courses={courses}
              addCourse={addCourse}
              removeCourse={removeCourse}
            />
          )}

        </div>
      </div>
      
      <style>{`
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <AddTaskModal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} onSave={handleAddTask} courses={courses} initialDate={prefilledDate} tasks={tasks} />
      <TaskSummaryModal isOpen={!!viewTask} onClose={() => setViewTask(null)} task={viewTask} courses={courses} onUpdate={updateTask} />
      <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={executeDelete} title="Move to Bin?" message="Are you sure you want to move this task to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
    </div>
  );
}

export default App;