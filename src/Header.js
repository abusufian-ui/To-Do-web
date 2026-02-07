import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, SlidersHorizontal, Bell, User, Inbox, Sun, Moon, Filter } from 'lucide-react';

const Header = ({ isDarkMode, toggleTheme, filters, setFilters, courses, onAddClick }) => {
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);

  // Close filter popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to count active filters
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
      course: 'All',
      status: 'All',
      priority: 'All',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="w-full h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-8 transition-colors duration-300 relative z-20">
      
      {/* --- LEFT SIDE: Actions --- */}
      <div className="flex items-center gap-4">
        
        {/* ADD NEW TASK BUTTON */}
        <button 
          onClick={onAddClick} // <--- Connected to the Modal
          className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-5 py-2 rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} />
          <span className="text-sm font-semibold">Add new</span>
        </button>

        <div className="flex items-center gap-2 relative">
          
          {/* SMART SEARCH BAR */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400 group-focus-within:text-brand-blue transition-colors" />
            </div>
            <input 
              type="text"
              value={filters?.searchQuery || ''}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              placeholder="Search tasks..."
              className="bg-gray-100 dark:bg-dark-surface border border-transparent focus:border-brand-blue text-gray-800 dark:text-white text-sm rounded-full py-2 pl-10 pr-4 w-48 focus:w-64 transition-all outline-none placeholder-gray-500"
            />
          </div>
          
          {/* FILTER TOGGLE BUTTON */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-all relative ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30 text-brand-blue' : 'text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface'}`}
          >
            <SlidersHorizontal size={20} />
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-brand-blue rounded-full border-2 border-white dark:border-dark-bg"></span>
            )}
          </button>

          {/* --- FILTER DROPDOWN MENU --- */}
          {showFilters && (
            <div ref={filterRef} className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl p-5 animate-fadeIn z-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Filter size={16} /> Filters
                </h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Course Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Course</label>
                  <select 
                    value={filters.course}
                    onChange={(e) => setFilters({...filters, course: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="All">All Courses</option>
                    {/* Handle both Object and String courses safely */}
                    {courses.map(c => {
                       const name = typeof c === 'object' ? c.name : c;
                       // Skip empty names
                       if (!name) return null; 
                       return <option key={name} value={name}>{name}</option>
                    })}
                  </select>
                </div>

                {/* Status & Priority Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                    <select 
                      value={filters.status}
                      onChange={(e) => setFilters({...filters, status: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                      <option value="All">All</option>
                      <option value="New task">New task</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                    <select 
                      value={filters.priority}
                      onChange={(e) => setFilters({...filters, priority: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-sm rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                      <option value="All">All</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Due Date Range</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:[color-scheme:dark]"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                      type="date" 
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-white text-xs rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-blue dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- RIGHT SIDE: User Actions --- */}
      <div className="flex items-center gap-4">
        
        <button className="hidden md:flex items-center gap-2 bg-white dark:bg-dark-surface border border-brand-blue text-brand-blue px-4 py-1.5 rounded-full hover:bg-brand-blue hover:text-white transition-all text-xs font-medium shadow-sm">
          <Inbox size={14} />
          <span>Inbox</span>
        </button>

        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface transition-all active:rotate-12"
          title="Toggle Theme"
        >
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