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
  const [isEmptyBinModalOpen, setIsEmptyBinModalOpen] = useState(false); 
  const [isRestoreAllModalOpen, setIsRestoreAllModalOpen] = useState(false); // <--- New State

  // --- DATA ---
  const [courses, setCourses] = useState([
    { name: 'Discrete Structures', type: 'uni' },
    { name: 'Operating Sys', type: 'general' },
    { name: 'Math', type: 'general' }
  ]);
  
  const [tasks, setTasks] = useState([
    { id: 1, name: "Active task 1 test", status: "Scheduled", course: "CCN", date: "2026-02-14", priority: "High" },
    { id: 2, name: "Prepare for Quiz", status: "In Progress", course: "Operating Sys", date: "2026-02-07", priority: "Critical" },
    { id: 3, name: "Submit Assignment", status: "New task", course: "Math", date: "2026-02-20", priority: "Medium" },
  ]);

  const [deletedTasks, setDeletedTasks] = useState([]); 

  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: ''
  });

  // --- ACTIONS ---

  const handleAddTask = (newTaskData) => {
    const newTask = { id: Date.now(), ...newTaskData };
    setTasks([newTask, ...tasks]);
    if (activeTab !== 'Tasks') setActiveTab('Tasks');
  };

  const deleteTask = (taskId) => {
    setTaskToDelete(taskId); 
  };

  const executeDelete = () => {
    if (!taskToDelete) return;
    const taskObj = tasks.find(t => t.id === taskToDelete);
    if (taskObj) {
      setDeletedTasks([{ ...taskObj, deletedAt: new Date().toISOString() }, ...deletedTasks]);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskToDelete));
    }
    setTaskToDelete(null);
  };

  const restoreTask = (taskId) => {
    const taskToRestore = deletedTasks.find(t => t.id === taskId);
    if (taskToRestore) {
      const { deletedAt, ...rest } = taskToRestore; 
      setTasks([rest, ...tasks]);
      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const permanentlyDeleteTask = (taskId) => {
    if (window.confirm("This will permanently delete the task. Are you sure?")) {
      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // --- BULK ACTIONS ---

  // 1. Restore All
  const handleRestoreAll = () => {
    // Remove 'deletedAt' timestamp from all tasks and move them back
    const restored = deletedTasks.map(({ deletedAt, ...task }) => task);
    setTasks([...restored, ...tasks]);
    setDeletedTasks([]);
    setIsRestoreAllModalOpen(false);
  };

  // 2. Empty Bin
  const handleEmptyBin = () => {
    setDeletedTasks([]);
    setIsEmptyBinModalOpen(false);
  };

  // --- HELPERS ---
  
  useEffect(() => {
    const now = new Date();
    setDeletedTasks(prevBin => prevBin.filter(task => {
      const deleteDate = new Date(task.deletedAt);
      const diffTime = Math.abs(now - deleteDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays <= 30; 
    }));
  }, []); 

  const getFilteredTasks = () => {
    return tasks.filter(task => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = task.name.toLowerCase().includes(query);
        const matchesCourse = task.course.toLowerCase().includes(query);
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

  const updateTask = (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const addCourse = (name, type) => setCourses([...courses, { name, type }]);
  
  const removeCourse = (courseName) => {
    setCourses(courses.filter(c => {
        if (!c) return false;
        if (typeof c === 'string') return c !== courseName;
        return c.name !== courseName;
    }));
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
            <Settings courses={courses} addCourse={addCourse} removeCourse={removeCourse} />
          )}

          {activeTab === 'Bin' && (
            <Bin 
              deletedTasks={deletedTasks} 
              restoreTask={restoreTask} 
              permanentlyDeleteTask={permanentlyDeleteTask} 
              // PASSING THE MODAL TRIGGERS
              onEmptyBin={() => setIsEmptyBinModalOpen(true)} 
              onRestoreAll={() => setIsRestoreAllModalOpen(true)}
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

      {/* Modal 1: Soft Delete Single Task */}
      <ConfirmationModal 
        isOpen={!!taskToDelete} 
        onClose={() => setTaskToDelete(null)}
        onConfirm={executeDelete}
        title="Move to Bin?"
        message="Are you sure you want to move this task to the Recycle Bin? You can restore it later."
        confirmText="Move to Bin"
        confirmStyle="danger"
      />

      {/* Modal 2: Empty Bin (Permanent) */}
      <ConfirmationModal 
        isOpen={isEmptyBinModalOpen} 
        onClose={() => setIsEmptyBinModalOpen(false)}
        onConfirm={handleEmptyBin}
        title="Empty Recycle Bin?"
        message="This will permanently delete ALL tasks in the bin. This action cannot be undone."
        confirmText="Empty Bin"
        confirmStyle="danger"
      />

      {/* Modal 3: Restore All */}
      <ConfirmationModal 
        isOpen={isRestoreAllModalOpen} 
        onClose={() => setIsRestoreAllModalOpen(false)}
        onConfirm={handleRestoreAll}
        title="Restore All Items?"
        message="This will move all items from the bin back to your active tasks list."
        confirmText="Restore All"
        confirmStyle="primary" // Blue button for positive action
      />

    </div>
  );
}

export default App;