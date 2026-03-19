import React from 'react';
import { Megaphone, Clock, BellRing, Sparkles } from 'lucide-react';

const CourseAnnouncements = ({ announcements }) => {
  if (!announcements || announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-3xl shadow-sm">
        <BellRing size={48} className="opacity-20 mb-4" />
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">All Caught Up!</h3>
        <p className="text-sm">No announcements have been posted for this course yet.</p>
      </div>
    );
  }

  // Smart Date Formatter (turns "2026-03-02" into "Mar 02, 2026")
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; 
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Separate the newest announcement from the rest
  const latestNews = announcements[0];
  const olderNews = announcements.slice(1);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. LATEST ANNOUNCEMENT HERO CARD */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 transition-transform hover:-translate-y-1 duration-300">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black opacity-10 blur-xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
              <Sparkles size={14} className="text-yellow-300" /> Latest Update
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-blue-100 bg-black/20 px-3 py-1 rounded-full">
              <Clock size={14} /> {formatDate(latestNews.date)}
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black mb-3 drop-shadow-md leading-tight">
            {latestNews.subject}
          </h2>
          <p className="text-blue-50 text-sm md:text-base leading-relaxed whitespace-pre-line">
            {latestNews.description}
          </p>
        </div>
      </div>

      {/* 2. OLDER ANNOUNCEMENTS TIMELINE */}
      {olderNews.length > 0 && (
        <div className="relative pt-2">
          {/* Vertical Timeline Line */}
          <div className="absolute left-[1.35rem] md:left-[2.1rem] top-2 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 to-gray-200 dark:from-indigo-500 dark:to-[#333]"></div>

          <div className="space-y-6">
            {olderNews.map((news, idx) => (
              <div key={idx} className="relative flex items-start gap-4 md:gap-6 group">
                
                {/* Timeline Node/Icon */}
                <div className="relative z-10 w-11 h-11 shrink-0 bg-white dark:bg-[#1E1E1E] border-4 border-gray-50 dark:border-dark-bg rounded-full flex items-center justify-center shadow-sm group-hover:border-blue-50 dark:group-hover:border-indigo-900/30 transition-colors duration-300">
                  <div className="w-8 h-8 bg-blue-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                    <Megaphone size={14} className="text-blue-600 dark:text-indigo-400" />
                  </div>
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-blue-200 dark:group-hover:border-indigo-500/30">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-snug">
                      {news.subject}
                    </h3>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-[#333] px-3 py-1 rounded-md w-max">
                      {formatDate(news.date)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {news.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CourseAnnouncements;