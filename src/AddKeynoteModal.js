import React, { useState, useRef } from 'react';
import { X, Mic, Square, Trash2, Image as ImageIcon, Book, CheckCircle2 } from 'lucide-react';
import UCPLogo from './UCPLogo';

const AddKeynoteModal = ({ isOpen, onClose, onSave, courses = [] }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseName, setCourseName] = useState('');
  
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  if (!isOpen) return null;

  const uniCourses = courses.filter(c => c.type === 'uni' || c.type === 'university');
  const generalCourses = courses.filter(c => c.type !== 'uni' && c.type !== 'university');

  const getCourseIcon = (name) => {
    if (uniCourses.some(c => c.name === name)) return <UCPLogo className="w-4 h-4 text-brand-blue" />;
    return <Book size={14} className="text-gray-400" />;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newMedia = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('audio/') ? 'audio' : 'image'
    }));
    setMediaFiles(prev => [...prev, ...newMedia]);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: 'audio/webm' });
          setMediaFiles(prev => [...prev, { file, url: URL.createObjectURL(audioBlob), type: 'audio' }]);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      } catch (err) {
        alert("Microphone access denied or unavailable.");
      }
    }
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Please enter a Snap Title');
    if (!content.trim() && mediaFiles.length === 0) return alert('Please add content or media');
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('courseName', courseName || 'General');
    formData.append('content', content);

    mediaFiles.forEach((m) => {
      formData.append('files', m.file);
    });

    await onSave(formData);

    // Reset
    setTitle('');
    setContent('');
    setCourseName('');
    setMediaFiles([]);
    setIsSubmitting(false);
    onClose();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden animate-slideUp flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-gray-200 dark:border-[#2C2C2C] flex justify-between items-center bg-gray-50 dark:bg-[#252525]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center"><Book size={16} /></div>
             Create New Snap
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#333] rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Link to Course</label>
            <button onClick={() => setShowCourseDropdown(!showCourseDropdown)} className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-900 dark:text-white rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium">
              <span className="flex items-center gap-2">{courseName ? getCourseIcon(courseName) : <Book size={14}/>} {courseName || 'Select Course...'}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCourseDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCourseDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#252525] border border-gray-100 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto custom-scrollbar">
                 <div onClick={() => { setCourseName('General'); setShowCourseDropdown(false); }} className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-[#333]"><Book size={14} /> General</div>
                 {courses.map(c => (
                   <div key={c._id || c.name} onClick={() => { setCourseName(c.name); setShowCourseDropdown(false); }} className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-[#333] last:border-0">
                     {getCourseIcon(c.name)} {c.name}
                   </div>
                 ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Snap Title <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Whiteboard Notes, OS Assignment" 
              className="w-full bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-900 dark:text-white rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              placeholder="Jot down the details..." 
              className="w-full h-24 bg-gray-50 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#3E3E3E] text-gray-900 dark:text-white rounded-xl p-3 focus:ring-2 focus:ring-brand-blue outline-none transition-all resize-none custom-scrollbar text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Attachments</label>
            
            <div className="flex gap-3 mb-4">
              <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-brand-blue/30 bg-blue-50 dark:bg-brand-blue/10 text-brand-blue font-bold text-sm cursor-pointer hover:bg-brand-blue hover:text-white transition-all">
                <ImageIcon size={18} /> Add Media
                <input type="file" multiple accept="image/*,audio/*,video/mp4" className="hidden" onChange={handleFileChange} />
              </label>
              
              <button 
                onClick={toggleRecording}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-sm transition-all ${
                  isRecording ? 'border-red-500/50 bg-red-500/10 text-red-500 animate-pulse' : 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                }`}
              >
                {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
                {isRecording ? formatTime(recordingTime) : 'Record Voice'}
              </button>
            </div>

            {mediaFiles.length > 0 && (
              <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {mediaFiles.map((m, idx) => (
                  <div key={idx} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#1E1E1E]">
                    {m.type === 'image' ? (
                      <img src={m.url} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500">
                        <Mic size={24} />
                        <span className="text-[9px] font-bold mt-1">Audio</span>
                      </div>
                    )}
                    <button onClick={() => removeMedia(idx)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-lg hover:bg-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-[#2C2C2C] bg-gray-50 dark:bg-[#252525]">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!title.trim())}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isSubmitting || (!title.trim()) ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none' : 'bg-brand-blue text-white hover:bg-blue-600 shadow-blue-500/30'
            }`}
          >
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={18} />}
            {isSubmitting ? 'Saving Snap...' : 'Save to Keynotes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable local icon component for the dropdowns
const ChevronDown = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default AddKeynoteModal;