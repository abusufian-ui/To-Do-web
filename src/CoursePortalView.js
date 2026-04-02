import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, ChevronDown, CheckCircle2 } from 'lucide-react';
import CourseAnnouncements from './CourseAnnouncements';
import CourseAttendance from './CourseAttendance';
import CourseSubmissions from './CourseSubmissions';
import UCPLogo from './UCPLogo'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CoursePortalView = ({ activeTab, courses }) => {
  const uniCourses = courses.filter(c => c.type === 'uni');
  const [selectedCourse, setSelectedCourse] = useState(uniCourses.length > 0 ? uniCourses[0].name : null);
  
  // New States to hold ALL data at once for the badges
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch ALL data on mount to power the instant switching and dropdown badges
  useEffect(() => {
    if (uniCourses.length === 0) return;
    
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { 'x-auth-token': token };
        
        const [annRes, attRes, subRes] = await Promise.all([
          fetch(`${API_BASE}/api/announcements`, { headers }).catch(() => null),
          fetch(`${API_BASE}/api/attendance`, { headers }).catch(() => null),
          fetch(`${API_BASE}/api/submissions`, { headers }).catch(() => null)
        ]);

        if (annRes && annRes.ok) setAllAnnouncements(await annRes.json());
        if (attRes && attRes.ok) setAllAttendance(await attRes.json());
        if (subRes && subRes.ok) setAllSubmissions(await subRes.json());
      } catch (error) {
        console.error("Failed to fetch bulk course data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []); // Run once on mount

  // Derive the current course data instantly from the pre-fetched state
  const courseData = {
    announcements: allAnnouncements.find(a => a.courseName === selectedCourse)?.news || [],
    attendance: allAttendance.find(a => a.courseName === selectedCourse) || { summary: { conducted: 0, attended: 0 }, records: [] },
    submissions: allSubmissions.find(s => s.courseName === selectedCourse)?.tasks || []
  };

  // 🎨 DYNAMIC BADGE RENDERER
  const renderBadge = (courseName) => {
    if (activeTab === 'Announcements') {
      const courseAnns = allAnnouncements.find(a => a.courseName === courseName)?.news || [];
      if (courseAnns.length === 0) return null;
      return (
        <span className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2.5 py-1 rounded-md">
          {courseAnns.length} Updates
        </span>
      );
    }
    
    if (activeTab === 'Attendance') {
      const courseAtt = allAttendance.find(a => a.courseName === courseName);
      if (!courseAtt || !courseAtt.records || courseAtt.records.length === 0) return (
        <span className="shrink-0 bg-gray-100 text-gray-500 dark:bg-[#333] dark:text-gray-400 text-xs font-bold px-2.5 py-1 rounded-md">
          N/A
        </span>
      );
      
      const totalConducted = courseAtt.records.length;
      const totalAttended = courseAtt.records.filter(r => r.status.toLowerCase() === 'present').length;
      const percentage = ((totalAttended / totalConducted) * 100).toFixed(0);
      
      let color = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      if (percentage < 75 && percentage >= 60) color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      else if (percentage < 60) color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

      return (
        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-md ${color}`}>
          {percentage}%
        </span>
      );
    }
    
    if (activeTab === 'Submissions') {
       const courseSubs = allSubmissions.find(s => s.courseName === courseName)?.tasks || [];
       const activeTasks = courseSubs.filter(t => {
          const isExpired = new Date() > new Date(t.dueDate);
          return !isExpired && t.status !== 'Submitted';
       });
       
       if (activeTasks.length === 0) return (
           <span className="shrink-0 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 px-2.5 py-1 rounded-md">
             <CheckCircle2 size={12} /> Done
           </span>
       );
       
       return (
         <span className="shrink-0 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
           <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
           {activeTasks.length} Active
         </span>
       );
    }
    return null;
  };

  if (uniCourses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <AlertCircle size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">No University Courses Found</h2>
        <p className="mt-2 text-sm text-center px-4">Please link your portal and sync your timetable to view this data.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-6xl mx-auto p-4 md:p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar-hide">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 dark:border-[#333] pb-4 relative z-20">
        
        {/* Title Section */}
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            {activeTab}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a course to view its {activeTab.toLowerCase()}.
          </p>
        </div>
        
        {/* EXACT UI MATCH: Custom Dropdown Menu */}
        <div className="relative w-full md:w-[28rem] shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] hover:border-blue-500 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-all outline-none focus:ring-2 focus:ring-brand-blue"
          >
            <span className="flex items-center gap-3 w-full pr-2">
              <UCPLogo className="w-5 h-5 text-blue-500 shrink-0" />
              <span className="font-bold text-sm whitespace-normal leading-snug text-left">
                {selectedCourse || "Select a course"}
              </span>
            </span>
            <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Options */}
          {isDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-[100] animate-fadeIn custom-scrollbar max-h-[350px] overflow-y-auto">
              
              <div className="px-4 py-2 bg-gray-50 dark:bg-[#252525] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#2C2C2C]">
                 University Courses
              </div>

              {uniCourses.map((course) => (
                <button
                  key={course.id || course._id}
                  onClick={() => {
                    setSelectedCourse(course.name);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors text-left border-b border-gray-50 dark:border-[#2C2C2C] last:border-0 ${
                    selectedCourse === course.name 
                      ? 'bg-blue-50/50 dark:bg-blue-900/10' 
                      : ''
                  }`}
                >
                  <span className="flex items-start gap-2 text-gray-700 dark:text-gray-200 pr-2">
                    <UCPLogo className="w-4 h-4 text-blue-500 shrink-0 mt-[2px]" />
                    <span className={`leading-snug whitespace-normal break-words text-left font-medium ${selectedCourse === course.name ? 'text-brand-blue dark:text-blue-400' : ''}`}>
                      {course.name}
                    </span>
                  </span>

                  {/* The Dynamic Tab Feedback Badge */}
                  {renderBadge(course.name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 transition-opacity duration-300 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {activeTab === 'Announcements' && <CourseAnnouncements announcements={courseData.announcements} />}
            {activeTab === 'Attendance' && <CourseAttendance attendance={courseData.attendance} />}
            {activeTab === 'Submissions' && <CourseSubmissions submissions={courseData.submissions} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePortalView;