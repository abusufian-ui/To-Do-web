import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, SlidersHorizontal, User, Sun, Moon, Filter,
  Book, Mail, Clock, CheckCircle2, Calendar, Menu,
  ChevronsUp, ChevronUp, Minus, ArrowDown, ChevronDown,
  FileText, X, Image as ImageIcon, Mic, FileArchive,
  Timer, Download, Maximize2, EyeOff, Activity, AlertCircle, Users,
  LogOut, Bell, Trash2
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Header = ({
  activeTab, isDarkMode, toggleTheme, filters, setFilters, courses, onAddClick, user, onLogout,
  tasks, onOpenTask, onNavigate, onMenuClick, notes, onOpenNote, keynotes, notifications, fetchNotifications, onToggleKeynoteRead, hfState, hfModes,
  exams, activeGroup, onOpenGroupInfo, onToggleRightSidebar, isRightSidebarOpen, pendingInvitations
}) => {
  const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const resolveGroupAvatarUrl = (url) => {
    if (!url) return '';
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    const version = activeGroup?.updatedAt ? new Date(activeGroup.updatedAt).getTime() : '';
    return version ? `${finalUrl}?t=${version}` : finalUrl;
  };

  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeNotes = Array.isArray(notes) ? notes : [];
  const safeKeynotes = Array.isArray(keynotes) ? keynotes : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const [showFilters, setShowFilters] = useState(false);
  const [showCourseList, setShowCourseList] = useState(false);
  const [showStatusList, setShowStatusList] = useState(false);
  const [showPriorityList, setShowPriorityList] = useState(false);
  const [showMediaList, setShowMediaList] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [selectedNote, setSelectedNote] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const filterRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const searchRef = useRef(null);

  const isCashTab = activeTab && activeTab.startsWith('Cash');

  // Calculate Group Roles
  const isGroupCreator = activeGroup?.creatorId?._id === user?.id || activeGroup?.creatorId === user?.id || activeGroup?.creatorId?._id === user?._id || activeGroup?.creatorId === user?._id;
  const isGroupAdmin = isGroupCreator || activeGroup?.admins?.some(adminId => adminId === user?.id || adminId?._id === user?.id || adminId === user?._id || adminId?._id === user?._id);
  const groupRoleLabel = isGroupCreator ? 'Creator' : (isGroupAdmin ? 'Admin' : 'Member');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilters(false);
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) setShowCourseList(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) setShowStatusList(false);
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) setShowPriorityList(false);
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setIsProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearFilters = () => {
    setFilters({ ...filters, course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '', mediaType: 'All', source: 'All' });
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setFilters({ ...filters, searchQuery: query });

    if (query.trim().length > 0 && !isCashTab) {
      if (activeTab === 'Notes') {
        const results = safeNotes.filter(note => note?.title?.toLowerCase().includes(query.toLowerCase()) || note?.content?.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
        setSearchResults(results.map(n => ({ ...n, isNoteResult: true })));
      } else if (activeTab === 'Keynotes') {
        const results = safeKeynotes.filter(note => note?.title?.toLowerCase().includes(query.toLowerCase()) || note?.content?.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
        setSearchResults(results.map(n => ({ ...n, isNoteResult: true })));
      } else {
        const results = safeTasks.filter(task => task?.name?.toLowerCase().includes(query.toLowerCase()) || (task?.description && task.description.toLowerCase().includes(query.toLowerCase()))).slice(0, 6);
        setSearchResults(results.map(t => ({ ...t, isTaskResult: true })));
      }
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const getStatusIcon = (s) => {
    switch (s) {
      case 'New task': return <Mail size={14} className="text-blue-500" />;
      case 'Scheduled': return <Calendar size={14} className="text-gray-500" />;
      case 'In Progress': return <Clock size={14} className="text-yellow-500" />;
      case 'Completed': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'All': return <Filter size={14} className="text-gray-400" />;
      default: return <Mail size={14} />;
    }
  };

  const getPriorityIcon = (p) => {
    switch (p) {
      case 'Critical': return <ChevronsUp size={14} className="text-red-500" />;
      case 'High': return <ChevronUp size={14} className="text-orange-500" />;
      case 'Medium': return <Minus size={14} className="text-yellow-500" />;
      case 'Low': return <ArrowDown size={14} className="text-blue-500" />;
      case 'All': return <Filter size={14} className="text-gray-400" />;
      default: return <Minus size={14} />;
    }
  };

  const getCourseFilterIcon = (courseName) => {
    if (courseName === 'All') return <Book size={14} className="text-gray-400" />;
    const foundCourse = safeCourses.find(c => c?.name === courseName);
    if (foundCourse?.type === 'uni') return <UCPLogo className="w-4 h-4" />;
    return <Book size={14} className="text-gray-400" />;
  };

  const activeFilterCount = [
    filters?.course !== 'All', filters?.status !== 'All', filters?.priority !== 'All',
    filters?.startDate !== '', filters?.endDate !== '', filters?.mediaType !== 'All',
    filters?.source !== 'All'
  ].filter(Boolean).length;

  const unreadNotifications = safeNotifications.filter(n => !n?.isRead);

  const isAudio = (url) => url?.match(/\.(m4a|mp3|wav|ogg|aac|mp4|3gp)$/i) || url?.includes('video/upload');

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        }
      });
      if (res.ok && fetchNotifications) {
        fetchNotifications();
      }
    } catch (e) { console.error("Error marking notifications as read", e); }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      if (res.ok && fetchNotifications) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleDownload = async (e, url) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `snap_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) { window.open(url, '_blank'); }
  };

  const toggleModalReadStatus = () => {
    if (!selectedNote) return;
    const newStatus = !selectedNote.isRead;
    setSelectedNote({ ...selectedNote, isRead: newStatus });
    onToggleKeynoteRead(selectedNote._id, selectedNote.isRead);
  };

  return (
    <>
      <div className="w-full h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-4 md:px-8 transition-colors duration-300 relative z-[100]">

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onMenuClick} className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors">
            <Menu size={22} />
          </button>

          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white w-9 h-9 md:w-auto md:px-5 md:py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus size={18} className="shrink-0" />
            <span className="hidden md:inline text-sm font-semibold whitespace-nowrap">
              {activeTab === 'Notes' ? 'New Note' : activeTab === 'Keynotes' ? 'Add Snap' : isCashTab ? 'Add Transaction' : 'Add new'}
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-2 relative" ref={searchRef}>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              </div>
              <input
                type="text"
                value={filters?.searchQuery || ''}
                onChange={handleSearchChange}
                onFocus={() => filters?.searchQuery && !isCashTab && setShowSearchDropdown(true)}
                placeholder={activeTab === 'Notes' || activeTab === 'Keynotes' ? `Search ${activeTab.toLowerCase()}...` : isCashTab ? 'Search transactions...' : "Search tasks..."}
                autoComplete="off"
                name="global-portal-search-input"
                spellCheck="false"
                className="bg-gray-100 dark:bg-dark-surface border border-transparent focus:border-brand-blue text-gray-800 dark:text-white text-sm rounded-full py-2 pl-10 pr-4 w-32 md:w-48 focus:w-48 md:focus:w-64 transition-all outline-none"
              />
            </div>

            {showSearchDropdown && searchResults.length > 0 && !isCashTab && (
              <div className="absolute top-full left-0 w-80 mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl overflow-hidden z-[110] animate-fadeIn custom-scrollbar max-h-96 overflow-y-auto">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#252525]">Top Results</div>
                {searchResults.map((item, index) => (
                  <div
                    key={item?.id || item?._id || index}
                    onClick={() => {
                      if (item.isNoteResult) onOpenNote(item);
                      else onOpenTask(item);
                      setShowSearchDropdown(false);
                    }}
                    className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-[#2C2C2C] cursor-pointer border-b border-gray-100 dark:border-[#2C2C2C] last:border-0 flex items-start gap-3 group"
                  >
                    <div className="mt-1 flex-shrink-0 text-brand-blue">
                      {item.isNoteResult ? <FileText size={14} /> : <div className={`w-2 h-2 rounded-full ${item.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-blue transition-colors">
                        {item.isNoteResult ? item.title : item.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px]">
                          {item.isNoteResult ? (safeCourses.find(c => (c.id || c._id) === item.courseId)?.name || 'General') : item.course}
                        </span>
                        {item.isTaskResult && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${item.priority === 'Critical' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                            item.priority === 'High' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' :
                              'border-gray-500/30 text-gray-500 bg-gray-500/10'
                            }`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(activeTab === 'Tasks' || activeTab === 'Notes' || activeTab === 'Keynotes' || activeTab === 'Cash-Transactions') && (
              <div className="relative" ref={filterRef}>
                <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-all relative ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'}`}>
                  <SlidersHorizontal size={20} />
                  {activeFilterCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-blue rounded-full border-2 border-white dark:border-dark-bg"></span>}
                </button>

                {showFilters && (
                  <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl p-6 animate-fadeIn z-[110] max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Filter size={16} className="text-brand-blue" /> Filter</h3>
                      {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:underline">Reset</button>}
                    </div>

                    <div className="space-y-5">
                      <div className="relative" ref={courseDropdownRef}>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Course</label>
                        <button onClick={() => setShowCourseList(!showCourseList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                          <span className="flex items-center gap-2">{getCourseFilterIcon(filters.course)}{filters.course}</span>
                          <ChevronDown size={14} className={`transition-transform ${showCourseList ? 'rotate-180' : ''}`} />
                        </button>
                        {showCourseList && (
                          <div className="mt-2 w-full bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                            <div onClick={() => { setFilters({ ...filters, course: 'All' }); setShowCourseList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-2 text-gray-500"><Book size={14} /> All Courses</div>
                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                              {safeCourses.map((c, idx) => (
                                <div key={c?.id || c?._id || idx} onClick={() => { setFilters({ ...filters, course: c.name }); setShowCourseList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-t border-gray-100 dark:border-[#2C2C2C]">
                                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                    {c?.type === 'uni' ? <UCPLogo className="w-4 h-4" /> : <Book size={14} className="text-gray-400" />}
                                    {c?.name}
                                  </span>
                                  {filters.course === c?.name && <CheckCircle2 size={12} className="text-brand-blue" />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {activeTab === 'Keynotes' && (
                        <div className="relative">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Media Type</label>
                          <button onClick={() => setShowMediaList(!showMediaList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                            <span className="flex items-center gap-2">
                              {filters.mediaType === 'Image' && <ImageIcon size={14} className="text-pink-500" />}
                              {filters.mediaType === 'Audio' && <Mic size={14} className="text-emerald-500" />}
                              {filters.mediaType === 'All' && <FileArchive size={14} className="text-gray-400" />}
                              {filters.mediaType}
                            </span>
                            <ChevronDown size={14} className={`transition-transform ${showMediaList ? 'rotate-180' : ''}`} />
                          </button>
                          {showMediaList && (
                            <div className="mt-2 w-full bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                              {['All', 'Image', 'Audio'].map(type => (
                                <div key={type} onClick={() => { setFilters({ ...filters, mediaType: type }); setShowMediaList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                                  <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{type}</span>
                                  {filters.mediaType === type && <CheckCircle2 size={12} className="text-brand-blue" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'Tasks' && (
                        <>
                          <div className="relative" ref={statusDropdownRef}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Status</label>
                            <button onClick={() => setShowStatusList(!showStatusList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                              <span className="flex items-center gap-2">{getStatusIcon(filters.status)}{filters.status}</span>
                              <ChevronDown size={14} className={`transition-transform ${showStatusList ? 'rotate-180' : ''}`} />
                            </button>
                            {showStatusList && (
                              <div className="mt-2 w-full bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                                {['All', 'New task', 'Scheduled', 'In Progress', 'Completed'].map(status => (
                                  <div key={status} onClick={() => { setFilters({ ...filters, status }); setShowStatusList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{getStatusIcon(status)}{status}</span>
                                    {filters.status === status && <CheckCircle2 size={12} className="text-brand-blue" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative" ref={priorityDropdownRef}>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Priority</label>
                            <button onClick={() => setShowPriorityList(!showPriorityList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                              <span className="flex items-center gap-2">{getPriorityIcon(filters.priority)}{filters.priority}</span>
                              <ChevronDown size={14} className={`transition-transform ${showPriorityList ? 'rotate-180' : ''}`} />
                            </button>
                            {showPriorityList && (
                              <div className="mt-2 w-full bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                                {['All', 'Critical', 'High', 'Medium', 'Low'].map(priority => (
                                  <div key={priority} onClick={() => { setFilters({ ...filters, priority }); setShowPriorityList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{getPriorityIcon(priority)}{priority}</span>
                                    {filters.priority === priority && <CheckCircle2 size={12} className="text-brand-blue" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      <div className="relative pt-2 border-t border-gray-100 dark:border-[#333]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3">Date Range</label>
                        <div className="flex items-center gap-3">
                          <div className="w-full relative">
                            <span className="absolute -top-2 left-3 bg-white dark:bg-[#1E1E1E] px-1 text-[9px] font-bold text-gray-400 z-10">START</span>
                            <input
                              type="date"
                              value={filters.startDate || ''}
                              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                              className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all relative z-0"
                            />
                          </div>
                          <div className="w-full relative">
                            <span className="absolute -top-2 left-3 bg-white dark:bg-[#1E1E1E] px-1 text-[9px] font-bold text-gray-400 z-10">END</span>
                            <input
                              type="date"
                              value={filters.endDate || ''}
                              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                              className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all relative z-0"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {exams && exams.length > 0 && (
              <button
                onClick={() => onNavigate('Datesheet')}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full text-red-600 dark:text-red-400 font-bold text-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse hover:animate-none ml-2 whitespace-nowrap shrink-0"
                title="View Datesheet"
              >
                <AlertCircle size={16} className="shrink-0" />
                <span className="hidden sm:inline">Exams ({exams.length})</span>
              </button>
            )}

          </div>
        </div>

        {/* --- RIGHT SIDE --- */}
        <div className="flex items-center gap-2 md:gap-4">

          <div className="hidden sm:flex items-center gap-1 border-r border-gray-200 dark:border-[#333] pr-2 mr-1">
            <button
              onClick={() => onNavigate('HyperFocus')}
              className={`p-2 rounded-full transition-all relative ${activeTab === 'HyperFocus' ? 'bg-gray-200 dark:bg-dark-surface' : 'hover:bg-gray-100 dark:hover:bg-dark-surface'
                }`}
              title="Hyper Focus Automation"
            >
              {hfState?.isAutomated ? (
                <div className="relative flex items-center justify-center">
                  <Activity size={20} className="animate-pulse" style={{ color: hfModes?.[hfState?.modeId || 'focus']?.color || '#3B82F6' }} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: hfModes?.[hfState?.modeId || 'focus']?.color || '#3B82F6' }}></span>
                </div>
              ) : (
                <Timer size={20} className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsInboxOpen(true);
              }}
              className="p-2.5 rounded-xl bg-white dark:bg-[#1E1E1E] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shadow-sm border border-gray-200 dark:border-[#2C2C2C] relative transition-all"
            >
              <Bell size={20} />
              {((unreadNotifications && unreadNotifications.length > 0) || (pendingInvitations && pendingInvitations.length > 0)) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1E1E1E]"></span>
              )}
            </button>
          </div>

          {/* 🚀 FIXED: ELEGANT GROUP AVATAR WITH SUBTLE ROLE INDICATOR */}
          {activeGroup && (
            <button
              onClick={onOpenGroupInfo}
              className="relative flex items-center justify-center hover:scale-105 transition-transform shrink-0 outline-none group"
              title={`${activeGroup.name} (${groupRoleLabel})`}
            >
              {activeGroup.profilePic ? (
                <img src={resolveGroupAvatarUrl(activeGroup.profilePic)} alt="" className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shadow-md ring-2 ring-gray-200 dark:ring-[#333]" />
              ) : (
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 dark:bg-[#2C2C2C] text-gray-400 dark:text-gray-500 flex items-center justify-center shadow-md ring-2 ring-gray-200 dark:ring-[#333]">
                  <Users size={16} />
                </div>
              )}
              
              {isGroupCreator ? (
                <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white rounded-full p-0.5 border-2 border-white dark:border-dark-bg shadow-sm" title="Creator">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/></svg>
                </div>
              ) : isGroupAdmin ? (
                <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white dark:border-dark-bg shadow-sm" title="Admin">
                   <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
              ) : null}
            </button>
          )}

          <button
            onClick={onToggleRightSidebar}
            className={`p-2 rounded-full transition-all relative ${isRightSidebarOpen
              ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'
              }`}
            title="Community Directory"
          >
            <Users size={20} />
            {pendingInvitations && pendingInvitations.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg border-2 border-white dark:border-dark-bg animate-pulse"></span>
            )}
          </button>

          <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all active:rotate-12">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-dark-border"></div>

          <div className="relative shrink-0" ref={profileDropdownRef}>
            <button onClick={() => !isProfileOpen ? setIsProfileOpen(true) : setIsProfileOpen(false)} className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-all border border-transparent hover:border-gray-200 dark:hover:border-[#333] whitespace-nowrap shrink-0">
              {(user?.customProfilePic || user?.portalProfilePic || user?.profilePic) ? (
                <img src={user.customProfilePic || user.portalProfilePic || user.profilePic} alt={user.name} className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover shadow-md ring-2 ring-white/20 shrink-0" />
              ) : (
                <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md uppercase shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left hidden md:block whitespace-nowrap">
                <p className="text-sm font-bold text-gray-700 dark:text-white leading-none whitespace-nowrap">{user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap mt-1">{isSuperAdmin ? 'Super Admin' : user?.isAdmin ? 'Admin' : 'Student'}</p>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden md:block shrink-0" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-100 dark:border-[#333] overflow-hidden animate-slideUp z-50">
                <div className="p-4 border-b border-gray-100 dark:border-[#333]">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Signed in as</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="p-2 border-t border-gray-100 dark:border-[#333]">
                  <button onClick={() => { onNavigate('Profile'); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 mb-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors font-medium">
                    <User size={16} /> Account
                  </button>
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors font-medium">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Notifications Modal */}
      {isInboxOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] animate-fadeIn"
            onClick={() => setIsInboxOpen(false)}
          />

          <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-gray-50 dark:bg-[#121212] shadow-2xl border-l border-gray-200 dark:border-[#2C2C2C] z-[160] transform transition-transform duration-300 ease-in-out flex flex-col ${isInboxOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-5 border-b border-gray-200 dark:border-[#2C2C2C] flex justify-between items-center bg-white dark:bg-[#1E1E1E]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue"><Bell size={20} /></div>
                Notifications
              </h2>
              <div className="flex items-center gap-2">
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={handleMarkNotificationsRead}
                    className="px-2.5 py-1.5 text-xs font-bold text-brand-blue hover:bg-brand-blue/10 dark:hover:bg-brand-blue/5 rounded-lg transition-all"
                  >
                    Read All
                  </button>
                )}
                <button onClick={() => setIsInboxOpen(false)} className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-50 dark:bg-[#252525] rounded-full shadow-sm transition-all hover:rotate-90">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {safeNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 opacity-50">
                  <Bell size={48} strokeWidth={1} />
                  <p className="text-sm font-medium">No new notifications.</p>
                </div>
              ) : (
                safeNotifications.map((notif) => {
                  return (
                    <div
                      key={notif._id}
                      className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${!notif.isRead
                        ? 'bg-white dark:bg-[#1E1E1E] border-brand-blue/50 shadow-md shadow-brand-blue/10'
                        : 'bg-gray-100 dark:bg-[#1c1c24] border-transparent opacity-60'
                        }`}
                    >
                      {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue shadow-[0_0_12px_rgba(59,130,246,0.9)]"></div>}

                      <div className="flex justify-between items-start mb-2 gap-2 pl-1">
                        <span className="flex items-start gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-1">
                          {notif.type}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteNotification(e, notif._id)}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 mb-1 pl-1 cursor-pointer" onClick={() => { if(notif.link) window.open(notif.link, '_blank'); }}>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{notif.title}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                        {notif.sender && (
                          <div className="mt-3 flex items-center gap-2">
                            {notif.sender.profilePic ? (
                              <img src={notif.sender.profilePic} alt="sender" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                                {notif.sender.name ? notif.sender.name.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                            <span className="text-[11px] font-medium text-brand-blue opacity-90">{notif.sender.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedNote(null)}></div>

          <div className="relative bg-white dark:bg-[#1c1c24] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden transform animate-slideUp">

            <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-[#222230]">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {safeCourses.find(c => c.name === selectedNote.courseName)?.type === 'uni' && <UCPLogo className="w-4 h-4 text-brand-blue" />}
                  {selectedNote.courseName}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h2>
              </div>
              <button onClick={() => setSelectedNote(null)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-800 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
              {selectedNote.content && (
                <div className="bg-gray-50 dark:bg-[#15151a] p-4 rounded-xl border border-gray-200 dark:border-gray-800/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedNote.content}</p>
                </div>
              )}

              {selectedNote.mediaUrls && selectedNote.mediaUrls.length > 0 && (
                <div className="space-y-4">
                  {selectedNote.mediaUrls.filter(url => !isAudio(url)).length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedNote.mediaUrls.filter(url => !isAudio(url)).map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-black/10 dark:bg-black/50 border border-gray-200 dark:border-gray-800 cursor-zoom-in" onClick={() => setPreviewImage(url)}>
                          <img src={url} alt="snap" className="object-cover w-full h-full group-hover:opacity-75 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-black/60 p-2 rounded-lg text-white"><Maximize2 size={20} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedNote.mediaUrls.filter(url => isAudio(url)).map((url, i) => (
                    <div key={i} className="flex items-center bg-gray-50 dark:bg-[#252533] p-3 rounded-xl border border-gray-200 dark:border-gray-700/50">
                      <div className="p-2.5 bg-emerald-500/20 rounded-lg mr-4">
                        <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <audio controls className="w-full h-10 outline-none dark:filter dark:invert dark:contrast-150 dark:grayscale">
                        <source src={url} type="audio/mpeg" />
                      </audio>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#15151a] flex justify-end">
              <button
                onClick={toggleModalReadStatus}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedNote.isRead
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                  : 'bg-brand-blue text-white hover:bg-blue-600'
                  }`}
              >
                {selectedNote.isRead ? <EyeOff size={16} /> : <CheckCircle2 size={16} />}
                {selectedNote.isRead ? 'Mark as Unread' : 'Mark as Read'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all">
            <X size={24} />
          </button>

          <button onClick={(e) => handleDownload(e, previewImage)} className="absolute top-6 left-6 flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all">
            <Download size={18} /> Download
          </button>

          <img src={previewImage} alt="Fullscreen Preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
};

export default Header;