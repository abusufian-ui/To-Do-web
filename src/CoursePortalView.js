import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import CourseAnnouncements from './CourseAnnouncements';
import CourseAttendance from './CourseAttendance';
import CourseSubmissions from './CourseSubmissions';
import UCPLogo from './UCPLogo'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CoursePortalView = ({ activeTab, courses }) => {
  const uniCourses = courses.filter(c => c.type === 'uni');
  const [selectedCourse, setSelectedCourse] = useState(uniCourses.length > 0 ? uniCourses[0].name : null);
  const [courseData, setCourseData] = useState({ announcements: [], attendance: null, submissions: [] });
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!selectedCourse) return;
    
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/course-records/${encodeURIComponent(selectedCourse)}`, {
          headers: { 'x-auth-token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setCourseData(data);
        }
      } catch (error) {
        console.error("Failed to fetch course data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [selectedCourse]);

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
      
      {/* Dynamic Header - Now Side-by-Side Layout */}
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
        
        {/* Custom Dropdown Menu */}
        <div className="relative w-full md:w-[26rem] shrink-0">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl text-left shadow-sm hover:border-blue-400 dark:hover:border-gray-500 focus:outline-none transition-colors"
          >
            <div className="flex items-center gap-3 w-full pr-2">
              {/* White background circle wrapper for dark mode visibility */}
              <div className="w-7 h-7 shrink-0 flex items-center justify-center self-center bg-white rounded-full p-0.5 shadow-sm">
                <UCPLogo />
              </div>
              <span className="font-bold text-sm text-gray-800 dark:text-gray-100 whitespace-normal leading-snug">
                {selectedCourse || "Select a course"}
              </span>
            </div>
            <ChevronDown size={20} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Options */}
          {isDropdownOpen && (
            <>
              {/* Invisible backdrop to close dropdown when clicking outside */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              <div className="absolute right-0 z-40 w-full mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-[#333] rounded-xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar animate-fadeIn">
                {uniCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => {
                      setSelectedCourse(course.name);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors text-left border-b border-gray-50 dark:border-[#252525] last:border-0 ${
                      selectedCourse === course.name 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-4 border-l-blue-500' 
                        : 'text-gray-700 dark:text-gray-300 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* White background circle wrapper for dark mode visibility */}
                    <div className={`w-7 h-7 shrink-0 flex items-center justify-center self-center bg-white rounded-full p-0.5 shadow-sm transition-opacity ${selectedCourse === course.name ? 'opacity-100' : 'opacity-80'}`}>
                      <UCPLogo />
                    </div>
                    {/* Multi-line wrapping for long names */}
                    <span className="whitespace-normal leading-snug font-medium text-sm">
                      {course.name}
                    </span>
                  </button>
                ))}
              </div>
            </>
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