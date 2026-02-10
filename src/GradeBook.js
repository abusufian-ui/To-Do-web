import React, { useState, useEffect } from 'react';
import { Book, RefreshCw, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const GradeBook = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState({});

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/grades');
      const data = await res.json();
      setGrades(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrades(); }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // WAITS for the server to finish scraping (can take 30-60 seconds)
      const res = await fetch('/api/sync-grades', { method: 'POST' });
      
      if (res.ok) {
          // Only refresh data after the server says "Done"
          await fetchGrades(); 
      } else {
          alert("Sync failed on server.");
      }
    } catch (error) {
      alert("Error connecting to server.");
    } finally {
      setIsSyncing(false); // Stop spinner
    }
  };

  const toggleRow = (courseId, idx) => {
    const key = `${courseId}-${idx}`;
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading Academic Records...</div>;

  return (
    <div className="p-8 w-full h-full overflow-y-auto animate-fadeIn custom-scrollbar pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900">Portal Grade Book</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
             {grades.length} Courses Synced
          </p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-blue hover:bg-blue-600 shadow-blue-500/30'}`}
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {grades.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 dark:border-[#333] rounded-2xl">
          <p className="text-gray-500 font-medium">No grades found.</p>
          <button onClick={handleSync} className="mt-4 text-brand-blue font-bold hover:underline">Sync now</button>
        </div>
      ) : (
        /* GRID LAYOUT */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {grades.map((course) => (
            <div key={course._id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl shadow-sm flex flex-col">
              
              {/* Course Header */}
              <div className="p-5 border-b border-gray-100 dark:border-[#2C2C2C] bg-gray-50 dark:bg-[#252525] flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-brand-blue shadow-sm shrink-0">
                    <Book size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight break-words max-w-[200px]">{course.courseName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <Clock size={12} />
                      <span>{new Date(course.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {course.totalPercentage && course.totalPercentage !== "0" && (
                   <div className="bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border border-yellow-400/20 px-3 py-1 rounded-lg font-bold text-lg">
                     {course.totalPercentage}%
                   </div>
                )}
              </div>

              {/* Assessment List */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 dark:bg-[#181818] border-b border-gray-100 dark:border-[#2C2C2C]">
                    <tr>
                      <th className="px-6 py-3 font-bold">Item</th>
                      <th className="px-2 py-3 font-bold text-center">Wgt</th>
                      <th className="px-6 py-3 font-bold text-right">Score</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#2C2C2C]">
                    {course.assessments.map((item, idx) => {
                      const key = `${course._id}-${idx}`;
                      const isExpanded = expandedRows[key];
                      const hasDetails = item.details && item.details.length > 0;

                      return (
                        <React.Fragment key={idx}>
                          <tr 
                            onClick={() => hasDetails && toggleRow(course._id, idx)}
                            className={`transition-colors ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525]' : ''}`}
                          >
                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-200">{item.name}</td>
                            <td className="px-2 py-4 text-center">
                              {item.weight && (
                                <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                  {item.weight}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-brand-blue text-base">{item.percentage}</td>
                            <td className="pr-4 text-gray-400">
                                {hasDetails && (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-gray-50 dark:bg-[#1a1a1a] animate-fadeIn">
                              <td colSpan="4" className="p-4">
                                <div className="border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden bg-white dark:bg-[#222]">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-100 dark:bg-[#2C2C2C] text-gray-500 uppercase">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Task</th>
                                        <th className="px-3 py-2 text-center">Obtained</th>
                                        <th className="px-3 py-2 text-center">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                                      {item.details.map((detail, dIdx) => (
                                        <tr key={dIdx}>
                                          <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{detail.name}</td>
                                          <td className="px-3 py-2 text-center font-bold text-brand-blue">{detail.obtainedMarks}</td>
                                          <td className="px-3 py-2 text-center text-gray-500">{detail.maxMarks}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GradeBook;