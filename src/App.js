import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Heart, ArrowRight } from 'lucide-react'; 
import CashManager from './CashManager';
import TaskSummaryModal from './TaskSummaryModal';
import MyProfile from './MyProfile';
import Timetable from './TimeTable'; 
import HabitTracker from './HabitTracker';
import Notes from './Notes';

// Enforcing the correct backend port (5000)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [prefilledDate, setPrefilledDate] = useState('');
  const [viewTask, setViewTask] = useState(null);

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  const [notes, setNotes] = useState([]); 
  const [isAddingNewNote, setIsAddingNewNote] = useState(false);
  const [binItems, setBinItems] = useState([]);

  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: ''
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-auth-token': token
  }), [token]);

  // --- AUTH HANDLERS ---
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setActiveTab('Welcome');
  }, []);

  const handleLogin = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const checkForInactivity = useCallback(() => {
    if (!isAuthenticated || idleTimeout === 0) return;
    const timer = setTimeout(() => {
      console.log("Session timed out. Logging out...");
      handleLogout();
    }, idleTimeout);
    return timer;
  }, [isAuthenticated, idleTimeout, handleLogout]);

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
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      if (res.ok) {
        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }
    } catch (error) { console.error("Error fetching user:", error); }
  }, [authHeaders, handleLogout]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      const formattedTasks = data.map(t => ({ ...t, id: t._id }));
      setTasks(formattedTasks);
    } catch (error) { console.error("Error fetching tasks:", error); }
  }, [authHeaders, handleLogout]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notes`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      setNotes(data);
    } catch (error) { console.error("Error fetching notes:", error); }
  }, [authHeaders, handleLogout]);

  const fetchBin = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bin`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      
      const formattedBin = [
        ...(data.tasks || []).map(t => ({ ...t, id: t._id, binType: 'Task', name: t.name, subtitle: t.course })),
        ...(data.transactions || []).map(t => ({ ...t, id: t._id, binType: 'Transaction', name: t.description || 'Transaction', subtitle: `Rs ${t.amount}` })),
        ...(data.habits || []).map(h => ({ ...h, id: h._id, binType: 'Habit', name: h.name, subtitle: h.type === 'good' ? 'Good Protocol' : 'Bad Protocol' })),
        ...(data.notes || []).map(n => ({ ...n, id: n._id, binType: 'Note', name: n.title, subtitle: n.courseId }))
      ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      
      setBinItems(formattedBin);
    } catch (error) { console.error("Error fetching bin:", error); }
  }, [authHeaders, handleLogout]);

  const fetchCourses = useCallback(async () => {
    const fixedCourses = [{ id: 'general-task', name: 'General Course', type: 'general' }];
    let uniCourses = [];
    let customCourses = [];

    try {
      const res = await fetch(`${API_BASE}/api/grades`, { headers: authHeaders });
      if (res.ok) {
        const gradeData = await res.json();
        uniCourses = (Array.isArray(gradeData) ? gradeData : []).map(g => ({
          id: g._id, name: g.courseName, type: 'uni'
        }));
      }
    } catch (error) { console.error("Error fetching uni courses:", error); }

    try {
      const res = await fetch(`${API_BASE}/api/courses`, { headers: authHeaders });
      if (res.ok) {
        const customData = await res.json();
        customCourses = (Array.isArray(customData) ? customData : []).map(c => ({
          id: c._id, name: c.name, type: 'general'
        }));
      }
    } catch (error) { console.error("Error fetching custom courses:", error); }

    setCourses([...fixedCourses, ...uniCourses, ...customCourses]);
  }, [authHeaders]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUser();
      fetchTasks();
      fetchNotes();
      fetchBin();
      fetchCourses();
    }
  }, [isAuthenticated, token, fetchUser, fetchTasks, fetchNotes, fetchBin, fetchCourses]);

  // --- TASK ACTIONS ---
  const handleAddTask = async (newTaskData) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
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
      await fetch(`${API_BASE}/api/tasks/${taskToDelete}/delete`, { method: 'PUT', headers: authHeaders });
      fetchTasks();
      fetchBin(); 
      setTaskToDelete(null);
    } catch (error) { console.error("Error deleting task:", error); }
  };

  // --- UNIVERSAL ACTIONS ---
  const restoreItem = async (id, type) => {
    const endpoints = { 'Task': 'tasks', 'Transaction': 'transactions', 'Habit': 'habits', 'Note': 'notes' };
    try {
      await fetch(`${API_BASE}/api/${endpoints[type]}/${id}/restore`, { method: 'PUT', headers: authHeaders });
      fetchBin();
      if (type === 'Task') fetchTasks();
      if (type === 'Note') fetchNotes();
    } catch (error) { console.error("Error restoring:", error); }
  };

  const permanentlyDeleteItem = async (id, type) => {
    const endpoints = { 'Task': 'tasks', 'Transaction': 'transactions', 'Habit': 'habits', 'Note': 'notes' };
    try {
      await fetch(`${API_BASE}/api/${endpoints[type]}/${id}`, { method: 'DELETE', headers: authHeaders });
      setBinItems(prev => prev.filter(item => item.id !== id));
    } catch (error) { console.error("Error deleting permanently:", error); }
  };

  const restoreAllBin = async () => {
    try { 
      await fetch(`${API_BASE}/api/bin/restore-all`, { method: 'PUT', headers: authHeaders }); 
      fetchTasks();
      fetchNotes();
      fetchBin(); 
    } catch (error) { }
  };

  const deleteAllBin = async () => {
    try { 
      await fetch(`${API_BASE}/api/bin/empty`, { method: 'DELETE', headers: authHeaders }); 
      setBinItems([]); 
    } catch (error) { }
  };

  const updateTask = async (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, [field]: value } : task));
    try {
      await fetch(`${API_BASE}/api/tasks/${id}`, {
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

  // NEW FILTER LOGIC FOR NOTES
  const getFilteredNotes = () => {
    return notes.filter(note => {
      // 1. Check Search Query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = note.title?.toLowerCase().includes(query) || false;
        
        // Strip HTML to search actual text content securely
        const plainContent = new DOMParser().parseFromString(note.content || '', 'text/html').body.textContent || "";
        const matchesContent = plainContent.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesContent) return false;
      }
      
      // 2. Check Course Filter
      if (filters.course !== 'All' && note.courseId !== filters.course) return false;
      
      return true;
    });
  };

  // --- SETTINGS ACTIONS ---
  const handleManualSync = async () => {
    try {
      await fetch(`${API_BASE}/api/sync-grades`, { method: 'POST', headers: authHeaders });
      fetchCourses();
    } catch (e) { throw e; }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/user/unlink-portal`, { method: 'POST', headers: authHeaders });
      const updatedUser = { ...user, isPortalConnected: false, portalId: null };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCourses(prev => prev.filter(c => c.type !== 'uni'));
    } catch (e) { console.error(e); }
  };

  const handleLinkPortal = async (portalId, portalPassword) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/link-portal`, {
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
      const res = await fetch(`${API_BASE}/api/user/profile`, {
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
      const res = await fetch(`${API_BASE}/api/user/password`, {
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

  const addCourse = async (courseName) => {
    if (!courseName || !courseName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/courses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: courseName.trim() })
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch (e) { console.error("Add course failed", e); }
  };

  const removeCourse = async (courseId) => {
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch (e) { console.error("Delete course failed", e); }
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    if (tab === 'Bin') fetchBin(); 
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 relative ${isDarkMode ? 'dark bg-dark-bg' : 'bg-gray-50'}`}>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[50] md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        binCount={binItems.length}
        user={user}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-300 w-full">
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
          onNavigate={handleNavigate}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          notes={notes}
          onAddNoteClick={() => setIsAddingNewNote(true)}
          onOpenNote={(note) => console.log("Open Note from search:", note)} 
        />
        <div className="flex-1 overflow-auto p-0 relative custom-scrollbar-hide">

          {activeTab === 'Welcome' && (
            <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center animate-fadeIn">
              <div className="max-w-2xl">
                <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 dark:text-white text-gray-900 tracking-tight">Welcome, {user?.name || 'Student'}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-8 md:mb-12">Select a module from the sidebar to manage your academic journey.</p>
                <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-6 md:p-8 rounded-2xl shadow-lg relative overflow-hidden transition-colors">
                  <Heart className="w-8 h-8 text-brand-pink mb-4 mx-auto animate-pulse" fill="#E11D48" />
                  <p className="text-lg md:text-2xl font-medium dark:text-white text-gray-800 leading-relaxed font-serif italic">"Your mom and dad are still waiting to celebrate your success."</p>
                  <div className="mt-6 flex justify-center">
                    <button onClick={() => handleNavigate('Tasks')} className="text-brand-blue hover:text-blue-600 flex items-center gap-2 transition-colors font-medium">Start working now <ArrowRight size={16} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Notes' && (
            <Notes 
              courses={courses} 
              notes={getFilteredNotes()} 
              setNotes={setNotes} 
              isAddingNew={isAddingNewNote} 
              setIsAddingNew={setIsAddingNewNote} 
              fetchNotes={fetchNotes} 
              fetchBin={fetchBin}     
            />
          )}

          {activeTab === 'Tasks' && <TaskTable tasks={getFilteredTasks()} updateTask={updateTask} courses={courses} deleteTask={deleteTask} />}
          {activeTab === 'Calendar' && <Calendar tasks={tasks} courses={courses} onAddWithDate={openAddTaskWithDate} onUpdate={updateTask} onDelete={deleteTask} />}
          {activeTab === 'Timetable' && <Timetable />} 
          {activeTab === 'Habits' && <HabitTracker />} 
          {activeTab === 'Grade Book' && <GradeBook />}
          {activeTab === 'History' && <ResultHistory />}
          {activeTab.startsWith('Cash-') && <CashManager activeTab={activeTab} />}
          {activeTab === 'Bin' && <Bin binItems={binItems} restoreItem={restoreItem} permanentlyDeleteItem={permanentlyDeleteItem} deleteAll={deleteAllBin} restoreAll={restoreAllBin} />}
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