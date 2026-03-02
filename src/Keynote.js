import React, { useState } from 'react';
import { Lightbulb, Image as ImageIcon, Mic, Type, Clock, Trash2, Book, Search } from 'lucide-react';
import UCPLogo from './UCPLogo';

const Keynotes = ({ keynotes, onDelete, courses }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterCourse, setFilterCourse] = useState('All');
  const [search, setSearch] = useState('');

  const filteredNotes = keynotes.filter(note => {
    const matchesType = filterType === 'all' || note.type === filterType;
    const matchesCourse = filterCourse === 'All' || note.courseName === filterCourse;
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) || 
                          (note.type === 'text' && note.content.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesCourse && matchesSearch;
  });

  const getTypeIcon = (type, size = 16) => {
    if (type === 'text') return <Type size={size} className="text-blue-500" />;
    if (type === 'image') return <ImageIcon size={size} className="text-pink-500" />;
    if (type === 'audio') return <Mic size={size} className="text-emerald-500" />;
  };

  const getCourseIcon = (courseName) => {
    const c = courses.find(c => c.name === courseName);
    if (c && c.type === 'uni') return <UCPLogo className="w-3 h-3 text-brand-blue" />;
    return <Book size={12} className="text-gray-400" />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900 flex items-center gap-3">
            <Lightbulb className="text-brand-blue" size={32} /> 
            Quick Snaps & Keynotes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Whiteboard images, voice memos, and quick text snaps synced straight from your phone.</p>
        </div>

        <div className="flex bg-white dark:bg-[#1E1E1E] p-1.5 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
          {['all', 'text', 'image', 'audio'].map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filterType === t ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search keynotes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-blue dark:text-white"
          />
        </div>
        <select 
          value={filterCourse} 
          onChange={(e) => setFilterCourse(e.target.value)}
          className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="All">All Courses</option>
          <option value="Event">Event</option>
          {courses.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* MASONRY GRID */}
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Lightbulb size={64} className="opacity-20 mb-4" />
          <p className="text-lg font-medium">No keynotes found.</p>
          <p className="text-sm mt-1">Use your phone app to snap pictures or record audio during class!</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredNotes.map((note) => (
            <div key={note._id} className="break-inside-avoid bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-[#333] rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              
              {/* Note Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-2.5 py-1 rounded-md border border-gray-100 dark:border-[#444]">
                  {getCourseIcon(note.courseName)}
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase truncate max-w-[120px]">{note.courseName}</span>
                </div>
                <button onClick={() => onDelete(note._id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 leading-tight">{note.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mb-4">
                <Clock size={12} /> {new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
              </div>

              {/* Dynamic Content Rendering */}
              <div className="mt-2">
                {note.type === 'text' && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}

                {note.type === 'image' && (
                  <div className="w-full rounded-xl overflow-hidden border border-gray-100 dark:border-[#333] relative bg-gray-100 dark:bg-[#121212]">
                    <img src={note.content} alt="Keynote Snap" className="w-full h-auto object-cover" loading="lazy" />
                  </div>
                )}

                {note.type === 'audio' && (
                  <div className="bg-gray-50 dark:bg-[#252525] rounded-xl p-3 border border-gray-200 dark:border-[#444]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Mic size={16} /></div>
                      <div className="h-2 flex-1 bg-gray-200 dark:bg-[#1E1E1E] rounded-full overflow-hidden">
                         <div className="w-1/3 h-full bg-emerald-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <audio controls className="w-full h-8 outline-none">
                      <source src={note.content} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Keynotes;