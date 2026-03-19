import React from 'react';
import { Bell } from 'lucide-react';

const CourseAnnouncements = ({ announcements }) => {
  if (!announcements || announcements.length === 0) {
    return <div className="p-6 text-center text-gray-500">No announcements yet.</div>;
  }

  return (
    <div className="space-y-4">
      {announcements.map((news, idx) => (
        <div key={idx} className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-blue-600 dark:text-blue-400">
              <Bell size={24} />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{news.subject}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#2C2C2C] px-3 py-1 rounded-full whitespace-nowrap w-max">
                  {news.date}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                {news.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CourseAnnouncements;