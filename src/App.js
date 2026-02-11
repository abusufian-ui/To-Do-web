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
import { Heart, ArrowRight } from 'lucide-react';
import CashManager from './CashManager';

function App() {
  // --- UPDATED AUTH STATE ---
  // Using 'token' determines if user is logged in. No more sessionStorage.
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  
  const isAuthenticated = !!token;

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

  const [idleTimeout, setIdleTimeout] = useState(() => {
    const saved = localStorage.getItem('idleTimeout');
    return saved ? parseInt(saved, 10) : 900000;
  });

  useEffect(() => {
    localStorage.setItem('idleTimeout', idleTimeout);
  }, [idleTimeout]);

  const [activeTab, setActiveTab] = useState('Welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null); 
  const [prefilledDate, setPrefilledDate] = useState(''); 

  const [courses, setCourses] = useState([]); 
  const [tasks, setTasks] = useState([]); 
  const [deletedTasks, setDeletedTasks] = useState([]); 

  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: ''
  });

  // --- UPDATED LOGOUT HANDLER ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear any potential session leftovers
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setActiveTab('Welcome');
  };

  // --- UPDATED LOGIN HANDLER ---
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

  // --- DATA FETCHING (Authenticated) ---
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTasks();
      fetchBin();
      fetchCourses();
    }
  }, [isAuthenticated, token]);

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-auth-token': token
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

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/grades', { headers: authHeaders });
      const gradeData = await res.json();
      // Safety check if data is array
      const safeData = Array.isArray(gradeData) ? gradeData : [];
      const uniCourses = safeData.map(g => ({
        id: g._id, name: g.courseName, type: 'uni'
      }));
      setCourses([{ id: 'general-task', name: 'General Task', type: 'general' }, ...uniCourses]);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([{ id: 'general-task', name: 'General Task', type: 'general' }]);
    }
  };

  // --- ACTIONS ---
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

  const addCourse = async () => { console.log("Managed by Sync."); };
  const removeCourse = async () => { console.log("Managed by Sync."); };

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

  const toggleTheme = () => setIsDarkMode(prev => !prev);

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

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-dark-bg' : 'bg-gray-50'}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} binCount={deletedTasks.length} />
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
        />
        <div className="flex-1 overflow-auto p-0 relative">
          
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

          {activeTab === 'Tasks' && <TaskTable tasks={getFilteredTasks()} updateTask={updateTask} courses={courses} deleteTask={deleteTask}/>}
          {activeTab === 'Calendar' && <Calendar tasks={tasks} courses={courses} onAddWithDate={openAddTaskWithDate} onUpdate={updateTask} onDelete={deleteTask} />}
          {activeTab === 'Grade Book' && <GradeBook />}
          {activeTab === 'History' && <ResultHistory />}
          {activeTab.startsWith('Cash-') && <CashManager activeTab={activeTab} />}
          {activeTab === 'Settings' && <Settings courses={courses} addCourse={addCourse} removeCourse={removeCourse} tasks={tasks} updateTask={updateTask} idleTimeout={idleTimeout} setIdleTimeout={setIdleTimeout}/>}
          {activeTab === 'Bin' && <Bin deletedTasks={deletedTasks} restoreTask={restoreTask} permanentlyDeleteTask={permanentlyDeleteTask} deleteAll={deleteAll} restoreAll={restoreAll}/>}

        </div>
      </div>

      <AddTaskModal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} onSave={handleAddTask} courses={courses} initialDate={prefilledDate} />
      <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={executeDelete} title="Move to Bin?" message="Are you sure you want to move this task to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
    </div>
  );
}

export default App;