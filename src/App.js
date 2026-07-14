import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import RightSidebar from './RightSidebar';
import GroupInfoModal from './GroupInfoModal';
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
import About from './About';
import Timetable from './TimeTable';
import HabitTracker from './HabitTracker';
import Notes from './Notes';
import HyperFocus from './HyperFocus';
import Keynote from './Keynote';
import AddKeynoteModal from './AddKeynoteModal';
import CoursePortalView from './CoursePortalView';
import SemesterResultPage from './SemesterResultPage';

import Datesheet from './Datesheet';
import AnimatedLogo from './Animation'; 
import { CustomToast, ToastConfig } from './CustomToast';
import SyncDiagnostics from './SyncDiagnostics';

import useLiveSync from './hooks/useLiveSync';
import { Heart, ArrowRight, X, Activity, Coffee, FastForward, Shield, Lock, Users } from 'lucide-react';

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';


const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    const clone = response.clone();
    if (response.status === 401 || response.status === 403) {
      try {
        const data = await clone.json();
        if (data.logout) {
          console.warn("🛡️ Security termination requested by server.");
          window.dispatchEvent(new CustomEvent('security_logout', { detail: data.message }));
        }
      } catch (jsonErr) {}
    }
    return response;
  } catch (error) {
    throw error;
  }
};

const HF_MODES = {
  focus: { id: 'focus', title: 'Deep Focus', text: 'Immerse yourself in the work.', minutes: 25, color: '#3B82F6', textClass: 'text-blue-500', glow: 'shadow-[0_0_60px_rgba(59,130,246,0.3)]' },
  short_break: { id: 'short_break', title: 'Short Break', text: 'Step away. Breathe. Hydrate.', minutes: 5, color: '#10B981', textClass: 'text-emerald-500', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.3)]' },
  long_break: { id: 'long_break', title: 'Long Break', text: 'Excellent work. Take a deep rest.', minutes: 30, color: '#EC4899', textClass: 'text-pink-500', glow: 'shadow-[0_0_60px_rgba(236,72,153,0.3)]' }
};

const TAB_PATH_MAP = {
  'Welcome': '/dashboard',
  'HyperFocus': '/hyperfocus',
  'Tasks': '/tasks',
  'Calendar': '/calendar',
  'Notes': '/notes',
  'Timetable': '/timetable',
  'Announcements': '/announcements',
  'Attendance': '/attendance',
  'Submissions': '/submissions',
  'Course Material': '/course-material',
  'Course Vault': '/course-vault',
  'Keynotes': '/keynotes',
  'Grade Book': '/gradebook',
  'History': '/history',
  'Sync Diagnostics': '/sync-diagnostics',
  'Datesheet': '/datesheet',
  'Result': '/result',
  'Cash-Overview': '/cash/overview',
  'Cash-Transactions': '/cash/transactions',
  'Cash-Analytics': '/cash/analytics',
  'Cash-Budget': '/cash/budget',
  'Cash-Debts': '/cash/debts',
  'Habits-Overview': '/habits/overview',
  'Habits-Namaz': '/habits/namaz',
  'Habits-Tracker': '/habits/tracker',
  'Habits-Analytics': '/habits/analytics',
  'Bin': '/bin',
  'Admin': '/admin',
  'Profile': '/profile',
  'Settings': '/settings'
};

const PATH_TAB_MAP = Object.fromEntries(
  Object.entries(TAB_PATH_MAP).map(([tab, path]) => [path, tab])
);




function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingUpdatesRef = useRef({});

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  });

  
  const isAuthenticated = !!token || !!localStorage.getItem('token');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#121212';
    } else {
      root.classList.remove('dark');
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

  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') return 'Welcome';
    return PATH_TAB_MAP[path] || 'Welcome';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [isAddKeynoteOpen, setIsAddKeynoteOpen] = useState(false);
  const [keynoteToDelete, setKeynoteToDelete] = useState(null);

  const [semesterStatus, setSemesterStatus] = useState(null);
  const hasRecheckedRef = useRef(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isBatchDeleteKeynotes, setIsBatchDeleteKeynotes] = useState(false);
  const [keynotesToBatchDelete, setKeynotesToBatchDelete] = useState([]);

  const [selectedSemester, setSelectedSemester] = useState(() => {
    return localStorage.getItem('selectedSemester') || '';
  });

  const handleSemesterChange = useCallback((sem) => {
    setSelectedSemester(sem);
    if (sem) {
      localStorage.setItem('selectedSemester', sem);
    } else {
      localStorage.removeItem('selectedSemester');
    }
  }, []);



  const [prefilledDate, setPrefilledDate] = useState('');
  const [viewTask, setViewTask] = useState(null);

  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [keynotes, setKeynotes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [exams, setExams] = useState([]);

  const visibleCourses = useMemo(() => {
    const activeSem = (selectedSemester || user?.currentSemester || '').trim().toLowerCase();
    return courses.filter(c => {
      if (c.type === 'uni') {
        const courseSem = (c.semester || '').trim().toLowerCase();
        if (activeSem && courseSem && courseSem !== activeSem) return false;
        const explicitPref = user?.coursePreferences?.[c.name];
        if (explicitPref === false) return false;
        if (explicitPref === undefined && c.creditHours === 0) return false;
      }
      return true;
    });
  }, [courses, user?.coursePreferences, selectedSemester, user?.currentSemester]);

  const activeExams = useMemo(() => {
    if (!exams || exams.length === 0) return [];

    const visibleCourseNames = new Set((visibleCourses || []).map(c => c.name));
    const semesterExams = exams.filter(e => {
      if (e.course) {
        return visibleCourseNames.has(e.course);
      }
      return true;
    });

    const now = new Date();
    const sortedExams = [...semesterExams].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortedExams.length === 0) return [];

    const lastExam = sortedExams[sortedExams.length - 1];
    const lastExamDate = new Date(lastExam.date);

    lastExamDate.setHours(23, 59, 59, 999);

    if (now <= lastExamDate) {
      return sortedExams;
    }

    return [];
  }, [exams, visibleCourses]);

  useEffect(() => {
    if (activeTab === 'Datesheet' && activeExams.length === 0) {
      setActiveTab('Tasks');
    }
  }, [activeExams.length, activeTab]);

  const [isAddingNewNote, setIsAddingNewNote] = useState(false);
  const [isAddingNewTransaction, setIsAddingNewTransaction] = useState(false);
  const [binItems, setBinItems] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
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
    } catch (e) { }
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
        try { fetch(`${API_BASE}/api/focus-sessions`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ durationMinutes: HF_MODES.focus.minutes, type: 'focus' }) }); } catch (e) { }
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
        return { ...prev, isAutomated: false, targetEndTime: null };
      }
    });
  };

  const resetAutomation = () => {
    setToast(null);
    setHfState(prev => ({
      ...prev,
      isAutomated: false,
      targetEndTime: null,
      modeId: 'focus',
      timeLeft: HF_MODES.focus.minutes * 60,
      cyclesCompleted: 0
    }));
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
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_BASE}/api/security/logout`, {
        method: 'POST',
        headers: { 'x-auth-token': token }
      }).catch(err => console.error("Error during server logout:", err));
    }
    localStorage.clear();
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setTasks([]);
    setNotes([]);
    setKeynotes([]);
    setNotifications([]);
    setExams([]);
    setCourses([]);
    setBinItems([]);
    setActiveGroup(null);
    setPendingInvitations([]);
    setActiveTab('Welcome');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const onSecurityLogout = (e) => {
      ToastConfig.show({
        title: "Access Terminated",
        message: e.detail || "Your account has been blocked or deleted by an administrator.",
        type: "error"
      });
      handleLogout();
    };
    window.addEventListener('security_logout', onSecurityLogout);
    return () => window.removeEventListener('security_logout', onSecurityLogout);
  }, [handleLogout]);

  // Immediately sync token when Login.js dispatches portalTokenUpdate after new-user onboarding
  useEffect(() => {
    const onPortalTokenUpdate = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
        if (e.detail.user) {
          setUser(e.detail.user);
        } else {
          try {
            const u = localStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
          } catch {}
        }
      }
    };
    window.addEventListener('portalTokenUpdate', onPortalTokenUpdate);
    return () => window.removeEventListener('portalTokenUpdate', onPortalTokenUpdate);
  }, []);

  
  const handleLogin = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    navigate('/dashboard');
  };

  
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && storedToken !== token) {
      setToken(storedToken);
      try {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } catch (e) { console.error("Sync error", e); }
    }
  }, [location.pathname, token]);

  
  useEffect(() => {
    const path = location.pathname;
    if (isAuthenticated) {
      if (path === '/' || path === '') {
        navigate('/dashboard', { replace: true });
        setActiveTab('Welcome');
      } else {
        const tab = PATH_TAB_MAP[path];
        if (tab && tab !== activeTab) {
          setActiveTab(tab);
          if (tab === 'Bin') fetchBin();
        }
      }
    }
    
  }, [location.pathname, isAuthenticated, navigate]);

  const checkForInactivity = useCallback(() => {
    if (!isAuthenticated) return;

    
    const isAutoLockEnabled = user?.securitySettings?.autoLockEnabled ?? false;
    const currentTimer = user?.securitySettings?.autoLockTimer ?? idleTimeout;

    if (!isAutoLockEnabled || currentTimer === 0) return;

    const timer = setTimeout(() => {
      handleLogout();
    }, currentTimer);
    return timer;
  }, [isAuthenticated, user?.securitySettings, idleTimeout, handleLogout]);

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
        let mapped = data.map(t => ({ ...t, id: t._id }));
        if (pendingUpdatesRef.current) {
          mapped = mapped.map(task => {
            const taskId = task._id || task.id;
            const pending = pendingUpdatesRef.current[taskId];
            if (pending && (Date.now() - pending.timestamp < 4000)) {
              const { timestamp, ...fields } = pending;
              return { ...task, ...fields };
            }
            return task;
          });
        }
        setTasks(mapped);
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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) { setNotifications(data); } else { setNotifications([]); }
    } catch (error) { console.error("Error fetching notifications:", error); }
  }, [authHeaders, handleLogout]);

  const fetchExams = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/datesheet`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      if (Array.isArray(data)) { setExams(data); } else { setExams([]); }
    } catch (error) { console.error("Error fetching exams:", error); }
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
        ...(data.notes || []).map(n => ({ ...n, id: n._id, binType: 'Note', name: n.title, subtitle: n.courseId })),
        ...(data.keynotes || []).map(k => ({ ...k, id: k._id, binType: 'Keynote', name: k.title, subtitle: k.courseName }))
      ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
      setBinItems(formattedBin);
    } catch (error) { console.error("Error fetching bin:", error); }
  }, [authHeaders, handleLogout]);

  const fetchActiveGroup = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/my`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      if (res.ok) {
        const data = await res.json();
        setActiveGroup(data);
      } else {
        setActiveGroup(null);
      }
    } catch (error) { console.error("Error fetching group:", error); }
  }, [authHeaders, handleLogout]);

  const fetchPendingInvitations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/invitations`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      if (res.ok) {
        const data = await res.json();
        setPendingInvitations(data);
      } else {
        setPendingInvitations([]);
      }
    } catch (error) { console.error("Error fetching invitations:", error); }
  }, [authHeaders, handleLogout]);

  const fetchCourses = useCallback(async () => {
    let fetchedCourses = [];
    try {
      const res = await fetch(`${API_BASE}/api/courses`, { headers: authHeaders });
      if (res.ok) {
        const customData = await res.json();
        fetchedCourses = (Array.isArray(customData) ? customData : []).map(c => ({ 
          id: c._id, 
          name: c.name, 
          type: c.type === 'university' ? 'uni' : 'general',
          code: c.code,
          section: c.section,
          creditHours: c.creditHours,
          semester: c.semester
        }));
      }
    } catch (error) { console.error("Error fetching courses:", error); }
    setCourses(fetchedCourses);
  }, [authHeaders]);

  const fetchSemesterStatus = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await fetch(`${API_BASE}/api/semester-status`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSemesterStatus(data);

        // Self-heal check: if results are not announced, trigger a recheck on the server once
        if (data && !data.isSemesterCompleted && !hasRecheckedRef.current) {
          hasRecheckedRef.current = true;
          console.log("[App] Triggering self-heal semester-status/recheck...");
          const recheckRes = await fetch(`${API_BASE}/api/semester-status/recheck`, {
            method: 'POST',
            headers: authHeaders
          });
          if (recheckRes.ok) {
            const recheckData = await recheckRes.json();
            if (recheckData.isSemesterCompleted) {
              console.log("[App] Self-heal complete! Results are now announced.");
              setSemesterStatus(prev => prev ? { 
                ...prev, 
                isSemesterCompleted: recheckData.isSemesterCompleted,
                lastCompletedSemester: recheckData.lastCompletedSemester
              } : recheckData);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching semester status:", error);
    }
  }, [authHeaders, token, isAuthenticated]);

  const handleAcknowledgeSemester = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/semester-status/acknowledge`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        setSemesterStatus(prev => prev ? { ...prev, isSemesterCompleted: false } : null);
        setIsResultModalOpen(false);
      }
    } catch (error) {
      console.error("Error acknowledging semester completion:", error);
    }
  }, [authHeaders]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`, { headers: authHeaders });
      if (res.status === 401) return handleLogout();
      if (!res.ok) return;
      const data = await res.json();

      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      
      if (Array.isArray(data.tasks)) {
        let mapped = data.tasks.map(t => ({ ...t, id: t._id }));
        if (pendingUpdatesRef.current) {
          mapped = mapped.map(task => {
            const taskId = task._id || task.id;
            const pending = pendingUpdatesRef.current[taskId];
            if (pending && (Date.now() - pending.timestamp < 4000)) {
              const { timestamp, ...fields } = pending;
              return { ...task, ...fields };
            }
            return task;
          });
        }
        setTasks(mapped);
      } else {
        setTasks([]);
      }

      
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
      } else {
        setNotes([]);
      }

      
      if (Array.isArray(data.keynotes)) {
        setKeynotes(data.keynotes);
      } else {
        setKeynotes([]);
      }

      
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      } else {
        setNotifications([]);
      }

      
      if (data.bin) {
        const formattedBin = [
          ...(data.bin.tasks || []).map(t => ({ ...t, id: t._id, binType: 'Task', name: t.name, subtitle: t.course })),
          ...(data.bin.transactions || []).map(t => ({ ...t, id: t._id, binType: 'Transaction', name: t.description || 'Transaction', subtitle: `Rs ${t.amount}` })),
          ...(data.bin.habits || []).map(h => ({ ...h, id: h._id, binType: 'Habit', name: h.name, subtitle: h.type === 'good' ? 'Good Protocol' : 'Bad Protocol' })),
          ...(data.bin.notes || []).map(n => ({ ...n, id: n._id, binType: 'Note', name: n.title, subtitle: n.courseId })),
          ...(data.bin.keynotes || []).map(k => ({ ...k, id: k._id, binType: 'Keynote', name: k.title, subtitle: k.courseName }))
        ].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
        setBinItems(formattedBin);
      } else {
        setBinItems([]);
      }

      
      if (Array.isArray(data.courses)) {
        const fetchedCourses = data.courses.map(c => ({ 
          id: c._id, 
          name: c.name, 
          type: c.type === 'university' ? 'uni' : 'general',
          code: c.code,
          section: c.section,
          creditHours: c.creditHours,
          semester: c.semester
        }));
        setCourses(fetchedCourses);
      } else {
        setCourses([]);
      }

      
      if (Array.isArray(data.exams)) {
        setExams(data.exams);
      } else {
        setExams([]);
      }

      
      setActiveGroup(data.group || null);

      
      setPendingInvitations(data.invitations || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, [authHeaders, handleLogout]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchDashboardData();
      fetchSemesterStatus();
    }
  }, [isAuthenticated, token, fetchDashboardData, fetchSemesterStatus]);

  const handleLiveUpdate = useCallback((eventType) => {
    if (!token || !isAuthenticated) return;
    // Portal-specific events (grades, attendance, submissions, announcements) are handled
    // by individual components via window 'myportal_live_update' CustomEvent — no full reload needed.
    const portalOnlyEvents = ['grade_update', 'attendance_update', 'submission_update', 'announcement_update'];
    if (portalOnlyEvents.includes(eventType)) return;
    // For all other live data changes (tasks, notes, groups, etc.) do a full silent refresh
    if (window.liveSyncTimeout) clearTimeout(window.liveSyncTimeout);
    window.liveSyncTimeout = setTimeout(() => {
      fetchDashboardData();
    }, 0);
  }, [token, isAuthenticated, fetchDashboardData]);

  useLiveSync(handleLiveUpdate, handleLogout, user?._id || user?.id);

  const handleAddTask = async (newTaskData) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, { method: 'POST', headers: authHeaders, body: JSON.stringify(newTaskData) });
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Task created successfully!", type: "success" });
        fetchTasks();
      } else {
        const err = await res.json();
        ToastConfig.show({ title: "Error", message: err.message || "Failed to save task.", type: "error" });
      }
    } catch (error) { 
      ToastConfig.show({ title: "Error", message: "Network error saving task.", type: "error" }); 
    }
  };

  const deleteTask = (taskId) => setTaskToDelete(taskId);
  const executeDelete = async () => {
    if (!taskToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskToDelete}/delete`, { method: 'PUT', headers: authHeaders });
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Task moved to Bin.", type: "success" });
        fetchTasks(); fetchBin(); setTaskToDelete(null);
      } else {
        ToastConfig.show({ title: "Error", message: "Failed to move task to Bin.", type: "error" });
      }
    } catch (error) { 
      ToastConfig.show({ title: "Error", message: "Network error deleting task.", type: "error" }); 
    }
  };

  const handleToggleKeynoteRead = async (id, currentStatus) => {
    try {
      const endpoint = currentStatus ? 'unread' : 'read';
      await fetch(`${API_BASE}/api/keynotes/${id}/${endpoint}`, { method: 'PUT', headers: authHeaders });
      fetchKeynotes();
    } catch (e) { }
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
      let mediaUrls = [];
      if (formData.has('files')) {
        const uploadRes = await fetch(`${API_BASE}/api/upload`, { method: 'POST', headers: { 'x-auth-token': token }, body: formData });
        if (!uploadRes.ok) throw new Error("Media upload failed");
        const uploadData = await uploadRes.json();
        mediaUrls = uploadData.urls || [];
      }

      const payload = {
        title: formData.get('title'),
        courseName: formData.get('courseName') || 'General',
        content: formData.get('content') || '',
        type: formData.get('type') || 'text',
        mediaUrls
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
    setTasks(prevTasks => prevTasks.map(task => (task.id === id || task._id === id) ? { ...task, [field]: value } : task));
    if (!pendingUpdatesRef.current) {
      pendingUpdatesRef.current = {};
    }
    pendingUpdatesRef.current[id] = {
      ...(pendingUpdatesRef.current[id] || {}),
      [field]: value,
      timestamp: Date.now()
    };
    try { 
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ [field]: value }) }); 
      if (res.ok) {
        const updatedTask = await res.json();
        const formattedTask = { ...updatedTask, id: updatedTask._id };
        if (pendingUpdatesRef.current && pendingUpdatesRef.current[id]) {
          delete pendingUpdatesRef.current[id];
        }
        setTasks(prevTasks => prevTasks.map(task => (task.id === id || task._id === id) ? formattedTask : task));
        if (field === 'status' && value === 'Completed') {
          ToastConfig.show({ title: "Task Completed", message: "Great job finishing this task!", type: "success" });
        } else {
          ToastConfig.show({ title: "Updated", message: "Task updated successfully.", type: "success" });
        }
      } else {
        if (pendingUpdatesRef.current && pendingUpdatesRef.current[id]) {
          delete pendingUpdatesRef.current[id];
        }
        ToastConfig.show({ title: "Error", message: "Failed to update task.", type: "error" });
        fetchTasks();
      }
    } catch (error) { 
      if (pendingUpdatesRef.current && pendingUpdatesRef.current[id]) {
        delete pendingUpdatesRef.current[id];
      }
      ToastConfig.show({ title: "Error", message: "Network error updating task.", type: "error" }); 
      fetchTasks();
    }
  };

  const openAddTaskWithDate = (dateString) => { setPrefilledDate(dateString); setIsAddTaskOpen(true); };
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const getFilteredTasks = () => {
    const visibleCourseNames = new Set((visibleCourses || []).map(c => c.name));
    return tasks.filter(task => {
      if (task.course) {
        const fullCourse = courses.find(c => c.name === task.course);
        if (fullCourse && fullCourse.type === 'uni' && !visibleCourseNames.has(task.course)) {
          return false;
        }
      }
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
    const visibleCourseIds = new Set((visibleCourses || []).map(c => c.id || c._id));
    return notes.filter(note => {
      if (note.courseId) {
        const fullCourse = courses.find(c => (c.id || c._id) === note.courseId);
        if (fullCourse && fullCourse.type === 'uni' && !visibleCourseIds.has(note.courseId)) {
          return false;
        }
      }
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
    const visibleCourseNames = new Set((visibleCourses || []).map(c => c.name));
    return keynotes.filter(k => {
      if (k.courseName) {
        const fullCourse = courses.find(c => c.name === k.courseName);
        if (fullCourse && fullCourse.type === 'uni' && !visibleCourseNames.has(k.courseName)) {
          return false;
        }
      }
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



  const handleManualSync = async () => {
    try { await fetch(`${API_BASE}/api/sync-grades`, { method: 'POST', headers: authHeaders }); fetchCourses(); } catch (e) { throw e; }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/unlink-portal`, { method: 'POST', headers: authHeaders });
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Portal unlinked successfully.", type: "success" });
        fetchUser();
        fetchCourses();
      } else {
        const err = await res.json();
        ToastConfig.show({ title: "Error", message: err.message || "Failed to unlink portal.", type: "error" });
      }
    } catch (e) { 
      ToastConfig.show({ title: "Error", message: "Network error during unlink.", type: "error" }); 
    }
  };

  const handleLinkPortal = async (portalId, portalPassword) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/link-portal`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ portalId, portalPassword }) });
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Portal linked successfully!", type: "success" });
        const updatedUser = { ...user, isPortalConnected: true, portalId };
        setUser(updatedUser); localStorage.setItem('user', JSON.stringify(updatedUser)); fetchCourses();
      } else { 
        const data = await res.json();
        ToastConfig.show({ title: "Error", message: data.message || "Failed to link portal.", type: "error" });
      }
    } catch (e) { ToastConfig.show({ title: "Error", message: "Network error linking portal.", type: "error" }); }
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

  const handleUpdateProfilePic = async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/profile-pic`, {
        method: 'POST',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        },
        body: formData
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Upload failed");
      }
    } catch (e) { throw e; }
  };

  const handleUpdatePrivacy = async (showProfilePicToCommunity) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify({ showProfilePicToCommunity })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      } else {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update privacy settings");
      }
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
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Course added successfully.", type: "success" });
        fetchCourses();
      } else {
        const err = await res.json();
        ToastConfig.show({ title: "Error", message: err.message || "Failed to add course.", type: "error" });
      }
    } catch (e) { ToastConfig.show({ title: "Error", message: "Network error adding course.", type: "error" }); }
  };

  const removeCourse = async (courseId) => {
    try { const res = await fetch(`${API_BASE}/api/courses/${courseId}`, { method: 'DELETE', headers: authHeaders }); if (res.ok) fetchCourses(); } catch (e) { console.error("Delete course failed", e); }
  };

  const handleNavigate = (tab) => {
    if (tab === 'Server') { if (user?.isAdmin) setIsServerModalOpen(true); return; }
    const path = TAB_PATH_MAP[tab];
    if (path) {
      navigate(path);
    } else {
      setActiveTab(tab);
    }
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
    } else if (activeTab && activeTab.startsWith('Cash')) {
      setIsAddingNewTransaction(true);
    } else {
      setPrefilledDate(''); setIsAddTaskOpen(true);
    }
  };

  // Auto-clear stale selectedSemester if the selected semester no longer exists in courses
  useEffect(() => {
    if (!selectedSemester) return;
    const existingSemesters = new Set(
      courses
        .filter(c => c.type === 'uni')
        .map(c => (c.semester || '').trim().toLowerCase())
        .filter(Boolean)
    );
    const normalizedSelected = selectedSemester.trim().toLowerCase();
    if (!existingSemesters.has(normalizedSelected)) {
      handleSemesterChange('');
    }
  }, [courses, selectedSemester, handleSemesterChange]);

  return (
    <Routes>
      {}
      <Route path="/test-logo" element={<AnimatedLogo />} />

      <Route
        path="/login"
        element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/*"
        element={
          isAuthenticated ? (
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
                  courses={visibleCourses}
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
                  notifications={notifications}
                  fetchNotifications={fetchNotifications}
                  onToggleKeynoteRead={handleToggleKeynoteRead}
                  hfState={hfState}
                  hfModes={HF_MODES}
                  exams={activeExams}
                  activeGroup={activeGroup}
                  onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
                  onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                  isRightSidebarOpen={isRightSidebarOpen}
                  pendingInvitations={pendingInvitations}
                  semesterStatus={semesterStatus}
                  onOpenResultModal={() => setIsResultModalOpen(true)}
                />

                <RightSidebar
                  isOpen={isRightSidebarOpen}
                  onClose={() => setIsRightSidebarOpen(false)}
                  user={user}
                  activeGroup={activeGroup}
                  pendingInvitations={pendingInvitations}
                  fetchActiveGroup={fetchActiveGroup}
                  fetchPendingInvitations={fetchPendingInvitations}
                  fetchTasks={fetchTasks}
                  API_BASE={API_BASE}
                  authHeaders={authHeaders}
                />

                <GroupInfoModal
                  isOpen={isGroupInfoOpen}
                  onClose={() => setIsGroupInfoOpen(false)}
                  user={user}
                  activeGroup={activeGroup}
                  fetchActiveGroup={fetchActiveGroup}
                  fetchTasks={fetchTasks}
                  API_BASE={API_BASE}
                  authHeaders={authHeaders}
                />
                <div className="flex-1 overflow-auto p-0 relative custom-scrollbar-hide flex items-center justify-center">

                  <div className={`w-full h-full ${activeTab === 'Welcome' ? 'block' : 'hidden'}`}>
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
                  </div>

                  <div className={`w-full h-full ${activeTab === 'HyperFocus' ? 'block' : 'hidden'}`}><HyperFocus hfState={hfState} toggleAutomation={toggleAutomation} resetAutomation={resetAutomation} setSoundEnabled={setSoundEnabled} hfModes={HF_MODES} skipPhase={skipPhase} /></div>
                  <div className={`w-full h-full ${activeTab === 'Notes' ? 'block' : 'hidden'}`}><Notes courses={visibleCourses} notes={getFilteredNotes()} setNotes={setNotes} isAddingNew={isAddingNewNote} setIsAddingNew={setIsAddingNewNote} fetchNotes={fetchNotes} fetchBin={fetchBin} user={user} /></div>
                  <div className={`w-full h-full ${activeTab === 'Tasks' ? 'block' : 'hidden'}`}><TaskTable tasks={getFilteredTasks()} updateTask={updateTask} courses={visibleCourses} deleteTask={deleteTask} user={user} activeGroup={activeGroup} pendingInvitations={pendingInvitations} fetchActiveGroup={fetchActiveGroup} fetchPendingInvitations={fetchPendingInvitations} fetchTasks={fetchTasks} toast={toast} setToast={setToast} semesterStatus={semesterStatus} /></div>
                  <div className={`w-full h-full ${activeTab === 'Calendar' ? 'block' : 'hidden'}`}><Calendar tasks={getFilteredTasks()} courses={visibleCourses} onAddWithDate={openAddTaskWithDate} onUpdate={updateTask} onDelete={deleteTask} user={user} activeGroup={activeGroup} /></div>
                  <div className={`w-full h-full ${activeTab === 'Timetable' ? 'block' : 'hidden'}`}><Timetable selectedSemester={selectedSemester} currentSemester={user?.currentSemester} /></div>
                  <div className={`w-full h-full ${activeTab === 'Keynotes' ? 'block' : 'hidden'}`}><Keynote keynotes={getFilteredKeynotes()} courses={visibleCourses} onToggleRead={handleToggleKeynoteRead} onDelete={deleteKeynote} onBatchDelete={handleBatchDeleteKeynotes} user={user} /></div>
                  <div className={`w-full h-full ${activeTab.startsWith('Habits') ? 'block' : 'hidden'}`}><HabitTracker activeTab={activeTab} /></div>
                  <div className={`w-full h-full ${activeTab === 'Grade Book' ? 'block' : 'hidden'}`}><GradeBook courses={visibleCourses} user={user} activeGroup={activeGroup} selectedSemester={selectedSemester} /></div>
                  {activeTab === 'History' && <div className="w-full h-full"><ResultHistory /></div>}
                  {activeTab === 'Result' && <div className="w-full h-full"><SemesterResultPage semesterStatus={semesterStatus} onViewFullHistory={() => handleNavigate('History')} onDismiss={async () => { await handleAcknowledgeSemester(); handleNavigate('Welcome'); }} /></div>}
                  {activeTab === 'Sync Diagnostics' && <div className="w-full h-full"><SyncDiagnostics /></div>}

                  <div className={`w-full h-full ${(activeTab === 'Datesheet' && activeExams.length > 0) ? 'block' : 'hidden'}`}>
                    <Datesheet exams={activeExams} />
                  </div>

                  <div className={`w-full h-full ${['Announcements', 'Attendance', 'Submissions', 'Course Material', 'Course Vault'].includes(activeTab) ? 'block' : 'hidden'}`}><CoursePortalView activeTab={activeTab} courses={visibleCourses} user={user} filters={filters} selectedSemester={selectedSemester} onSemesterChange={handleSemesterChange} /></div>
                  <div className={`w-full h-full ${activeTab.startsWith('Cash-') ? 'block' : 'hidden'}`}><CashManager activeTab={activeTab} filters={filters} isAddingNew={isAddingNewTransaction} setIsAddingNew={setIsAddingNewTransaction} /></div>
                  <div className={`w-full h-full ${activeTab === 'Bin' ? 'block' : 'hidden'}`}><Bin binItems={binItems} restoreItem={restoreItem} permanentlyDeleteItem={permanentlyDeleteItem} deleteAll={deleteAllBin} restoreAll={restoreAllBin} /></div>
                  <div className={`w-full h-full ${activeTab === 'Admin' ? 'block' : 'hidden'}`}><AdminDashboard currentUser={user} /></div>
                  <div className={`w-full h-full ${activeTab === 'Profile' ? 'block' : 'hidden'}`}><About user={user} onUpdateProfilePic={handleUpdateProfilePic} onUpdatePrivacy={handleUpdatePrivacy} /></div>
                  <div className={`w-full h-full ${activeTab === 'Settings' ? 'block' : 'hidden'}`}><Settings user={user} idleTimeout={idleTimeout} setIdleTimeout={setIdleTimeout} onManualSync={handleManualSync} onDisconnect={handleDisconnect} onLinkPortal={handleLinkPortal} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} courses={courses} addCourse={addCourse} removeCourse={removeCourse} onUpdatePrivacy={handleUpdatePrivacy} selectedSemester={selectedSemester} onSemesterChange={handleSemesterChange} /></div>
                </div>
              </div>

              <style>{`
                .custom-scrollbar-hide::-webkit-scrollbar { display: none; }
                .custom-scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideInRight { 0% { transform: translateX(120%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
              `}</style>

              {}
              <AddTaskModal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} onSave={handleAddTask} courses={visibleCourses} initialDate={prefilledDate} tasks={tasks} activeGroup={activeGroup} />
              <TaskSummaryModal isOpen={!!viewTask} onClose={() => setViewTask(null)} task={viewTask} courses={visibleCourses} onUpdate={updateTask} user={user} activeGroup={activeGroup} />
              <AddKeynoteModal isOpen={isAddKeynoteOpen} onClose={() => setIsAddKeynoteOpen(false)} onSave={handleAddKeynoteSubmit} courses={visibleCourses} />

              <ConfirmationModal isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={executeDelete} title="Move to Bin?" message="Are you sure you want to move this task to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
              <ConfirmationModal isOpen={!!keynoteToDelete} onClose={() => setKeynoteToDelete(null)} onConfirm={executeDeleteKeynote} title="Move Snap to Bin?" message="Are you sure you want to move this Keynote to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />
              <ConfirmationModal isOpen={isBatchDeleteKeynotes} onClose={() => { setIsBatchDeleteKeynotes(false); setKeynotesToBatchDelete([]); }} onConfirm={executeBatchDeleteKeynotes} title={`Move ${keynotesToBatchDelete.length} Snaps to Bin?`} message="Are you sure you want to move the selected Keynotes to the Recycle Bin?" confirmText="Move to Bin" confirmStyle="danger" />

              {}
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

              {/* --- AUTO LOCK SCREEN --- */}
              {isLocked && (
                <div className="fixed inset-0 z-[10000] bg-white/40 dark:bg-black/60 backdrop-blur-2xl flex items-center justify-center p-6 animate-fadeIn">
                  <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-[#2C2C2C] p-10 flex flex-col items-center text-center animate-slideUp">
                    <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mb-8 relative">
                      <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping"></div>
                      <Shield size={40} className="text-blue-500" />
                    </div>

                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Session Locked</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-xs leading-relaxed">Your account has been secured due to inactivity. Click below to resume your workspace.</p>

                    <div className="w-full space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#252525] rounded-2xl border border-gray-100 dark:border-[#333] mb-8">
                        {(user?.customProfilePic || user?.portalProfilePic || user?.profilePic) ? (
                          <img src={user.customProfilePic || user.portalProfilePic || user.profilePic} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold uppercase">{user?.name?.charAt(0)}</div>
                        )}
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{user?.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{user?.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsLocked(false)}
                        className="w-full py-4 bg-brand-blue hover:bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      >
                        <Lock size={18} />
                        Unlock Workspace
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full py-3 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Sign Out
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
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// =========================================================
// 🌐 APP ROOT (Wraps the layout in a Router environment)
// =========================================================
export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const [isDarkMode] = React.useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-1000 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
          <AnimatedLogo isDarkMode={isDarkMode} />
        </div>
      )}
      <AppLayout />
      <CustomToast />
    </Router>
  );
}