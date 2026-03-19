import React from 'react';
import { CalendarCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CourseAttendance = ({ attendance }) => {
  // --- ADDED SAFETY CHECK ---
  if (!attendance || !attendance.summary || !attendance.records) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">No attendance data available yet.</div>;
  }

  const { summary, records } = attendance;
  const percentage = summary.conducted > 0 
    ? ((summary.attended / summary.conducted) * 100).toFixed(1) 
    : 0;

  const chartData = [
    { name: 'Attended', value: summary.attended, color: '#10B981' }, 
    { name: 'Missed', value: summary.conducted - summary.attended, color: '#EF4444' } 
  ];

  return (
    <div className="space-y-6">
      {/* Visual Summary Card */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Attendance Overview</h2>
          <div className="flex gap-6 mt-4 justify-center md:justify-start">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conducted</p>
              <p className="text-3xl font-black text-gray-800 dark:text-white">{summary.conducted}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attended</p>
              <p className="text-3xl font-black text-emerald-500">{summary.attended}</p>
            </div>
          </div>
        </div>

        {/* Recharts Donut */}
        <div className="relative w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{percentage}%</span>
          </div>
        </div>
      </div>

      {/* Modern History Grid */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <CalendarCheck size={20} className="text-gray-400" /> Recent Classes
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {records.slice().reverse().map((record, idx) => {
            const isPresent = record.status.toLowerCase() === 'present';
            return (
              <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-center items-center gap-1 transition-all ${
                isPresent 
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' 
                  : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
              }`}>
                <span className={`text-xs font-semibold uppercase ${isPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {record.status}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{record.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseAttendance;