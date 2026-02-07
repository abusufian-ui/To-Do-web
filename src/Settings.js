import React, { useState } from 'react';
import { Trash2, Plus, BookOpen, Book } from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const Settings = ({ courses, addCourse, removeCourse }) => {
  const [newCourse, setNewCourse] = useState("");
  const [selectedType, setSelectedType] = useState('uni'); 

  const handleAdd = () => {
    if (newCourse.trim()) {
      addCourse(newCourse.trim(), selectedType);
      setNewCourse("");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fadeIn">
      <h2 className="text-3xl font-bold mb-6 dark:text-white text-gray-800">Settings</h2>
      
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#2C2C2C] p-6 shadow-sm">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white text-gray-800">
          <BookOpen size={24} className="text-blue-600 dark:text-blue-500" />
          Manage Courses
        </h3>
        
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Add your courses here. Select "University" to use the UCP logo, or "General" for a standard icon.
        </p>

        {/* --- TYPE SELECTOR --- */}
        <div className="flex flex-col gap-4 mb-8">
          
          <div className="flex gap-3">
            {/* University Button */}
            <button 
              onClick={() => setSelectedType('uni')}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all border 
                ${selectedType === 'uni' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-[#2C2C2C] border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
            >
              {/* UPDATED SIZE: w-8 h-8 (32px) */}
              <UCPLogo className="w-8 h-8 text-current" /> 
              University Course
            </button>

            {/* General Button */}
            <button 
              onClick={() => setSelectedType('general')}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all border 
                ${selectedType === 'general' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-[#2C2C2C] border-gray-200 dark:border-[#3E3E3E] text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
            >
              {/* Balanced size */}
              <Book size={28} className="text-current" /> 
              General Course
            </button>
          </div>

          <div className="flex gap-3 mt-2">
            <input 
              type="text" 
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Enter course name (e.g. Data Structures)"
              className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-[#2C2C2C] rounded-lg px-4 py-3 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors text-base"
            />
            <button 
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors text-base"
            >
              <Plus size={20} /> Add
            </button>
          </div>
        </div>

        {/* --- COURSE LIST --- */}
        <div className="grid gap-3">
          {/* Safety filter for junk entries */}
          {courses.filter(c => c && c.name).map((course, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-[#2C2C2C] group">
              
              <div className="flex items-center gap-4">
                 {/* UPDATED SIZE IN LIST: w-8 h-8 */}
                 {course.type === 'uni' ? (
                    <UCPLogo className="w-8 h-8 text-blue-600 dark:text-blue-400" /> 
                 ) : (
                    <Book size={28} className="text-gray-400" /> 
                 )}
                 <span className="font-medium dark:text-white text-gray-700 text-lg">{course.name}</span>
              </div>

              <button 
                onClick={() => removeCourse(course.name)}
                className="text-gray-400 hover:text-red-500 transition-colors p-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#333]"
                title="Remove course"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          
          {courses.filter(c => c && c.name).length === 0 && (
            <div className="text-center text-gray-400 italic py-8">No courses added yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;