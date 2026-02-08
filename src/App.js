import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TaskTable from './TaskTable';
import Settings from './Settings';
import AddTaskModal from './AddTaskModal';
import ConfirmationModal from './ConfirmationModal';
import Bin from './Bin';
import { Heart, ArrowRight } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('Welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // --- MODAL STATES ---
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null); 
  // REMOVED: isEmptyBinModalOpen & isRestoreAllModalOpen (Handled by Bin.js now)

  // --- DATA ---
  const [courses, setCourses] = useState([]); 
  const [tasks, setTasks] = useState([]); 
  const [deletedTasks, setDeletedTasks] = useState([]); 

  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: ''
  });

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchTasks();
    fetchBin();
    fetchCourses();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      const formattedTasks = data.map(t => ({ ...t, id: t._id }));
      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchBin = async () => {
    try {
      const res = await fetch('/api/bin');
      const data = await res.json();
      const formattedBin = data.map(t => ({ ...t, id: t._id }));
      setDeletedTasks(formattedBin);
    } catch (error) {
      console.error("Error fetching bin:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data.map(c => ({ ...c, id: c._id })));
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // --- ACTIONS ---

  const handleAddTask = async (newTaskData) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData)
      });
      
      if (!res.ok) throw new Error("Server Error");

      const savedTask = await res.json();
      setTasks(prev => [{ ...savedTask, id: savedTask._id }, ...prev]);
      
      if (activeTab !== 'Tasks') setActiveTab('Tasks');
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to save task. Please check the console.");
    }
  };

  const deleteTask = (taskId) => {
    setTaskToDelete(taskId); 
  };

  const executeDelete = async () => {
    if (!taskToDelete) return;
    try {
      await fetch(`/api/tasks/${taskToDelete}/delete`, { method: 'PUT' });

      const taskObj = tasks.find(t => t.id === taskToDelete);
      if (taskObj) {
        setDeletedTasks([{ ...taskObj, deletedAt: new Date().toISOString() }, ...deletedTasks]);
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToDelete));
      }
      setTaskToDelete(null);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const restoreTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}/restore`, { method: 'PUT' });
      
      const taskToRestore = deletedTasks.find(t => t.id === taskId);
      if (taskToRestore) {
        const { deletedAt, ...rest } = taskToRestore; 
        setTasks([rest, ...tasks]);
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (error) {
      console.error("Error restoring task:", error);
    }
  };

  // FIXED: Removed window.confirm (Handled by Bin.js)
  const permanentlyDeleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting permanently:", error);
    }
  };

  // --- BULK ACTIONS ---

  // FIXED: Removed modal state logic
  const restoreAll = async () => {
    try {
      await fetch('/api/bin/restore-all', { method: 'PUT' });
      const restored = deletedTasks.map(({ deletedAt, ...task }) => task);
      setTasks([...restored, ...tasks]);
      setDeletedTasks([]);
    } catch (error) {
      console.error("Error restoring all:", error);
    }
  };

  // FIXED: Removed modal state logic
  const deleteAll = async () => {
    try {
      await fetch('/api/bin/empty', { method: 'DELETE' });
      setDeletedTasks([]);
    } catch (error) {
      console.error("Error emptying bin:", error);
    }
  };

  // --- COURSES ACTIONS ---
  
  const addCourse = async (name, type) => {
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type })
      });
      const newCourse = await res.json();
      setCourses([...courses, { ...newCourse, id: newCourse._id }]);
    } catch (error) {
      console.error("Error adding course:", error);
    }
  };
  
  const removeCourse = async (courseId) => {
    setCourses(courses.filter(c => c.id !== courseId));
    try {
      await fetch(`/api/courses/${courseId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course from database");
    }
  };

  // --- HELPERS ---

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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const updateTask = async (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-dark-bg' : 'bg-gray-50'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        binCount={deletedTasks.length} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
        
        <Header 
          isDarkMode={isDarkMode} 
          toggleTheme={toggleTheme}
          filters={filters}
          setFilters={setFilters}
          courses={courses}
          onAddClick={() => setIsAddTaskOpen(true)}
        />

        <div className="flex-1 overflow-auto p-0 relative">
          
          {activeTab === 'Welcome' && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold mb-6 dark:text-white text-gray-900 tracking-tight">
                  Welcome to Your Portal
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-12">
                  Select a module from the sidebar to manage your academic journey.
                </p>
                <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-8 rounded-2xl shadow-lg relative overflow-hidden transition-colors">
                  <Heart className="w-8 h-8 text-brand-pink mb-4 mx-auto animate-pulse" fill="#E11D48" />
                  <p className="text-xl md:text-2xl font-medium dark:text-white text-gray-800 leading-relaxed font-serif italic">
                    "Your mom and dad are still waiting to celebrate your success."
                  </p>
                  <div className="mt-6 flex justify-center">
                    <button onClick={() => setActiveTab('Tasks')} className="text-brand-blue hover:text-blue-600 flex items-center gap-2 transition-colors font-medium">
                      Start working now <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tasks' && (
            <TaskTable 
              tasks={getFilteredTasks()} 
              updateTask={updateTask} 
              courses={courses} 
              deleteTask={deleteTask}
            />
          )}

          {activeTab === 'Settings' && (
            <Settings
              courses={courses}
              addCourse={addCourse}
              removeCourse={removeCourse}
              tasks={tasks}
              updateTask={updateTask} 
            />
          )}

          {activeTab === 'Bin' && (
            <Bin 
              deletedTasks={deletedTasks} 
              restoreTask={restoreTask} 
              permanentlyDeleteTask={permanentlyDeleteTask} 
              deleteAll={deleteAll}     // FIXED: Passing function directly
              restoreAll={restoreAll}   // FIXED: Passing function directly
            />
          )}

        </div>
      </div>

      <AddTaskModal 
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSave={handleAddTask}
        courses={courses}
      />

      <ConfirmationModal 
        isOpen={!!taskToDelete} 
        onClose={() => setTaskToDelete(null)}
        onConfirm={executeDelete}
        title="Move to Bin?"
        message="Are you sure you want to move this task to the Recycle Bin? You can restore it later."
        confirmText="Move to Bin"
        confirmStyle="danger"
      />

      {/* REMOVED: Redundant ConfirmationModals for Bin actions */}

    </div>
  );
}

export default App;