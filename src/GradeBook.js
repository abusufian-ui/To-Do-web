import React, { useState } from 'react';
import { 
  Book, Calculator, Plus, Trash2, 
  TrendingUp 
} from 'lucide-react';

const GradeBook = ({ isDarkMode }) => {
  const [activeSemester, setActiveSemester] = useState('Spring 2026');
  
  const [semesters, setSemesters] = useState({
    'Spring 2026': {
      id: 's1',
      courses: [
        { id: 1, name: 'Differential Equations', credits: 3, marks: 85, grade: 'A', gpa: 4.0 },
        { id: 2, name: 'Operating Systems', credits: 4, marks: 78, grade: 'B+', gpa: 3.5 },
        { id: 3, name: 'Game Development', credits: 3, marks: 92, grade: 'A', gpa: 4.0 },
        { id: 4, name: 'Software Engineering', credits: 3, marks: 88, grade: 'A-', gpa: 3.7 },
        { id: 5, name: 'Des. & Anal. of Algorithms', credits: 3, marks: 75, grade: 'B', gpa: 3.0 },
      ]
    },
    'Fall 2025': {
      id: 's2',
      courses: [
        { id: 6, name: 'Data Structures', credits: 4, marks: 82, grade: 'A-', gpa: 3.7 },
        { id: 7, name: 'Linear Algebra', credits: 3, marks: 90, grade: 'A', gpa: 4.0 },
      ]
    }
  });

  const calculateGrade = (marks) => {
    if (marks >= 85) return { g: 'A', p: 4.0 };
    if (marks >= 80) return { g: 'A-', p: 3.7 };
    if (marks >= 75) return { g: 'B+', p: 3.3 };
    if (marks >= 70) return { g: 'B', p: 3.0 };
    if (marks >= 65) return { g: 'B-', p: 2.7 };
    if (marks >= 61) return { g: 'C+', p: 2.3 };
    if (marks >= 58) return { g: 'C', p: 2.0 };
    if (marks >= 55) return { g: 'C-', p: 1.7 };
    if (marks >= 50) return { g: 'D', p: 1.0 };
    return { g: 'F', p: 0.0 };
  };

  const handleMarkChange = (semKey, courseId, newMarks) => {
    const val = Math.min(100, Math.max(0, Number(newMarks)));
    const { g, p } = calculateGrade(val);
    
    setSemesters(prev => ({
      ...prev,
      [semKey]: {
        ...prev[semKey],
        courses: prev[semKey].courses.map(c => 
          c.id === courseId ? { ...c, marks: val, grade: g, gpa: p } : c
        )
      }
    }));
  };

  const getSemesterStats = (semKey) => {
    const courses = semesters[semKey].courses;
    const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);
    const totalPoints = courses.reduce((acc, c) => acc + (c.gpa * c.credits), 0);
    const sgpa = totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2);
    return { totalCredits, sgpa };
  };

  const getCGPA = () => {
    let totalCredits = 0;
    let totalPoints = 0;
    Object.values(semesters).forEach(sem => {
      sem.courses.forEach(c => {
        totalCredits += c.credits;
        totalPoints += (c.gpa * c.credits);
      });
    });
    return totalCredits === 0 ? 0 : (totalPoints / totalCredits).toFixed(2);
  };

  const currentStats = getSemesterStats(activeSemester);

  return (
    <div className="p-8 w-full h-full overflow-y-auto animate-fadeIn custom-scrollbar pb-24">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-2">Academic Record</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your grades, calculate GPA, and stay on top.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
             <Plus size={16} /> Add Course
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20"><TrendingUp size={64} /></div>
          <h3 className="text-emerald-100 font-bold text-sm uppercase tracking-wider mb-1">CGPA</h3>
          <div className="text-4xl font-bold">{getCGPA()}</div>
          <p className="text-xs text-emerald-100 mt-2 opacity-80">Cumulative Grade Point Average</p>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-brand-blue opacity-10"><Calculator size={64} /></div>
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wider mb-1">Current SGPA</h3>
          <div className="text-4xl font-bold text-brand-blue">{currentStats.sgpa}</div>
          <p className="text-xs text-gray-400 mt-2">{activeSemester} Semester</p>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl p-6 shadow-sm">
          <h3 className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-wider mb-1">Credit Hours</h3>
          <div className="flex items-end gap-2">
             <div className="text-4xl font-bold text-gray-800 dark:text-white">{currentStats.totalCredits}</div>
             <span className="text-gray-400 mb-1.5 font-medium">Hrs</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Total attempted this semester</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {Object.keys(semesters).map(semKey => (
          <button
            key={semKey}
            onClick={() => setActiveSemester(semKey)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeSemester === semKey
                ? 'bg-brand-blue text-white shadow-md'
                : 'bg-white dark:bg-[#1E1E1E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2C2C2C] hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'
            }`}
          >
            {semKey}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 dark:border-[#2C2C2C] bg-gray-50/50 dark:bg-[#181818] text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-5 pl-2">Course Name</div>
          <div className="col-span-2 text-center">Credits</div>
          <div className="col-span-2 text-center">Marks</div>
          <div className="col-span-1 text-center">Grade</div>
          <div className="col-span-1 text-center">GPA</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
          {semesters[activeSemester].courses.map((course) => (
            <div key={course.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors group">
              <div className="col-span-5 flex items-center gap-3 pl-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-brand-blue">
                  <Book size={16} />
                </div>
                <span className="font-semibold text-gray-800 dark:text-white text-sm">{course.name}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium bg-gray-100 dark:bg-[#333] px-2 py-1 rounded-md">
                  {course.credits}
                </span>
              </div>
              <div className="col-span-2 flex justify-center">
                <input 
                  type="number" 
                  value={course.marks} 
                  onChange={(e) => handleMarkChange(activeSemester, course.id, e.target.value)}
                  className="w-16 text-center bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg py-1 text-sm font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                  course.grade.startsWith('A') 
                    ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                    : course.grade.startsWith('B') 
                    ? 'bg-blue-100 text-brand-blue border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                    : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                }`}>
                  {course.grade}
                </span>
              </div>
              <div className="col-span-1 text-center font-bold text-gray-800 dark:text-white text-sm">
                {course.gpa.toFixed(2)}
              </div>
              <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-2 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-[#2C2C2C]">
           <button className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-[#333] rounded-xl text-gray-400 hover:text-brand-blue hover:border-brand-blue hover:bg-white dark:hover:bg-[#202020] transition-all flex items-center justify-center gap-2 text-sm font-bold">
             <Plus size={16} /> Add New Course Row
           </button>
        </div>
      </div>
    </div>
  );
};

export default GradeBook;