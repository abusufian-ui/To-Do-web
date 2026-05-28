import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle2, Timer, Activity, Zap, GraduationCap } from 'lucide-react';

const Datesheet = ({ exams = [] }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getExamStatus = (dateStr, timeStr) => {
    try {
      const startTimeMatch = timeStr.match(/(\d{2}):(\d{2})/);
      let targetDate = new Date(dateStr);
      if (startTimeMatch) {
        targetDate.setHours(parseInt(startTimeMatch[1], 10), parseInt(startTimeMatch[2], 10), 0);
      }
      let endDate = new Date(targetDate);
      endDate.setHours(endDate.getHours() + 2);

      if (now > endDate) return { label: 'Done', tier: 'done', icon: <CheckCircle2 size={12} /> };

      const diffMs = targetDate - now;
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffMs < 0 && now <= endDate) return { label: 'In Progress', tier: 'live', icon: <Activity size={12} /> };
      if (days === 0 && hours === 0) return { label: 'Starting Soon', tier: 'critical', icon: <Timer size={12} /> };
      if (days === 0) return { label: `Today · ${hours}h`, tier: 'today', icon: <Zap size={12} /> };
      if (days === 1) return { label: 'Tomorrow', tier: 'soon', icon: <Clock size={12} /> };
      if (days <= 3) return { label: `In ${days} days`, tier: 'upcoming', icon: <Calendar size={12} /> };
      return { label: `${days} days`, tier: 'future', icon: <Calendar size={12} /> };
    } catch {
      return { label: 'Scheduled', tier: 'future', icon: <Calendar size={12} /> };
    }
  };

  const tierStyles = {
    live:     { pill: 'bg-red-500 text-white', dot: 'bg-red-500 animate-ping', bar: 'bg-red-500' },
    critical: { pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50', dot: 'bg-red-500', bar: 'bg-red-500' },
    today:    { pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50', dot: 'bg-orange-500', bar: 'bg-orange-500' },
    soon:     { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50', dot: 'bg-amber-400', bar: 'bg-amber-400' },
    upcoming: { pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50', dot: 'bg-blue-500', bar: 'bg-blue-500' },
    future:   { pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700', dot: 'bg-gray-400', bar: 'bg-gray-400' },
    done:     { pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  };

  const formatDay = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  const formatDayNum = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit' });
  const formatMonth = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const formatFullDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const sorted = [...exams].sort((a, b) => new Date(a.date) - new Date(b.date));

  const remaining = sorted.filter(e => {
    let d = new Date(e.date);
    const m = e.time.match(/(\d{2}):(\d{2})/);
    if (m) d.setHours(parseInt(m[1]) + 2, parseInt(m[2]));
    return now <= d;
  }).length;

  const done = sorted.length - remaining;
  const progressPct = sorted.length > 0 ? Math.round((done / sorted.length) * 100) : 0;

  // Group by date for the timeline
  const grouped = sorted.reduce((acc, exam) => {
    const key = exam.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(exam);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#080808] animate-fadeIn overflow-hidden">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 md:px-12 pt-10 pb-8 bg-white dark:bg-[#0d0d0d] border-b border-gray-100 dark:border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <GraduationCap size={16} className="text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Final Examinations</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                Exam<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Datesheet</span>
              </h1>
            </div>

            {/* Stats cluster */}
            <div className="flex items-end gap-3 shrink-0">
              <div className="text-right">
                <div className="text-5xl font-black text-gray-900 dark:text-white leading-none">{remaining}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">remaining</div>
              </div>
              <div className="w-px h-12 bg-gray-200 dark:bg-gray-800"></div>
              <div className="text-right">
                <div className="text-5xl font-black text-emerald-500 leading-none">{done}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">completed</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {sorted.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall Progress</span>
                <span className="text-xs font-black text-gray-700 dark:text-gray-300">{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">All Clear!</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">No upcoming exams. Take a breath — you've earned it.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-8 space-y-2">
            {Object.entries(grouped).map(([dateKey, dayExams]) => {
              const isFirst = Object.keys(grouped)[0] === dateKey;
              return (
                <div key={dateKey}>
                  {/* Date separator */}
                  <div className={`flex items-center gap-4 ${isFirst ? 'mb-4' : 'mt-8 mb-4'}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-[10px] font-black tracking-[0.15em] text-gray-400 dark:text-gray-600 leading-none mb-0.5">{formatDay(dateKey)}</div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white leading-none">{formatDayNum(dateKey)}</div>
                        <div className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-600 leading-none mt-0.5">{formatMonth(dateKey)}</div>
                      </div>
                      <div className="w-px h-10 bg-gray-200 dark:bg-[#2a2a2a]"></div>
                    </div>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-[#1a1a1a]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700">
                      {dayExams.length} exam{dayExams.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Exam cards for this date */}
                  <div className="space-y-3 pl-[52px]">
                    {dayExams.map((exam, idx) => {
                      const status = getExamStatus(exam.date, exam.time);
                      const ts = tierStyles[status.tier] || tierStyles.future;
                      const isDone = status.tier === 'done';
                      const isLive = status.tier === 'live';

                      return (
                        <div
                          key={exam._id || idx}
                          className={`relative group rounded-2xl border transition-all duration-200 overflow-hidden ${
                            isDone
                              ? 'bg-white dark:bg-[#0d0d0d] border-gray-100 dark:border-[#1a1a1a] opacity-50'
                              : isLive
                              ? 'bg-white dark:bg-[#0d0d0d] border-red-200 dark:border-red-900/50 shadow-lg shadow-red-500/5'
                              : 'bg-white dark:bg-[#0d0d0d] border-gray-100 dark:border-[#1e1e1e] hover:border-gray-200 dark:hover:border-[#2a2a2a] hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20'
                          }`}
                        >
                          {/* Left accent bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${ts.bar} ${isLive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} transition-opacity`} />

                          <div className="flex items-center gap-5 px-6 py-4 pl-7">

                            {/* Dot indicator */}
                            <div className="relative shrink-0 hidden sm:flex items-center justify-center w-8">
                              <div className={`w-2.5 h-2.5 rounded-full ${ts.dot}`} />
                              {isLive && <div className={`absolute w-2.5 h-2.5 rounded-full ${ts.dot} opacity-60`} />}
                            </div>

                            {/* Subject */}
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-black text-base md:text-lg leading-snug tracking-tight truncate mb-2 ${isDone ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
                                {exam.courseName}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  <Clock size={12} className="opacity-70 shrink-0" />
                                  {exam.time}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  <MapPin size={12} className="opacity-70 shrink-0" />
                                  {exam.venue || 'TBA'}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  <User size={12} className="opacity-70 shrink-0" />
                                  {exam.instructor || 'TBA'}
                                </span>
                              </div>
                            </div>

                            {/* Full date — desktop only */}
                            <div className="hidden lg:block text-right shrink-0">
                              <span className="text-xs font-bold text-gray-400 dark:text-gray-600">{formatFullDate(exam.date)}</span>
                            </div>

                            {/* Status pill */}
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shrink-0 ${ts.pill}`}>
                              {status.icon}
                              <span className="hidden sm:inline">{status.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom padding spacer */}
            <div className="h-8" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Datesheet;