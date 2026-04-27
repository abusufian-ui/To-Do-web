import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import CashManager from './CashManager';
import TaskSummaryModal from './TaskSummaryModal';
import MyProfile from './MyProfile';
import Timetable from './TimeTable'; 
import HabitTracker from './HabitTracker';
import Notes from './Notes';
import HyperFocus from './HyperFocus'; 
import Keynote from './Keynote';
import AddKeynoteModal from './AddKeynoteModal'; 
import CoursePortalView from './CoursePortalView';
import Assessments from './Assessments';
import Datesheet from './Datesheet'; 

import useLiveSync from './hooks/useLiveSync'; 
import { Heart, ArrowRight, X, Activity, Coffee, FastForward } from 'lucide-react'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HF_MODES = {
  focus: { id: 'focus', title: 'Deep Focus', text: 'Immerse yourself in the work.', minutes: 25, color: '#3B82F6', textClass: 'text-blue-500', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.3)]' },
  short_break: { id: 'short_break', title: 'Short Break', text: 'Step away. Breathe. Hydrate.', minutes: 5, color: '#10B981', textClass: 'text-emerald-500', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.3)]' },
  long_break: { id: 'long_break', title: 'Long Break', text: 'Excellent work. Take a deep rest.', minutes: 30, color: '#EC4899', textClass: 'text-pink-500', glow: 'shadow-[0_0_60px_rgba(236,72,153,0.3)]' }
};

function App() {
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
      document.body.style.backgroundColor = '#121212'; 
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.body.style.backgroundColor = '#f9fafb';
    }
  }, [isDarkMode]);

  const [idleTimeout, setIdleTimeout] = useState(() => {
    const saved = localStorage.getItem('idleTimeout');
    return saved ? parseInt(saved, 10) : 300000;
  });

  useEffect(() => {
    localStorage.setItem('idleTimeout', idleTimeout);
  }, [idleTimeout]);

  const [activeTab, setActiveTab] = useState('Welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  const [isAddKeynoteOpen, setIsAddKeynoteOpen] = useState(false);
  const [keynoteToDelete, setKeynoteToDelete] = useState(null); 
  const [isBatchDeleteKeynotes, setIsBatchDeleteKeynotes] = useState(false);
  const [keynotesToBatchDelete, setKeynotesToBatchDelete] = useState([]);

  const [assessments, setAssessments] = useState([]);
  const [addAssessmentTrigger, setAddAssessmentTrigger] = useState(0);
  const [viewAssessment, setViewAssessment] = useState(null);

  const [prefilledDate, setPrefilledDate] = useState('');
  const [viewTask, setViewTask] = useState(null);
  
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]); 
  const [keynotes, setKeynotes] = useState([]); 
  const [exams, setExams] = useState([]); 

  // 🚀 UPDATED: Shows full datesheet until the LAST exam is over
  const activeExams = useMemo(() => {
    if (!exams || exams.length === 0) return [];
    
    const now = new Date();
    // Sort exams by date chronologically
    const sortedExams = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get the very last exam in the schedule
    const lastExam = sortedExams[sortedExams.length - 1];
    const lastExamDate = new Date(lastExam.date);
    
    // Set expiration to 11:59:59 PM of the LAST exam day
    lastExamDate.setHours(23, 59, 59, 999); 
    
    // If we haven't passed the final exam yet, return the WHOLE datesheet
    if (now <= lastExamDate) {
      return sortedExams;
    }
    
    // Otherwise, exams are entirely over
    return [];
  }, [exams]);

  useEffect(() => {
    if (activeTab === 'Datesheet' && activeExams.length === 0) {
      setActiveTab('Tasks');
    }
  }, [activeExams.length, activeTab]);

  const [isAddingNewNote, setIsAddingNewNote] = useState(false);
  const [isAddingNewTransaction, setIsAddingNewTransaction] = useState(false);
  const [binItems, setBinItems] = useState([]);
  const [filters, setFilters] = useState({
    course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', searchQuery: '', mediaType: 'All', source: 'All'
  });

  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-auth-token': token
  }), [token]);

  const alarmSoundRef = useRef(typeof window !== 'undefined' ? new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') : null);

  const [hfState, setHfState] = useState(() => {
    try {
      const saved = localStorage.getItem('hfGlobalState');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return { modeId: 'focus', isAutomated: false, cyclesCompleted: 0, targetEndTime: null, timeLeft: HF_MODES.focus.minutes * 60, soundEnabled: true };
  });

  useEffect(() => { localStorage.setItem('hfGlobalState', JSON.stringify(hfState)); }, [hfState]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (hfState.isAutomated) {
      const m = Math.floor(hfState.timeLeft / 60).toString().padStart(2, '0');
      const s = (hfState.timeLeft % 60).toString().padStart(2, '0');
      document.title = `(${m}:${s}) ${HF_MODES[hfState.modeId]?.title || 'Focus'}`;
    } else { document.title = "Student Portal"; }
  }, [hfState.timeLeft, hfState.isAutomated, hfState.modeId]);

  const executePhaseTransition = useCallback(async () => {
    setHfState(prev => {
      if (prev.modeId === 'focus' && token) {
        try { fetch(`${API_BASE}/api/focus-sessions`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ durationMinutes: HF_MODES.focus.minutes, type: 'focus' }) }); } catch (e) {}
      }

      let nextModeId = 'focus';
      let newCycles = prev.cyclesCompleted;

      if (prev.modeId === 'focus') {
        newCycles += 1;
        nextModeId = (newCycles % 4 === 0) ? 'long_break' : 'short_break';
      }

      const nextMode = HF_MODES[nextModeId];

      if (prev.soundEnabled && alarmSoundRef.current) {
        alarmSoundRef.current.currentTime = 0;
        alarmSoundRef.current.play().catch(e => console.log("Audio failed", e));
      }
      
      let title = 'Hyper Focus';
      let body = 'Phase complete! Transitioning...';
      let showSkip = false;
      
      if (nextModeId === 'focus') {
        title = '🔥 Focus Time!'; body = 'Time to start, get ready!'; showSkip = false;
      } else if (nextModeId === 'short_break' || nextModeId === 'long_break') {
        title = '☕ Time to rest'; body = 'Great job on the focus session!'; showSkip = nextModeId === 'short_break';
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }

      setTimeout(() => { setToast({ id: Date.now(), title, message: body, showSkip, modeId: nextModeId }); }, 0);

      return { ...prev, modeId: nextModeId, cyclesCompleted: newCycles, timeLeft: nextMode.minutes * 60, targetEndTime: Date.now() + (nextMode.minutes * 60 * 1000) };
    });
  }, [authHeaders, token]);

  useEffect(() => {
    let interval = null;
    if (hfState.isAutomated && hfState.targetEndTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((hfState.targetEndTime - now) / 1000));
        if (remaining <= 0) executePhaseTransition();
        else setHfState(prev => ({ ...prev, timeLeft: remaining }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hfState.isAutomated, hfState.targetEndTime, executePhaseTransition]);

  const toggleAutomation = () => {
    setHfState(prev => {
      if (!prev.isAutomated) return { ...prev, isAutomated: true, targetEndTime: Date.now() + prev.timeLeft * 1000 };
      else {
        setToast(null); 
        return { ...prev, isAutomated: false, targetEndTime: null, modeId: 'focus', timeLeft: HF_MODES.focus.minutes * 60, cyclesCompleted: 0 };
      }
    });
  };

  const skipPhase = () => {
    setHfState(prev => {
      if (prev.modeId !== 'short_break') return prev; 
      if (prev.soundEnabled && alarmSoundRef.current) { alarmSoundRef.current.currentTime = 0; alarmSoundRef.current.play().catch(e => console.log(e)); }
      const nextMode = HF_MODES.focus;
      return { ...prev, modeId: 'focus', timeLeft: nextMode.minutes * 60, targetEndTime: Date.now() + (nextMode.minutes * 60 * 1000) };
    });
    setToast(null); 
  };

  const setSoundEnabled = (val) => setHfState(prev => ({ ...prev, soundEnabled: val }));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token'); localStorage.removeItem('user'); sessionStorage.clear();
    setToken(null); setUser(null); setActiveTab('Welcome');
  }, []);

  const handleLogin = (authToken, userData) => {
    localStorage.setItem('token', authToken); localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken); setUser(userData);
  };

  const checkForInactivity = useCallback(() => {
    if (!isAuthenticated || idleTimeout === 0) return;
    const timer = setTimeout(() => { handleLogout(); }, idleTimeout);
    return timer;
  }, [isAuthenticated, idleTimeout, handleLogout]);

  useEffect(() => {
    let timeoutId = checkForInactivity();
    const handleUserActivity = () => { clearTimeout(timeoutId); timeoutId = checkForInactivity(); };
    window.addEventListener('mousemove', handleUserActivity); window.addEventListener('keydown', handleUserActivity); window.addEventListener('click', handleUserActivity);
    return () => { clearTimeout(timeoutId); window.removeEventListener('mousemove', handleUserActivity); window.removeEventListener('keydown', handleUserActivity); window.removeEventListener('click', handleUserActivity); };
  }, [checkForInactivity]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      if (res.ok) { const freshUser = await res.json(); setUser(freshUser); localStorage.setItem('user', JSON.stringify(freshUser)); }
    } catch (error) { console.error("Error fetching user:", error); }
  }, [authHeaders, handleLogout]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data.map(t => ({ ...t, id: t._id })));
      } else { setTasks([]); }
    } catch (error) { console.error("Error fetching tasks:", error); }
  }, [authHeaders, handleLogout]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notes`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) { setNotes(data); } else { setNotes([]); }
    } catch (error) { console.error("Error fetching notes:", error); }
  }, [authHeaders, handleLogout]);

  const fetchKeynotes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/keynotes`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) { setKeynotes(data); } else { setKeynotes([]); }
    } catch (error) { console.error("Error fetching keynotes:", error); }
  }, [authHeaders, handleLogout]);

  const fetchExams = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/datesheet`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) { setExams(data); } else { setExams([]); }
    } catch (error) { console.error("Error fetching exams:", error); }
  }, [authHeaders, handleLogout]);

  const fetchAssessments = useCallback(async () => {
    try {
      const manualRes = await fetch(`${API_BASE}/api/assessments`, { headers: authHeaders });
      let manualData = [];
      if (manualRes.ok) {
         const json = await manualRes.json();
         manualData = (Array.isArray(json) ? json : []).map(item => ({ ...item, source: 'manual', id: item._id }));
      }

      const portalRes = await fetch(`${API_BASE}/api/submissions`, { headers: authHeaders });
      let portalData = [];
      if (portalRes.ok) {
         const json = await portalRes.json();
         portalData = (Array.isArray(json) ? json : []).flatMap(sub =>
          (sub.tasks || []).map(task => ({
            _id: task._id || Math.random().toString(),
            id: task._id || Math.random().toString(),
            title: task.title,
            courseName: sub.courseName,
            type: 'Portal Task',
            dueDate: task.dueDate,
            status: task.status.toLowerCase().includes('submitted') ? 'Submitted' : 'Pending',
            source: 'portal',
            url: task.submissionUrl
          }))
        );
      }
      setAssessments([...manualData, ...portalData].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    } catch (error) { console.error("Error fetching assessments:", error); }
  }, [authHeaders]);

  const fetchBin = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bin`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      const formattedBin = [
        ...(data.tasks || []).map(t => ({ ...t, id: t._id, binType: 'Task', name: t.name, subtitle: t.course })),
        ...(data.transactions || []).map(t => ({ ...t, id: t._id, binType: 'Transaction', name: t.description || 'Transaction', subtitle: `Rs ${t.amount}` })),
        ...(data.habits || []).map(h => ({ ...h, id: h._id, binType: 'Habit', name: h.name, subtitle: h.type === 'good' ? 'Good Protocol' : 'Bad Protocol' })),
        ...(data.notes || []).map(n => ({ ...n, id: n._id, binType: 'Note', name: n.title, subtitle: n.courseId })),
        ...(data.keynotes || []).map(k => ({ ...k, id: k._id, binType: 'Keynote', name: k.title, subtitle: k.courseName })) 
      ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      setBinItems(formattedBin);
    } catch (error) { console.error("Error fetching bin:", error); }
  }, [authHeaders, handleLogout]);

 const fetchCourses = useCallback(async () => {
    let fetchedCourses = [];
    try {
      const res = await fetch(`${API_BASE}/api/courses`, { headers: authHeaders });
      if (res.ok) {
        const customData = await res.json();
        fetchedCourses = (Array.isArray(customData) ? customData : []).map(c => ({ id: c._id, name: c.name, type: c.type === 'university' ? 'uni' : 'general' }));
      }
    } catch (error) { console.error("Error fetching courses:", error); }
    setCourses(fetchedCourses);
  }, [authHeaders]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUser();
      fetchTasks();
      fetchNotes();
      fetchKeynotes();
      fetchAssessments();
      fetchBin();
      fetchCourses();
      fetchExams();
    }
  }, [isAuthenticated, token, fetchUser, fetchTasks, fetchNotes, fetchKeynotes, fetchAssessments, fetchBin, fetchCourses, fetchExams]);

  const handleLiveUpdate = useCallback(() => {
    if (token && isAuthenticated) {
      fetchTasks();
      fetchNotes();
      fetchKeynotes();
      fetchAssessments();
      fetchBin();
      fetchCourses();
      fetchExams();
    }
  }, [token, isAuthenticated, fetchTasks, fetchNotes, fetchKeynotes, fetchAssessments, fetchBin, fetchCourses, fetchExams]);

  useLiveSync(handleLiveUpdate);

  const handleAddTask = async (newTaskData) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, { method: 'POST', headers: authHeaders, body: JSON.stringify(newTaskData) });
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
      fetchTasks(); fetchBin(); setTaskToDelete(null);
    } catch (error) { console.error("Error deleting task:", error); }
  };

  const handleToggleKeynoteRead = async (id, currentStatus) => {
    try {
      const endpoint = currentStatus ? 'unread' : 'read';
      await fetch(`${API_BASE}/api/keynotes/${id}/${endpoint}`, { method: 'PUT', headers: authHeaders });
      setKeynotes(prev => prev.map(kn => kn._id === id ? { ...kn, isRead: !currentStatus } : kn));
    } catch (error) { console.error("Failed to toggle read status", error); }
  };

  const deleteKeynote = (id) => setKeynoteToDelete(id);
  const executeDeleteKeynote = async () => {
    if (!keynoteToDelete) return;
    try {
      await fetch(`${API_BASE}/api/keynotes/${keynoteToDelete}/delete`, { method: 'PUT', headers: authHeaders });
      fetchKeynotes(); fetchBin(); setKeynoteToDelete(null);
    } catch (err) { console.error("Failed to move to bin", err); }
  };

  const handleBatchDeleteKeynotes = (ids) => { setKeynotesToBatchDelete(ids); setIsBatchDeleteKeynotes(true); };
  const executeBatchDeleteKeynotes = async () => {
    if (!keynotesToBatchDelete || keynotesToBatchDelete.length === 0) return;
    try {
      for (const id of keynotesToBatchDelete) await fetch(`${API_BASE}/api/keynotes/${id}/delete`, { method: 'PUT', headers: authHeaders });
      fetchKeynotes(); fetchBin(); setIsBatchDeleteKeynotes(false); setKeynotesToBatchDelete([]);
    } catch (err) { console.error("Failed to batch move to bin", err); }
  };

  const handleAddKeynoteSubmit = async (formData) => {
    try {
      const uploadRes = await fetch(`${API_BASE}/api/upload`, { method: 'POST', headers: { 'x-auth-token': token }, body: formData });
      if (!uploadRes.ok) throw new Error("Media upload failed");
      const uploadData = await uploadRes.json();
      
      const payload = {
        title: formData.get('title'),
        courseName: formData.get('courseName') || 'General',
        content: formData.get('content') || '',
        type: formData.get('type') || 'text',
        mediaUrls: uploadData.urls || []
      };

      await fetch(`${API_BASE}/api/keynotes`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
      fetchKeynotes();
    } catch (error) { console.error("Failed to add keynote", error); }
  };

  const restoreItem = async (id, type) => {
    const endpoints = { 'Task': 'tasks', 'Transaction': 'transactions', 'Habit': 'habits', 'Note': 'notes', 'Keynote': 'keynotes' };
    try {
      await fetch(`${API_BASE}/api/${endpoints[type]}/${id}/restore`, { method: 'PUT', headers: authHeaders });
      fetchBin();
      if (type === 'Task') fetchTasks();
      if (type === 'Note') fetchNotes();
      if (type === 'Keynote') fetchKeynotes();
    } catch (error) { console.error("Error restoring:", error); }
  };

  const permanentlyDeleteItem = async (id, type) => {
    const endpoints = { 'Task': 'tasks', 'Transaction': 'transactions', 'Habit': 'habits', 'Note': 'notes', 'Keynote': 'keynotes' };
    try {
      await fetch(`${API_BASE}/api/${endpoints[type]}/${id}`, { method: 'DELETE', headers: authHeaders });
      setBinItems(prev => prev.filter(item => item.id !== id));
    } catch (error) { console.error("Error deleting permanently:", error); }
  };

  const restoreAllBin = async () => {
    try { await fetch(`${API_BASE}/api/bin/restore-all`, { method: 'PUT', headers: authHeaders }); fetchTasks(); fetchNotes(); fetchKeynotes(); fetchBin(); } catch (error) { }
  };

  const deleteAllBin = async () => {
    try { await fetch(`${API_BASE}/api/bin/empty`, { method: 'DELETE', headers: authHeaders }); setBinItems([]); } catch (error) { }
  };

  const updateTask = async (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(task => task.id === id ? { ...task, [field]: value } : task));
    try { await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ [field]: value }) }); } catch (error) { console.error("Error updating task:", error); }
  };

  const openAddTaskWithDate = (dateString) => { setPrefilledDate(dateString); setIsAddTaskOpen(true); };
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

  const getFilteredNotes = () => {
    return notes.filter(note => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = note.title?.toLowerCase().includes(query) || false;
        const plainContent = new DOMParser().parseFromString(note.content || '', 'text/html').body.textContent || "";
        const matchesContent = plainContent.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent) return false;
      }
      if (filters.course !== 'All' && note.courseId !== filters.course) return false;
      return true;
    });
  };

  const isAudioUrl = (url) => url?.match(/\.(m4a|mp3|wav|ogg|aac|mp4|3gp)$/i) || url?.includes('video/upload');

  const getFilteredKeynotes = () => {
    return keynotes.filter(k => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = k.title?.toLowerCase().includes(query) || false;
        const matchesContent = k.content?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesContent) return false;
      }
      if (filters.course !== 'All' && k.courseName !== filters.course) return false;
      if (filters.mediaType === 'Image' && !k.mediaUrls?.some(url => !isAudioUrl(url))) return false;
      if (filters.mediaType === 'Audio' && !k.mediaUrls?.some(url => isAudioUrl(url))) return false;
      if (filters.startDate && new Date(k.createdAt) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(k.createdAt) > new Date(filters.endDate)) return false;
      return true;
    });
  };

  const getFilteredAssessments = () => {
    return assessments.filter(a => {
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = a.title?.toLowerCase().includes(query) || false;
        const matchesCourse = a.courseName?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesCourse) return false;
      }
      if (filters.course !== 'All' && a.courseName !== filters.course) return false;
      if (filters.status !== 'All' && a.status !== filters.status) return false;
      if (filters.source && filters.source !== 'All' && a.source !== filters.source.toLowerCase()) return false;
      if (filters.startDate && new Date(a.dueDate) < new Date(filters.startDate)) return false;
      if (filters.endDate && new Date(a.dueDate) > new Date(filters.endDate)) return false;
      return true;
    });
  };

  const handleManualSync = async () => {
    try { await fetch(`${API_BASE}/api/sync-grades`, { method: 'POST', headers: authHeaders }); fetchCourses(); } catch (e) { throw e; }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_BASE}/api/user/unlink-portal`, { method: 'POST', headers: authHeaders });
      const updatedUser = { ...user, isPortalConnected: false, portalId: null };
      setUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser));
      setCourses(prev => prev.filter(c => c.type !== 'uni'));
    } catch (e) { console.error(e); }
  };

  const handleLinkPortal = async (portalId, portalPassword) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/link-portal`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ portalId, portalPassword }) });
      if (res.ok) {
        const updatedUser = { ...user, isPortalConnected: true, portalId };
        setUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser)); fetchCourses();
      } else { throw new Error("Failed to link"); }
    } catch (e) { throw e; }
  };

  const handleUpdateProfile = async (name) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ name }) });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser));
      } else { throw new Error("Update failed"); }
    } catch (e) { throw e; }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/password`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ currentPassword, newPassword }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
    } catch (e) { throw e; }
  };

  const addCourse = async (courseName) => {
    if (!courseName || !courseName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/courses`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: courseName.trim() }) });
      if (res.ok) fetchCourses();
    } catch (e) { console.error("Add course failed", e); }
  };

  const removeCourse = async (courseId) => {
    try { const res = await fetch(`${API_BASE}/api/courses/${courseId}`, { method: 'DELETE', headers: authHeaders }); if (res.ok) fetchCourses(); } catch (e) { console.error("Delete course failed", e); }
  };

  const handleNavigate = (tab) => {
    if (tab === 'Server') { if (user?.isAdmin) setIsServerModalOpen(true); return; }
    setActiveTab(tab);
    if (tab === 'Bin') fetchBin(); 
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const triggerAddClick = () => {
    if (activeTab === 'Tasks' || activeTab === 'Calendar') {
      setPrefilledDate(''); setIsAddTaskOpen(true);
    } else if (activeTab === 'Notes') {
      setIsAddingNewNote(true);
    } else if (activeTab === 'Keynotes') {
      setIsAddKeynoteOpen(true);
    } else if (activeTab === 'Assessments') {
      setAddAssessmentTrigger(prev => prev + 1);
    } else if (activeTab && activeTab.startsWith('Cash')) {
      setIsAddingNewTransaction(true); 
    } else {
      setPrefilledDate(''); setIsAddTaskOpen(true); 
    }
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 relative ${isDarkMode ? 'dark bg-dark-bg' : 'bg-gray-50'}`}>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[50] md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <Sidebar activeTab={activeTab} setActiveTab={handleNavigate} isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} binCount={binItems.length} user={user} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors duration-300 w-full relative">
        <Header
          activeTab={activeTab}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          filters={filters}
          setFilters={setFilters}
          courses={courses}
          onAddClick={triggerAddClick} 
          user={user}
          onLogout={handleLogout}
          tasks={tasks}
          onOpenTask={(task) => setViewTask(task)}
          onNavigate={handleNavigate}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          notes={notes}
          onOpenNote={(note) => console.log("Open Note from search:", note)} 
          keynotes={keynotes} 
          onToggleKeynoteRead={handleToggleKeynoteRead}
          hfState={hfState} 
          hfModes={HF_MODES}
          assessments={assessments}
          onOpenAssessment={(a) => setViewAssessment(a)}
          exams={activeExams} 
        />
        <div className="flex-1 overflow-auto p-0 relative custom-scrollbar-hide flex items-center justify-center">

          {activeTab === 'Welcome' && (
            <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center animate-fadeIn w-full">
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
          
          {activeTab === 'HyperFocus' && <div className="w-full h-full"><HyperFocus hfState={hfState} toggleAutomation={toggleAutomation} setSoundEnabled={setSoundEnabled} hfModes={HF_MODES} skipPhase={skipPhase} /></div>}
          {activeTab === 'Notes' && <div className="w-full h-full"><Notes courses={courses} notes={getFilteredNotes()} setNotes={setNotes} isAddingNew={isAddingNewNote} setIsAddingNew={setIsAddingNewNote} fetchNotes={fetchNotes} fetchBin={fetchBin} /></div>}
          {activeTab === 'Tasks' && <div className="w-full h-full"><TaskTable tasks={getFilteredTasks()} updateTask={updateTask} courses={courses} deleteTask={deleteTask} /></div>}
          {activeTab === 'Calendar' && <div className="w-full h-full"><Calendar tasks={tasks} courses={courses} onAddWithDate={openAddTaskWithDate} onUpdate={updateTask} onDelete={deleteTask} /></div>}
          {activeTab === 'Timetable' && <div className="w-full h-full"><Timetable /></div>} 
          {activeTab === 'Keynotes' && <div className="w-full h-full"><Keynote keynotes={getFilteredKeynotes()} courses={courses} onToggleRead={handleToggleKeynoteRead} onDelete={deleteKeynote} onBatchDelete={handleBatchDeleteKeynotes} /></div>} 
          {activeTab.startsWith('Habits') && <div className="w-full h-full"><HabitTracker activeTab={activeTab} /></div>}
          {activeTab === 'Grade Book' && <div className="w-full h-full"><GradeBook /></div>}
          {activeTab === 'History' && <div className="w-full h-full"><ResultHistory /></div>}
          {activeTab === 'Assessments' && (
            <div className="w-full h-full overflow-y-auto">
              <Assessments 
                 token={token} 
                 assessments={getFilteredAssessments()} 
                 courses={courses} 
                 fetchAssessments={fetchAssessments} 
                 externalAddTrigger={addAssessmentTrigger} 
                 viewAssessment={viewAssessment} 
                 setViewAssessment={setViewAssessment} 
              />
            </div>
          )}
          
          {activeTab === 'Datesheet' && activeExams.length > 0 && (
            <div className="w-full h-full">
              <Datesheet exams={activeExams} />
            </div>
          )}

          {['Announcements', 'Attendance', 'Submissions'].includes(activeTab) && <div className="w-full h-full"><CoursePortalView activeTab={activeTab} courses={courses} /></div>}
          {activeTab.startsWith('Cash-') && <div className="w-full h-full"><CashManager activeTab={activeTab} isAddingNew={isAddingNewTransaction} setIsAddingNew={setIsAddingNewTransaction} /></div>}
          {activeTab === 'Bin' && <div className="w-full h-full"><Bin binItems={binItems} restoreItem={restoreItem} permanentlyDeleteItem={permanentlyDeleteItem} deleteAll={deleteAllBin} restoreAll={restoreAllBin} /></div>}
          {activeTab === 'Admin' && <div className="w-full h-full"><AdminDashboard /></div>}
          {activeTab === 'Profile' && <div className="w-full h-full"><MyProfile user={user} /></div>}

          {activeTab === 'Settings' && <div className="w-full h-full"><Settings user={user} idleTimeout={idleTimeout} setIdleTimeout={setIdleTimeout} onManualSync={handleManualSync} onDisconnect={handleDisconnect} onLinkPortal={handleLinkPortal} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} courses={courses} addCourse={addCourse} removeCourse={removeCourse} /></div>}
        </div>
      </div>

      <style>{`
        .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideInRight { 0% { transform: translateX(120%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
      `}</style>

      {/* --- MODALS --- */}
      <AddTaskModal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} onSave={handleAddTask} courses={courses} initialDate={prefilledDate} tasks={tasks} />
      <TaskSummaryModal isOpen={!!viewTask} onClose={() => setViewTask(null)} task={viewTask} courses={courses} onUpdate={updateTask} />
      <AddKeynoteModal isOpen={isAddKeynoteOpen} onClose={() => setIsAddKeynoteOpen(false)} onSave={handleAddKeynoteSubmit} courses={courses} />

      <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={executeDelete} title="Move to Bin?" message="Are you sure you want to move this task to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
      <ConfirmationModal isOpen={!!keynoteToDelete} onClose={() => setKeynoteToDelete(null)} onConfirm={executeDeleteKeynote} title="Move Snap to Bin?" message="Are you sure you want to move this Keynote to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
      <ConfirmationModal isOpen={isBatchDeleteKeynotes} onClose={() => { setIsBatchDeleteKeynotes(false); setKeynotesToBatchDelete([]); }} onConfirm={executeBatchDeleteKeynotes} title={`Move ${keynotesToBatchDelete.length} Snaps to Bin?`} message="Are you sure you want to move the selected Keynotes to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />

      {/* --- SERVER SELECTION MODAL --- */}
      {isServerModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 w-full max-w-sm shadow-2xl relative border border-gray-200 dark:border-[#333]">
            <button onClick={() => setIsServerModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cloud Workspace</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select the environment you want to connect to.</p>

            <div className="space-y-3">
              <button onClick={() => { window.open('http://161.118.247.217:8080', '_blank'); setIsServerModalOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#333] hover:border-brand-blue dark:hover:border-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <div className="text-left"><div className="font-bold text-gray-900 dark:text-white group-hover:text-brand-blue transition-colors">Admin Workspace</div><div className="text-xs text-gray-500">Port 8080</div></div>
                <ArrowRight size={18} className="text-gray-400 group-hover:text-brand-blue transition-colors" />
              </button>

              <button onClick={() => { window.open('http://161.118.247.217:8081', '_blank'); setIsServerModalOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#333] hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group">
                <div className="text-left"><div className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors">Hashu's Workspace</div><div className="text-xs text-gray-500">Port 8081</div></div>
                <ArrowRight size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- IN-APP SNACK NOTIFICATION --- */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-2xl rounded-2xl p-4 w-80 animate-slideInRight">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
               <div className="mt-0.5">{toast.modeId === 'focus' ? <Activity className="text-blue-500" size={20} /> : <Coffee className="text-emerald-500" size={20} />}</div>
               <div><h4 className="font-bold text-gray-900 dark:text-white text-sm">{toast.title}</h4><p className="text-xs text-gray-500 mt-1">{toast.message}</p></div>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><X size={16} /></button>
          </div>
          {toast.showSkip && (
             <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#333] flex justify-end">
                <button onClick={skipPhase} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors bg-gray-50 dark:bg-[#252525] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#333]">
                   <FastForward size={12} className="fill-current" /> SKIP BREAK
                </button>
             </div>
          )}
        </div>
      )}

    </div>
  );
}

export default App;