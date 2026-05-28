import React from 'react';
import { CalendarCheck, CheckCircle, XCircle, PieChart as PieChartIcon, TrendingUp, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CourseAttendance = ({ attendance }) => {
  if (!attendance || !attendance.records) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">No attendance data available yet.</div>;
  }

  const { records } = attendance;

  // --- DERIVE DATA DIRECTLY FROM RECORDS ---
  const totalConducted = records.length;
  const totalAttended = records.filter(r => r.status.toLowerCase() === 'present').length;
  const totalAbsent = totalConducted - totalAttended;
  const percentage = totalConducted > 0 
    ? ((totalAttended / totalConducted) * 100).toFixed(1) 
    : 0;

  const chartData = [
    { name: 'Present', value: totalAttended, color: '#10B981' }, 
    { name: 'Absent', value: totalAbsent, color: '#EF4444' } 
  ];

  // --- DYNAMIC HEALTH COLORS ---
  let healthGradient = 'from-emerald-500 to-teal-600';
  let HealthIcon = TrendingUp;
  let healthText = "Great Standing";

  if (percentage < 75 && percentage >= 60) {
    healthGradient = 'from-amber-400 to-orange-500';
    HealthIcon = AlertTriangle;
    healthText = "Borderline";
  } else if (percentage < 60) {
    healthGradient = 'from-red-500 to-rose-600';
    HealthIcon = XCircle;
    healthText = "Critical";
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. THE HERO SUMMARY CARD (Ultra Pro Max Style) */}
      <div className={`relative overflow-hidden rounded-3xl p-6 md:p-8 text-white bg-gradient-to-br ${healthGradient} shadow-xl transition-all duration-500`}>
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-black opacity-10 blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight drop-shadow-sm">Attendance Status</h2>
            <div className="flex items-center gap-2 text-white/90 font-medium">
              <HealthIcon size={18} />
              <span>{healthText}</span>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-4 shadow-lg flex flex-col items-center justify-center shrink-0">
            <span className="text-4xl md:text-5xl font-black drop-shadow-md">{percentage}%</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white/80 mt-1">Total Attendance</span>
          </div>
        </div>

        {/* Glassmorphism Stat Boxes */}
        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center transition-transform hover:scale-105 duration-300">
            <CheckCircle size={28} className="mb-2 text-white/90" />
            <span className="text-2xl font-bold">{totalAttended}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-white/70">Present</span>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center transition-transform hover:scale-105 duration-300">
            <XCircle size={28} className="mb-2 text-white/90" />
            <span className="text-2xl font-bold">{totalAbsent}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-white/70">Absent</span>
          </div>
        </div>
      </div>

      {/* 2. ATTENDANCE DISTRIBUTION (Analytics Section) */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <PieChartIcon size={20} className="text-blue-500" /> Attendance Distribution
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-around gap-8">
          
          {/* Recharts Donut */}
          {(totalConducted > 0) ? (
            <div className="relative w-48 h-48 shrink-0 hover:scale-105 transition-transform duration-500">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#252525', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }} 
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-gray-800 dark:text-white">{totalConducted}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 shrink-0 flex items-center justify-center bg-gray-50 dark:bg-[#252525] rounded-full border-2 border-dashed border-gray-200 dark:border-[#333]">
              <span className="text-gray-400 font-bold">No Data</span>
            </div>
          )}

          {/* Custom Legend */}
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center justify-between gap-6 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Present</span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{totalAttended}</span>
            </div>

            <div className="flex items-center justify-between gap-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Absent</span>
              </div>
              <span className="font-black text-red-600 dark:text-red-400 text-lg">{totalAbsent}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. RECENT CLASSES GRID */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <CalendarCheck size={20} className="text-gray-400" /> Class History
        </h3>
        
        {records.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {records.slice().reverse().map((record, idx) => {
              const isPresent = record.status.toLowerCase() === 'present';
              return (
                <div key={idx} className={`group p-3 rounded-2xl border flex flex-col justify-center items-center gap-1.5 hover:-translate-y-1 transition-all duration-300 ${
                  isPresent 
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg hover:shadow-emerald-500/10' 
                    : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:shadow-lg hover:shadow-red-500/10'
                }`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isPresent ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    {record.status}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{record.date}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <CalendarCheck size={32} className="opacity-20 mb-3" />
            <p className="text-sm">No recent classes recorded yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default CourseAttendance;