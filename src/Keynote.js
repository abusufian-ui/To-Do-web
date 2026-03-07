import React, { useState } from 'react';
import { 
  Mic, Image as ImageIcon, Trash2, CheckCircle2, BookOpen, 
  X, Download, Maximize2, Type, EyeOff, CheckSquare, Square
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const Keynote = ({ keynotes = [], courses = [], onToggleRead, onDelete, onBatchDelete }) => {
  const [selectedNote, setSelectedNote] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const isAudio = (url) => url?.match(/\.(m4a|mp3|wav|ogg|aac|mp4|3gp)$/i) || url?.includes('video/upload');

  const handleDownload = async (e, url) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `snap_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, '_blank'); 
    }
  };

  const toggleModalReadStatus = () => {
    if (!selectedNote) return;
    const newStatus = !selectedNote.isRead;
    setSelectedNote({ ...selectedNote, isRead: newStatus });
    onToggleRead(selectedNote._id, selectedNote.isRead); 
  };

  const handleCardClick = (note) => {
    if (isSelectMode) {
      if (selectedIds.includes(note._id)) {
        setSelectedIds(selectedIds.filter(id => id !== note._id));
      } else {
        setSelectedIds([...selectedIds, note._id]);
      }
    } else {
      setSelectedNote(note);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col relative overflow-hidden">
      
      {/* Header Row */}
      <div className="flex justify-between items-end mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Keynotes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Your quick captures, snaps, and voice notes from mobile.</p>
        </div>
        <div className="flex items-center gap-3">
          {keynotes.length > 0 && (
            <button 
              onClick={() => { setIsSelectMode(!isSelectMode); setSelectedIds([]); }}
              className={`px-4 py-2 rounded-xl border font-semibold text-sm transition-all ${
                isSelectMode 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400' 
                  : 'bg-white dark:bg-[#222230] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'
              }`}
            >
              {isSelectMode ? 'Cancel Selection' : 'Select'}
            </button>
          )}

          <div className="text-sm bg-white dark:bg-[#222230] px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2">
            <span className="text-brand-blue font-bold text-lg leading-none">{keynotes.filter(k => !k.isRead).length}</span> 
            <span className="text-gray-500 dark:text-gray-400 font-medium">Unread</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {keynotes.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-[#1c1c24] rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300">No Keynotes Found</h3>
            <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {keynotes.map((note) => {
              const isUni = courses.find(c => c.name === note.courseName)?.type === 'uni';
              const images = note.mediaUrls?.filter(url => !isAudio(url)) || [];
              const audios = note.mediaUrls?.filter(url => isAudio(url)) || [];
              const isSelected = selectedIds.includes(note._id);

              return (
                <div 
                  key={note._id} 
                  onClick={() => handleCardClick(note)}
                  className={`relative group flex flex-col h-auto min-h-[200px] rounded-2xl p-5 border cursor-pointer transition-all duration-300 ${
                    isSelectMode && isSelected 
                      ? 'bg-blue-50 dark:bg-[#1A233A] border-brand-blue shadow-lg shadow-blue-500/10 scale-[0.98]'
                      : note.isRead 
                        ? 'bg-white dark:bg-[#1c1c24] border-gray-200 dark:border-gray-800 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 opacity-90 hover:opacity-100' 
                        : 'bg-white dark:bg-[#1c1c24] border-brand-blue/50 dark:border-brand-blue/40 shadow-[0_4px_15px_rgba(59,130,246,0.12)] dark:shadow-[0_0_20px_rgba(59,130,246,0.08)] hover:-translate-y-1'
                  }`}
                >
                  {isSelectMode && (
                    <div className="absolute top-4 right-4 z-10 text-brand-blue">
                      {isSelected ? <CheckSquare size={20} className="text-brand-blue" /> : <Square size={20} className="text-gray-400" />}
                    </div>
                  )}

                  {/* Unread Ping Dot */}
                  {!note.isRead && !isSelectMode && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span><span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span></span>
                  )}

                  {/* Course Badge & Date Header */}
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <span className="inline-flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 uppercase tracking-wider flex-1">
                      {isUni && <UCPLogo className="w-4 h-4 text-brand-blue shrink-0 mt-[1px]" />}
                      <span className="leading-snug break-words whitespace-normal">{note.courseName}</span>
                    </span>
                    <div className="flex items-center text-[10px] font-bold text-gray-500 bg-gray-50 dark:bg-black/20 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-transparent shrink-0">
                      {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <h3 className={`text-base font-bold mb-1 line-clamp-2 leading-snug pr-6 ${isSelectMode && isSelected ? 'text-brand-blue' : 'text-gray-900 dark:text-gray-100'}`}>{note.title}</h3>
                  {note.content && <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{note.content}</p>}

                  {/* Media Indicators Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/50 flex items-center gap-3">
                    {images.length > 0 && <div className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 font-medium bg-pink-50 dark:bg-pink-500/10 px-2 py-1 rounded-md"><ImageIcon size={12}/> {images.length}</div>}
                    {audios.length > 0 && <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md"><Mic size={12}/> {audios.length}</div>}
                    {images.length === 0 && audios.length === 0 && <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md"><Type size={12}/> Text Note</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Bar for Select Mode */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#222230] border border-red-200 dark:border-red-900/50 shadow-2xl rounded-2xl p-3 flex items-center gap-4 animate-slideUp z-50">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 pl-3 border-r border-gray-200 dark:border-gray-700 pr-4">
            <span className="text-brand-blue">{selectedIds.length}</span> Selected
          </span>
          <button 
            onClick={() => onBatchDelete(selectedIds)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all"
          >
            <Trash2 size={16} /> Delete to Bin
          </button>
        </div>
      )}

      {/* --- DETAILED PREVIEW MODAL --- */}
      {selectedNote && !isSelectMode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedNote(null)}></div>
          
          <div className="relative bg-white dark:bg-[#1c1c24] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden transform animate-slideUp">
            
            <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-[#222230]">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                   {courses.find(c => c.name === selectedNote.courseName)?.type === 'uni' && <UCPLogo className="w-4 h-4 text-brand-blue" />}
                   {selectedNote.courseName} • {new Date(selectedNote.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedNote.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { onDelete(selectedNote._id); setSelectedNote(null); }} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all" title="Delete"><Trash2 size={18} /></button>
                <button onClick={() => setSelectedNote(null)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-full transition-all"><X size={18} /></button>
              </div>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
              {selectedNote.content && (
                <div className="bg-gray-50 dark:bg-[#15151a] p-4 rounded-xl border border-gray-200 dark:border-gray-800/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedNote.content}</p>
                </div>
              )}

              {selectedNote.mediaUrls && selectedNote.mediaUrls.length > 0 && (
                <div className="space-y-4">
                  {/* Images */}
                  {selectedNote.mediaUrls.filter(url => !isAudio(url)).length > 0 && (
                     <div className="grid grid-cols-2 gap-3">
                       {selectedNote.mediaUrls.filter(url => !isAudio(url)).map((url, i) => (
                         <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-black/10 dark:bg-black/50 border border-gray-200 dark:border-gray-800 cursor-zoom-in" onClick={() => setPreviewImage(url)}>
                           <img src={url} alt="snap" className="object-cover w-full h-full group-hover:opacity-75 transition-opacity" />
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <div className="bg-black/60 p-2 rounded-lg text-white backdrop-blur-sm"><Maximize2 size={20} /></div>
                           </div>
                         </div>
                       ))}
                     </div>
                  )}

                  {/* Audio */}
                  {selectedNote.mediaUrls.filter(url => isAudio(url)).map((url, i) => (
                    <div key={i} className="flex items-center bg-gray-50 dark:bg-[#252533] p-3 rounded-xl border border-gray-200 dark:border-gray-700/50">
                      <div className="p-2.5 bg-emerald-500/20 rounded-lg mr-4"><Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                      <audio controls className="w-full h-10 outline-none dark:filter dark:invert dark:contrast-150 dark:grayscale sepia-0">
                        <source src={url} type="audio/mpeg" />
                      </audio>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#15151a] flex justify-end">
              <button 
                onClick={toggleModalReadStatus}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  selectedNote.isRead 
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700' 
                    : 'bg-brand-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20'
                }`}
              >
                {selectedNote.isRead ? <EyeOff size={16} /> : <CheckCircle2 size={16} />}
                {selectedNote.isRead ? 'Mark as Unread' : 'Mark as Read'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FULLSCREEN IMAGE PREVIEW --- */}
      {previewImage && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"><X size={24} /></button>
          
          <button onClick={(e) => handleDownload(e, previewImage)} className="absolute top-6 left-6 flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all">
            <Download size={18} /> Download Image
          </button>

          <img src={previewImage} alt="Fullscreen Preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default Keynote;