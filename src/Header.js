import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, SlidersHorizontal, User, Inbox, Sun, Moon, Filter,
  Book, Mail, Clock, CheckCircle2, Calendar, 
  ChevronsUp, ChevronUp, Minus, ArrowDown, ChevronDown, 
  Settings, LogOut 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const Header = ({ 
  activeTab, 
  isDarkMode, 
  toggleTheme, 
  filters, 
  setFilters, 
  courses, 
  onAddClick, 
  user, 
  onLogout, 
  tasks = [], 
  onOpenTask,
  onNavigate 
}) => {
  // --- STATE MANAGEMENT ---
  const [showFilters, setShowFilters] = useState(false);
  
  // Dropdown States for Filters
  const [showCourseList, setShowCourseList] = useState(false); 
  const [showStatusList, setShowStatusList] = useState(false);
  const [showPriorityList, setShowPriorityList] = useState(false);
  
  // Other UI States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inboxMessage, setInboxMessage] = useState(false);

  // Search States
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // --- REFS (For Click Outside Logic) ---
  const filterRef = useRef(null);
  const courseDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);
  const priorityDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const searchRef = useRef(null);

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

  // --- HANDLERS ---

  const handleInboxClick = () => {
    setInboxMessage(true);
    setTimeout(() => setInboxMessage(false), 2000);
  };

  const clearFilters = () => {
    setFilters({ ...filters, course: 'All', status: 'All', priority: 'All', startDate: '', endDate: '' });
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setFilters({ ...filters, searchQuery: query });

    if (query.trim().length > 0) {
      const results = tasks.filter(task => 
        task.name.toLowerCase().includes(query.toLowerCase()) || 
        (task.description && task.description.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 6);
      setSearchResults(results);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  // --- ICON HELPERS ---

  const getStatusIcon = (s) => {
    switch(s) {
      case 'New task': return <Mail size={14} className="text-blue-500" />;
      case 'Scheduled': return <Calendar size={14} className="text-gray-500" />;
      case 'In Progress': return <Clock size={14} className="text-yellow-500" />;
      case 'Completed': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'All': return <Filter size={14} className="text-gray-400" />;
      default: return <Mail size={14} />;
    }
  };

  const getPriorityIcon = (p) => {
    switch(p) {
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
    const foundCourse = courses.find(c => c.name === courseName);
    if (foundCourse?.type === 'uni') return <UCPLogo className="w-4 h-4" />;
    return <Book size={14} className="text-gray-400" />;
  };

  const activeFilterCount = [
    filters?.course !== 'All', filters?.status !== 'All', filters?.priority !== 'All',
    filters?.startDate !== '', filters?.endDate !== ''
  ].filter(Boolean).length;

  return (
    <div className="w-full h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-8 transition-colors duration-300 relative z-20">
      
      {/* --- LEFT SIDE --- */}
      <div className="flex items-center gap-4">
        
        {/* ADD NEW BUTTON */}
        <button onClick={onAddClick} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <Plus size={18} />
          <span className="text-sm font-semibold">Add new</span>
        </button>

        {/* SEARCH BAR */}
        <div className="flex items-center gap-2 relative" ref={searchRef}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
            </div>
            <input 
              type="text"
              value={filters?.searchQuery || ''}
              onChange={handleSearchChange}
              onFocus={() => filters?.searchQuery && setShowSearchDropdown(true)}
              placeholder="Search tasks..."
              className="bg-gray-100 dark:bg-dark-surface border border-transparent focus:border-brand-blue text-gray-800 dark:text-white text-sm rounded-full py-2 pl-10 pr-4 w-48 focus:w-64 transition-all outline-none"
            />
          </div>

          {/* GOOGLE-STYLE SEARCH RESULTS DROPDOWN */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-80 mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn custom-scrollbar max-h-96 overflow-y-auto">
              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#252525]">Top Results</div>
              {searchResults.map((task) => (
                <div 
                  key={task.id} 
                  onClick={() => { onOpenTask(task); setShowSearchDropdown(false); }}
                  className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-[#2C2C2C] cursor-pointer border-b border-gray-100 dark:border-[#2C2C2C] last:border-0 flex items-start gap-3 group"
                >
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'Completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-blue transition-colors">{task.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{task.course}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                        task.priority === 'Critical' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 
                        task.priority === 'High' ? 'border-orange-500/30 text-orange-500 bg-orange-500/10' : 
                        'border-gray-500/30 text-gray-500 bg-gray-500/10'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* FILTER BUTTON & MENU */}
          {activeTab === 'Tasks' && (
            <div className="relative" ref={filterRef}>
              <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-full transition-all relative ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'}`}>
                <SlidersHorizontal size={20} />
                {activeFilterCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-blue rounded-full border-2 border-white dark:border-dark-bg"></span>}
              </button>

              {showFilters && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl p-6 animate-fadeIn z-50 max-h-[85vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Filter size={16} className="text-brand-blue" /> Filter Tasks</h3>
                    {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[10px] uppercase tracking-wider font-bold text-red-500 hover:underline">Reset</button>}
                  </div>

                  <div className="space-y-5">
                    
                    {/* COURSE DROPDOWN */}
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

                    {/* STATUS DROPDOWN (Scroll List) */}
                    <div className="relative" ref={statusDropdownRef}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Status</label>
                      <button onClick={() => setShowStatusList(!showStatusList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                        <span className="flex items-center gap-2">{getStatusIcon(filters.status)}{filters.status}</span>
                        <ChevronDown size={14} className={`transition-transform ${showStatusList ? 'rotate-180' : ''}`} />
                      </button>

                      {showStatusList && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                          {['All', 'New task', 'Scheduled', 'In Progress', 'Completed'].map(status => (
                            <div key={status} onClick={() => { setFilters({...filters, status}); setShowStatusList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                              <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{getStatusIcon(status)}{status}</span>
                              {filters.status === status && <CheckCircle2 size={12} className="text-brand-blue" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PRIORITY DROPDOWN (Scroll List) */}
                    <div className="relative" ref={priorityDropdownRef}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Priority</label>
                      <button onClick={() => setShowPriorityList(!showPriorityList)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all">
                        <span className="flex items-center gap-2">{getPriorityIcon(filters.priority)}{filters.priority}</span>
                        <ChevronDown size={14} className={`transition-transform ${showPriorityList ? 'rotate-180' : ''}`} />
                      </button>

                      {showPriorityList && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                          {['All', 'Critical', 'High', 'Medium', 'Low'].map(priority => (
                            <div key={priority} onClick={() => { setFilters({...filters, priority}); setShowPriorityList(false); }} className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-b border-gray-100 dark:border-[#2C2C2C] last:border-0">
                              <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">{getPriorityIcon(priority)}{priority}</span>
                              {filters.priority === priority && <CheckCircle2 size={12} className="text-brand-blue" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DATE RANGE */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Due Date Range</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <span className="text-[9px] text-gray-400 block mb-1">From</span>
                          <input 
                            type="date" 
                            value={filters.startDate} 
                            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] rounded-lg p-2 text-xs text-gray-700 dark:text-white outline-none focus:border-brand-blue dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] text-gray-400 block mb-1">To</span>
                          <input 
                            type="date" 
                            value={filters.endDate} 
                            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] rounded-lg p-2 text-xs text-gray-700 dark:text-white outline-none focus:border-brand-blue dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT SIDE --- */}
      <div className="flex items-center gap-4">
        
        {/* INBOX BUTTON */}
        <div className="relative">
          <button 
            onClick={handleInboxClick}
            className="hidden md:flex items-center gap-2 bg-white dark:bg-dark-surface border border-brand-blue text-brand-blue px-4 py-1.5 rounded-full hover:bg-brand-blue hover:text-white dark:hover:bg-brand-blue dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all text-xs font-medium shadow-sm"
          >
            <Inbox size={14} />
            <span>Inbox</span>
          </button>
          
          {/* COMING SOON POPUP */}
          {inboxMessage && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-900 text-white text-[10px] px-3 py-1 rounded-md shadow-lg whitespace-nowrap animate-fadeIn z-50">
              Coming Soon!
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
            </div>
          )}
        </div>

        {/* THEME TOGGLE */}
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
              <p className="text-[10px] text-gray-400 font-medium">{user?.isAdmin ? 'Admin' : 'Student'}</p>
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
                <button 
                  onClick={() => { if(onNavigate) onNavigate('Profile'); setIsProfileOpen(false); }} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors"
                >
                  <User size={16} /> My Profile
                </button>
                <button 
                  onClick={() => { if(onNavigate) onNavigate('Settings'); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] rounded-lg transition-colors"
                >
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