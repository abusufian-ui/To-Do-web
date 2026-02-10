import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, SlidersHorizontal, Bell, User, Inbox, Sun, Moon, Filter,
  Book, Mail, Clock, CheckCircle2, Calendar, 
  ChevronsUp, ChevronUp, Minus, ArrowDown, X, ChevronDown,
  CalendarDays 
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const Header = ({ activeTab, isDarkMode, toggleTheme, filters, setFilters, courses, onAddClick }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showCourseList, setShowCourseList] = useState(false); 
  const filterRef = useRef(null);
  const courseDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
        setShowCourseList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- HELPERS ---
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
    filters?.course !== 'All',
    filters?.status !== 'All',
    filters?.priority !== 'All',
    filters?.startDate !== '',
    filters?.endDate !== ''
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      ...filters, 
      course: 'All', status: 'All', priority: 'All',
      startDate: '', endDate: ''
    });
  };

  return (
    <div className="w-full h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-8 transition-colors duration-300 relative z-20">
      
      {/* --- LEFT SIDE --- */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onAddClick} 
          className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
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
          
          {/* --- CONDITIONALLY RENDER FILTER BUTTON --- */}
          {activeTab === 'Tasks' && (
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-full transition-all relative ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'}`}
              >
                <SlidersHorizontal size={20} />
                {activeFilterCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-blue rounded-full border-2 border-white dark:border-dark-bg"></span>
                )}
              </button>

              {/* --- FILTER DROPDOWN --- */}
              {showFilters && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl p-6 animate-fadeIn z-50">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Filter size={16} className="text-brand-blue" /> Filter Tasks
                    </h3>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="text-[10px] uppercase tracking-wider font-bold text-red-500">Reset</button>
                    )}
                  </div>

                  <div className="space-y-5">
                    
                    {/* Course List */}
                    <div className="relative" ref={courseDropdownRef}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Course</label>
                      <button 
                        onClick={() => setShowCourseList(!showCourseList)}
                        className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                      >
                        <span className="flex items-center gap-2">
                           {getCourseFilterIcon(filters.course)}
                           {filters.course}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${showCourseList ? 'rotate-180' : ''}`} />
                      </button>

                      {showCourseList && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
                          <div 
                            onClick={() => { setFilters({...filters, course: 'All'}); setShowCourseList(false); }}
                            className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-2 text-gray-500"
                          >
                            <Book size={14} /> All Courses
                          </div>
                          <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                            {courses.map(c => (
                              <div 
                                key={c.id || c._id || c.name}
                                onClick={() => { setFilters({...filters, course: c.name}); setShowCourseList(false); }}
                                className="p-3 text-xs hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center justify-between border-t border-gray-100 dark:border-[#2C2C2C]"
                              >
                                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                  {getCourseFilterIcon(c.name)}
                                  {c.name}
                                </span>
                                {filters.course === c.name && <CheckCircle2 size={12} className="text-brand-blue" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {['All', 'New task', 'In Progress', 'Completed'].map(s => (
                          <button
                            key={s}
                            onClick={() => setFilters({...filters, status: s})}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              filters.status === s 
                                ? 'bg-brand-blue border-brand-blue text-white' 
                                : 'border-gray-200 dark:border-[#3E3E3E] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]'
                            }`}
                          >
                            {s !== 'All' && getStatusIcon(s)} {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Priority</label>
                      <div className="flex flex-wrap gap-2">
                        {['All', 'Low', 'Medium', 'High', 'Critical'].map(p => (
                          <button
                            key={p}
                            onClick={() => setFilters({...filters, priority: p})}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              filters.priority === p 
                                ? 'bg-orange-500 border-orange-500 text-white' 
                                : 'border-gray-200 dark:border-[#3E3E3E] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]'
                            }`}
                          >
                            {p !== 'All' && getPriorityIcon(p)} {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Due Date Range</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" value={filters.startDate}
                          onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-[10px] rounded-lg p-2 outline-none dark:[color-scheme:dark]"
                        />
                        <span className="text-gray-400">-</span>
                        <input 
                          type="date" value={filters.endDate}
                          onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-[10px] rounded-lg p-2 outline-none dark:[color-scheme:dark]"
                        />
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
        <button className="hidden md:flex items-center gap-2 bg-white dark:bg-dark-surface border border-brand-blue text-brand-blue px-4 py-1.5 rounded-full hover:bg-brand-blue hover:text-white dark:hover:bg-brand-blue dark:hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all text-xs font-medium shadow-sm">
          <Inbox size={14} />
          <span>Inbox</span>
        </button>

        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all active:rotate-12">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-dark-border"></div>

        <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg"></span>
        </button>

        <div className="w-9 h-9 bg-brand-pink rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-offset-2 ring-brand-pink transition-all">
            <User size={18} className="text-white opacity-80" />
        </div>
      </div>
    </div>
  );
};

export default Header;