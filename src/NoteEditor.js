import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Paperclip, X, Book, ArrowLeft, ChevronDown, Copy, Trash2, CheckCircle2, Undo2, Redo2, Loader2, Cloud, Highlighter } from 'lucide-react';
import UCPLogo from './UCPLogo'; 
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; 

const Font = Quill.import('formats/font');
Font.whitelist = ['arial', 'courier-new', 'georgia', 'times-new-roman', 'trebuchet-ms', 'verdana'];
Quill.register(Font, true);

const NoteEditor = ({ courses = [], onBack, initialNote = null, onSave, onDelete }) => {
  const [currentNoteId, setCurrentNoteId] = useState(initialNote?._id || null);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [courseId, setCourseId] = useState(initialNote?.courseId || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [referenceFiles, setReferenceFiles] = useState(initialNote?.referenceFiles || []);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState(initialNote ? 'Saved to cloud' : ''); 
  const [isDirty, setIsDirty] = useState(false);
  const [highlightMenu, setHighlightMenu] = useState({ 
    show: false, top: 0, left: 0, isHighlighted: false, isBold: false, isItalic: false 
  });  

  const noteIdRef = useRef(initialNote?._id || null); // Instant ID tracker prevents duplicate bug
  const quillRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type === 'general');
  const selectedCourse = courses.find(c => (c._id || c.id) === courseId);

  // Undo / Redo Safely
  const handleUndo = () => quillRef.current?.getEditor()?.history.undo();
  const handleRedo = () => quillRef.current?.getEditor()?.history.redo();

  // Highlight Menu Tracking Logic
  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    const handleSelection = (range) => {
      if (range) {
        const formats = quill.getFormat(range);
        if (range.length > 0 || formats.background) {
          const bounds = quill.getBounds(range.index, range.length);
          setHighlightMenu({ 
            show: true, 
            top: bounds.top - 45, 
            left: bounds.left + (bounds.width / 2), 
            isHighlighted: !!formats.background,
            isBold: !!formats.bold,
            isItalic: !!formats.italic
          });
          return;
        }
      }
      setHighlightMenu({ show: false, top: 0, left: 0, isHighlighted: false, isBold: false, isItalic: false });
    };
    
    quill.on('selection-change', handleSelection);
    return () => quill.off('selection-change', handleSelection);
  }, []);

  // 1-Click Smart Highlighter Toggle
  const handleHighlightToggle = (e) => {
    e.preventDefault();
    const quill = quillRef.current?.getEditor();
    const range = quill.getSelection();
    if (!range) return;

    if (highlightMenu.isHighlighted) {
      if (range.length === 0) {
        let start = range.index;
        let end = range.index;
        while (start > 0 && quill.getFormat(start - 1, 1).background) start--;
        while (end < quill.getLength() && quill.getFormat(end, 1).background) end++;
        quill.formatText(start, end - start, 'background', false);
      } else {
        quill.format('background', false); 
      }
    } else {
      quill.format('background', '#ffff00'); 
    }
    setIsDirty(true); setSaveStatus('Unsaved changes');
  };

  // Bulletproof Auto-Save using Ref
  useEffect(() => {
    if (isDirty) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('Saving...');
        
        const activeTitle = title.trim() || 'Untitled Note';
        const activeCourse = courseId || generalCourses[0]?.id || courses[0]?.id || 'general-task';

        const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content, referenceFiles };
        const savedNote = await onSave(noteData, true); 
        
        if (savedNote && savedNote._id) {
          noteIdRef.current = savedNote._id; 
          setCurrentNoteId(savedNote._id);
          if (!courseId) setCourseId(activeCourse);
          if (!title) setTitle(activeTitle);
          setSaveStatus('Saved to cloud');
          setIsDirty(false);
        } else {
          setSaveStatus('Error saving');
        }
      }, 1500);
    }
  }, [content, title, courseId, referenceFiles, isDirty, courses, generalCourses, onSave]);

  useEffect(() => {
    const quill = quillRef.current?.getEditor();
    if (quill) updateCounts(quill.getText());
  }, []);

  const updateCounts = (text) => {
    setCharCount(text.length > 1 ? text.length - 1 : 0);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  };

  const handleEditorChange = (value, delta, source, editor) => {
    setContent(value);
    updateCounts(editor.getText());
    if (source === 'user') {
      setIsDirty(true);
      setSaveStatus('Unsaved changes');
    }
  };

  const handleCopy = () => {
    const text = quillRef.current?.getEditor()?.getText();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsCourseDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const imageHandler = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); 
    input.setAttribute('accept', 'image/*'); 
    input.click();
    
    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData(); 
        formData.append('file', file);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:5000/api/upload', { 
            method: 'POST', 
            headers: { 'x-auth-token': token },
            body: formData 
          });
          
          const data = await response.json();
          if (response.ok && data.url) {
            const quill = quillRef.current?.getEditor();
            if (quill) {
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', data.url);
                setIsDirty(true); 
                setSaveStatus('Unsaved changes');
            }
          } else {
            console.error("Server rejected image:", data);
          }
        } catch (error) { 
          console.error('Image upload failed', error); 
        }
      }
    };
  };

  const modules = useMemo(() => ({
  syntax: {
    hljs: hljs    
  },
  toolbar: {
    container: '#custom-toolbar',
    handlers: { image: imageHandler }
  },
  history: {
    delay: 200,
    maxStack: 500,
    userOnly: true
  }
}), []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData(); 
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token'); 
      const response = await fetch('http://localhost:5000/api/upload', { 
        method: 'POST', 
        headers: { 'x-auth-token': token },
        body: formData 
      });
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        const nameToSave = data.fileName || file.name; 
        setReferenceFiles(prev => [...prev, { fileName: nameToSave, fileUrl: data.url }]);
        setIsDirty(true); 
        setSaveStatus('Unsaved changes');
      } else {
        console.error("Server rejected upload:", data);
        alert("Upload failed. Check console for details.");
      }
    } catch (error) { 
      console.error('File upload failed', error); 
    }
  };

  const removeFile = (indexToRemove) => {
    setReferenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setIsDirty(true); setSaveStatus('Unsaved changes');
  };

  const handleManualSave = async () => {
    setSaveStatus('Saving...');
    const activeTitle = title.trim() || 'Untitled Note';
    const activeCourse = courseId || generalCourses[0]?.id || courses[0]?.id || 'general-task';
    const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content, referenceFiles };
    await onSave(noteData, false); 
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#121212] overflow-hidden relative">
      
      <style>{`
      /* QUILL CODE BLOCK LANGUAGE DROPDOWN THEME FIX */
        .quill-wrapper .ql-editor .ql-ui {
          background-color: #f9fafb !important;
          color: #374151 !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 4px !important;
          padding: 2px 4px !important;
          font-family: 'Courier New', Courier, monospace !important;
          font-size: 12px !important;
        }
        
        .dark .quill-wrapper .ql-editor .ql-ui {
          background-color: #1A1A1A !important;
          color: #abb2bf !important;
          border-color: #444 !important;
          color-scheme: dark; 
        }
        .ql-font span[data-value="arial"]::before { content: "Arial" !important; }
        .ql-font span[data-value="courier-new"]::before { content: "Courier New" !important; }
        .ql-font span[data-value="georgia"]::before { content: "Georgia" !important; }
        .ql-font span[data-value="times-new-roman"]::before { content: "Times New Roman" !important; }
        .ql-font span[data-value="trebuchet-ms"]::before { content: "Trebuchet MS" !important; }
        .ql-font span[data-value="verdana"]::before { content: "Verdana" !important; }

        /* DARK MODE MENUS UI */
        .dark .ql-picker-options { background-color: #1A1A1A !important; border-color: #333 !important; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important; border-radius: 8px !important; padding: 4px 0 !important; }
        .dark .ql-picker-item { color: #d1d5db !important; padding: 6px 12px !important; transition: all 0.2s; }
        .dark .ql-picker-item:hover, .dark .ql-picker-item.ql-selected { background-color: #2C2C2C !important; color: #3b82f6 !important; }
        .dark .ql-picker-label { color: #d1d5db !important; }
        .dark .ql-snow .ql-picker.ql-expanded .ql-picker-label { border-color: #333 !important; color: #fff !important; }
        .dark .ql-snow .ql-picker-label::before { color: #d1d5db !important; }
        .dark .ql-snow .ql-stroke { stroke: #d1d5db !important; }
        .dark .ql-snow .ql-fill, .dark .ql-snow .ql-stroke.ql-fill { fill: #d1d5db !important; }
        
        /* DYNAMIC THEMED HIGHLIGHTER */
        .dark .quill-wrapper .ql-editor [style*="background-color: rgb(255, 255, 0)"],
        .dark .quill-wrapper .ql-editor [style*="background-color: #ffff00"] {
           background-color: rgba(234, 179, 8, 0.25) !important; 
           color: #fde047 !important; 
           border-radius: 4px;
           padding: 0 2px;
        }

        .quill-wrapper .ql-container { border: none !important; font-size: 1.05rem; background: transparent; }
        .quill-wrapper .ql-editor { padding: 32px 48px !important; min-height: calc(100vh - 200px); color: #111827; }
        .dark .quill-wrapper .ql-editor { color: #e5e7eb; }
        .quill-wrapper .ql-editor.ql-blank::before { color: #9ca3af !important; font-style: italic; left: 48px; }
        
        .quill-wrapper .ql-editor img { max-width: 100%; border-radius: 8px; cursor: pointer; }

        .quill-wrapper .ql-editor pre.ql-syntax {
          background-color: #282c34 !important; 
          color: #abb2bf !important;
          border-radius: 8px;
          padding: 16px;
          font-family: 'Courier New', Courier, monospace;
        }

        #custom-toolbar {
          border: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 8px 24px !important; background-color: #f9fafb;
          display: flex; flex-wrap: wrap; gap: 4px; align-items: center; position: sticky; top: 0; z-index: 40;
        }
        .dark #custom-toolbar { border-bottom-color: #2C2C2C !important; background-color: #1A1A1A; }
        #custom-toolbar button, #custom-toolbar .ql-picker { border-radius: 6px; transition: all 0.2s; }
        #custom-toolbar button:hover, #custom-toolbar .ql-picker:hover { background-color: #e5e7eb; }
        .dark #custom-toolbar button:hover, .dark #custom-toolbar .ql-picker:hover { background-color: #333; }
        .toolbar-divider { width: 1px; height: 20px; background-color: #d1d5db; margin: 0 8px; }
        .dark .toolbar-divider { background-color: #444; }
      `}</style>
        
      {/* HEADER SECTION WITH AUTO-SAVE STATUS */}
      <div className="bg-white dark:bg-[#121212] px-6 py-3 border-b border-gray-200 dark:border-[#2C2C2C] z-50 shrink-0 flex items-center gap-4 shadow-sm">
        <button onClick={onBack} className="flex items-center justify-center p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 flex items-center gap-4">
          <input 
            type="text" placeholder="Untitled Note..." 
            className="w-full max-w-[400px] text-2xl font-black bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-[#444] outline-none transition-colors tracking-tight" 
            value={title} 
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); setSaveStatus('Unsaved changes'); }} 
          />
          
          {saveStatus && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              saveStatus === 'Saving...' ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' :
              saveStatus === 'Saved to cloud' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' :
              saveStatus === 'Error saving' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' :
              'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-[#252525]'
            }`}>
              {saveStatus === 'Saving...' && <Loader2 size={12} className="animate-spin" />}
              {saveStatus === 'Saved to cloud' && <Cloud size={12} />}
              {saveStatus === 'Unsaved changes' && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
              {saveStatus}
            </div>
          )}
        </div>
        
        <div className="relative group shrink-0" ref={dropdownRef}>
          <button 
            onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] hover:border-blue-500 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-lg transition-all"
          >
            {selectedCourse ? (
              <>{selectedCourse.type === 'uni' ? <UCPLogo className="w-4 h-4 min-w-[16px] shrink-0" /> : <Book size={16} className="text-gray-400 shrink-0" />}{selectedCourse.name}</>
            ) : (
              <><Book size={16} className="text-gray-400 shrink-0" /> Link Course</>
            )}
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCourseDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden animate-slideUp">
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {uniCourses.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase bg-gray-50 dark:bg-[#252525]">University Courses</div>
                    {uniCourses.map(c => (
                      <button key={c._id || c.id} onClick={() => { setCourseId(c._id || c.id); setIsCourseDropdownOpen(false); setIsDirty(true); setSaveStatus('Unsaved changes'); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-[#2C2C2C] last:border-0 group">
                        <UCPLogo className="w-4 h-4 min-w-[16px] shrink-0" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-blue">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {generalCourses.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase bg-gray-50 dark:bg-[#252525]">General / Manual</div>
                    {generalCourses.map(c => (
                      <button key={c._id || c.id} onClick={() => { setCourseId(c._id || c.id); setIsCourseDropdownOpen(false); setIsDirty(true); setSaveStatus('Unsaved changes'); }} className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-[#2C2C2C] last:border-0 group">
                        <Book size={14} className="text-gray-400 shrink-0 group-hover:text-brand-blue" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-brand-blue">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div id="custom-toolbar" className="ql-toolbar ql-snow">
        <div role="button" onClick={handleUndo} className="flex items-center justify-center p-1 cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] rounded" title="Undo"><Undo2 size={16}/></div>
        <div role="button" onClick={handleRedo} className="flex items-center justify-center p-1 cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] rounded" title="Redo"><Redo2 size={16}/></div>
        <div className="toolbar-divider"></div>

        <select className="ql-font w-28 text-sm" defaultValue="arial">
          <option value="arial">Arial</option>
          <option value="courier-new">Courier New</option>
          <option value="georgia">Georgia</option>
          <option value="times-new-roman">Times New</option>
          <option value="trebuchet-ms">Trebuchet</option>
          <option value="verdana">Verdana</option>
        </select>
        <div className="toolbar-divider"></div>

        <select className="ql-header w-24 text-sm" defaultValue="">
          <option value="">Normal</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <button className="ql-list" value="ordered"></button>
        <button className="ql-list" value="bullet"></button>
        <button className="ql-list" value="check"></button>
        <button className="ql-blockquote"></button>
        <button className="ql-code-block"></button>
        <div className="toolbar-divider"></div>

        <select className="ql-size w-20 text-sm" defaultValue="">
          <option value="small">Small</option>
          <option value="">Normal</option>
          <option value="large">Large</option>
          <option value="huge">Huge</option>
        </select>
        <div className="toolbar-divider"></div>

        <button className="ql-bold"></button>
        <button className="ql-italic"></button>
        <button className="ql-underline"></button>
        <button className="ql-strike"></button>
        <div className="toolbar-divider"></div>

        <select className="ql-align">
          <option defaultValue></option>
          <option value="center"></option>
          <option value="right"></option>
          <option value="justify"></option>
        </select>
        <button className="ql-indent" value="-1"></button>
        <button className="ql-indent" value="+1"></button>
        <div className="toolbar-divider"></div>

        <select className="ql-color"></select>
        <select className="ql-background"></select>
        <button className="ql-link"></button>
        <button className="ql-image"></button>
        <button className="ql-video"></button>
        <button className="ql-clean"></button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar quill-wrapper relative z-10 flex flex-col">
        
        {/* THE NEW ADVANCED FLOATING MENU */}
        {highlightMenu.show && (
          <div 
            className="absolute z-[100] transform -translate-x-1/2 bg-white dark:bg-[#2C2C2C] shadow-lg rounded-lg border border-gray-200 dark:border-[#444] p-1 flex items-center gap-1 animate-slideUp"
            style={{ top: highlightMenu.top, left: highlightMenu.left }}
          >
            <button 
              onMouseDown={(e) => { e.preventDefault(); quillRef.current.getEditor().format('bold', !highlightMenu.isBold); }} 
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${highlightMenu.isBold ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}
            >
              B
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); quillRef.current.getEditor().format('italic', !highlightMenu.isItalic); }} 
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm italic font-serif transition-colors ${highlightMenu.isItalic ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}
            >
              I
            </button>
            
            <div className="w-px h-5 bg-gray-300 dark:bg-[#555] mx-1"></div>
            
            <button 
              onMouseDown={handleHighlightToggle} 
              className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors ${highlightMenu.isHighlighted ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-[#333]'}`}
            >
              <Highlighter size={14}/> {highlightMenu.isHighlighted ? 'Remove' : 'Highlight'}
            </button>
          </div>
        )}

        <ReactQuill 
          ref={quillRef} 
          theme="snow" 
          value={content} 
          onChange={handleEditorChange} 
          modules={modules} 
          placeholder="Start typing your brilliance here..." 
        />
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] border-t border-gray-200 dark:border-[#333] px-6 py-3 z-40 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="text-gray-900 dark:text-gray-200 font-bold">{wordCount}</span> words &nbsp;|&nbsp; <span className="text-gray-900 dark:text-gray-200 font-bold">{charCount}</span> chars
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-[#444]"></div>
            <button onClick={handleCopy} className={`flex items-center gap-1 text-xs font-bold transition-all ${copied ? 'text-green-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              {copied ? <><CheckCircle2 size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
            </button>
            {initialNote && onDelete && (
              <button onClick={() => onDelete(initialNote)} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors ml-2">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar max-w-[300px]">
              {referenceFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-full text-xs shrink-0">
                  <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noopener noreferrer" className="truncate max-w-[100px] text-brand-blue font-medium hover:underline">
  {file.fileName}
</a>
                  <button onClick={() => removeFile(index)} className="text-blue-400 hover:text-red-500"><X size={12} strokeWidth={3} /></button>
                </div>
              ))}
            </div>

            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#2C2C2C] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-all text-xs font-bold shrink-0">
              <Paperclip size={14} /> Attach
            </button>

            <button onClick={handleManualSave} disabled={saveStatus === 'Saving...'} className="flex items-center gap-1.5 bg-brand-blue hover:bg-blue-600 disabled:bg-blue-400 text-white font-bold py-2 px-5 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 text-sm">
              <CheckCircle2 size={16} /> Finish & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;