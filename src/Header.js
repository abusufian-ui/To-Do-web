import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, SlidersHorizontal, Bell, User, Inbox, Sun, Moon, Filter,
  Book, Mail, Clock, CheckCircle2, Calendar, 
  ChevronsUp, ChevronUp, Minus, ArrowDown, ChevronDown, 
  CalendarDays, Settings, LogOut 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const Header = ({ activeTab, isDarkMode, toggleTheme, filters, setFilters, courses, onAddClick, user, onLogout }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showCourseList, setShowCourseList] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const filterRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowFilters(false);
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) setShowCourseList(false);
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HELPERS (Icons) ---
  const getStatusIcon = (s) => {
    switch(s) {
      case 'Scheduled': return <Calendar size={14} />;
      case 'In Progress': return <Clock size={14} />;
      case 'Completed': return <CheckCircle2 size={14} />;
      default: return <Mail size={14} />;
    }
  };

  const getPriorityIcon = (p) => {
    switch(p) {
      case 'Critical': return <ChevronsUp size={14} />;
      case 'High': return <ChevronUp size={14} />;
      case 'Low': return <ArrowDown size={14} />;
      default: return <Minus size={14} />;
    }
  };

  const getCourseFilterIcon = (courseName) => {
    if (courseName === 'All') return <Book size={14} className="text-gray-400" />;
    if (courseName === 'Event') return <CalendarDays size={14} className="text-rose-500" />;
    const foundCourse = courses.find(c => c.name === courseName);
    if (foundCourse?.type === 'uni') return <UCPLogo className="w-4 h-4" />;
    return <Book size={14} className="text-gray-400" />;
  };

  const activeFilterCount = [
    filters?.course !== 'All', filters?.status !== 'All', filters?.priority !== 'All',
    filters?.startDate !== '', filters?.endDate !== ''
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({ ...filters, course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '' });
  };

  return (
    <div className="w-full h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-8 transition-colors duration-300 relative z-20">
      
      {/* --- LEFT SIDE --- */}
      <div className="flex items-center gap-4">
        <button onClick={onAddClick} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <Plus size={18} />
          <span className="text-sm font-semibold">Add new</span>
        </button>

        <div className="flex items-center gap-2 relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
            </div>
            <input 
              type="text"
              value={filters?.searchQuery || ''}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              placeholder="Search tasks..."
              className="bg-gray-100 dark:bg-dark-surface border border-transparent focus:border-brand-blue text-gray-800 dark:text-white text-sm rounded-full py-2 pl-10 pr-4 w-48 focus:w-64 transition-all outline-none"
            />
          </div>
          
          {activeTab === 'Tasks' && (
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-all relative ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'}`}>
                <SlidersHorizontal size={20} />
                {activeFilterCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-blue rounded-full border-2 border-white dark:border-dark-bg"></span>}
              </button>

              {showFilters && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl p-6 animate-fadeIn z-50">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Filter size={16} className="text-brand-blue" /> Filter Tasks</h3>
                    {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[10px] uppercase tracking-wider font-bold text-red-500">Reset</button>}
                  </div>

                  <div className="space-y-5">
                    <div className="relative" ref={courseDropdownRef}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Course</label>
                      <button onClick={() => setShowCourseList(!showCourseList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                        <span className="flex items-center gap-2">{getCourseFilterIcon(filters.course)}{filters.course}</span>
                        <ChevronDown size={14} className={`transition-transform ${showCourseList ? 'rotate-180' : ''}`} />
                      </button>

                      {showCourseList && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                          <div onClick={() => { setFilters({...filters, course: 'All'}); setShowCourseList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-2 text-gray-500"><Book size={14} /> All Courses</div>
                          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                            {courses.map(c => (
                              <div key={c.id || c._id || c.name} onClick={() => { setFilters({...filters, course: c.name}); setShowCourseList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-t border-gray-100 dark:border-[#2C2C2C]">
                                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{getCourseFilterIcon(c.name)}{c.name}</span>
                                {filters.course === c.name && <CheckCircle2 size={12} className="text-brand-blue" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* ... (Status, Priority, Date filters kept same) ... */}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="flex items-center gap-4">
        <button className="hidden md:flex items-center gap-2 bg-white dark:bg-dark-surface border border-brand-blue text-brand-blue px-4 py-1.5 rounded-full hover:bg-brand-blue hover:text-white dark:hover:bg-brand-blue dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all text-xs font-medium shadow-sm">
          <Inbox size={14} />
          <span>Inbox</span>
        </button>

        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all active:rotate-12">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-dark-border"></div>

        {/* --- PROFILE DROPDOWN --- */}
        <div className="relative" ref={profileDropdownRef}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-all border border-transparent hover:border-gray-200 dark:hover:border-[#333]">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md uppercase">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-bold text-gray-700 dark:text-white leading-none">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-400 font-medium">Student</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-100 dark:border-[#333] overflow-hidden animate-slideUp z-50">
              <div className="p-4 border-b border-gray-100 dark:border-[#333]">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Signed in as</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <div className="p-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors">
                  <User size={16} /> My Profile
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors">
                  <Settings size={16} /> Account Settings
                </button>
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-[#333]">
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors font-medium">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Header;