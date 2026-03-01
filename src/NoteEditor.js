import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

// Syntax Highlighting Imports
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css'; 

import { Paperclip, X, Book, ArrowLeft, ChevronDown, Copy, Trash2, CheckCircle2, Undo2, Redo2, Loader2, Cloud, Highlighter, Bold, Italic, Image as ImageIcon, Code, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const lowlight = createLowlight(common);

// ==========================================
// RESIZEOBSERVER ERROR KILLER
// ==========================================
if (typeof window !== 'undefined') {
  const _ResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => {
          try { callback(entries, observer); } catch (e) {}
        });
      });
    }
  };
  
  window.addEventListener('error', e => {
    if (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      const errOverlay = document.getElementById('webpack-dev-server-client-overlay');
      if (errOverlay) errOverlay.style.display = 'none';
      e.stopImmediatePropagation();
    }
  });
}
// ==========================================

// ==========================================
// 1. THE CUSTOM CODE BLOCK 
// ==========================================
const InteractiveCodeBlock = ({ node, updateAttributes, extension, deleteNode }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="relative group my-6">
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 flex items-center gap-2 z-10 transition-opacity duration-200">
        <button 
          onClick={handleCopy} 
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1e2227] hover:bg-[#3e4451] text-gray-300 hover:text-white rounded-md transition-colors text-xs font-bold font-sans border border-[#3e4451]"
        >
          {copied ? <CheckCircle2 size={14} className="text-green-400"/> : <Copy size={14} />} {copied ? 'Copied!' : 'Copy'}
        </button>
        <button 
          onClick={deleteNode} 
          className="flex items-center justify-center p-1.5 bg-[#1e2227] hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors border border-[#3e4451] hover:border-red-500/50"
          title="Delete Code Block"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <pre className="!m-0 rounded-xl bg-[#282c34] p-5 pt-12 shadow-sm font-mono text-sm border border-gray-200 dark:border-[#333]">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

const CustomCodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(InteractiveCodeBlock);
  },
});

// ==========================================
// 2. THE CUSTOM IMAGE BLOCK (PERFECT CAPTION ALIGNMENT)
// ==========================================
const InteractiveImageNode = ({ node, updateAttributes, selected, deleteNode }) => {
  const { src, caption, width, textAlign } = node.attrs;
  const imgRef = useRef(null);

  const currentAlign = textAlign || 'center';
  const alignClass = currentAlign === 'center' ? 'items-center' : currentAlign === 'right' ? 'items-end' : 'items-start';

  const handleDragStart = (e, direction) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = imgRef.current.offsetWidth;

    const onMouseMove = (moveEvent) => {
      const currentX = moveEvent.clientX;
      let newWidth;
      
      if (direction === 'right') newWidth = startWidth + (currentX - startX);
      else newWidth = startWidth - (currentX - startX);

      if (newWidth > 150) updateAttributes({ width: `${newWidth}px` });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className={`flex flex-col group relative max-w-full my-6 ${alignClass}`}>
      {/* Container locks exactly to the image's width, forcing the caption to center under it */}
      <div className="flex flex-col" style={{ width: width }}>
        <div className={`relative inline-block ${selected ? 'border-[3px] border-blue-500' : 'border-[3px] border-transparent'}`}>
          <img ref={imgRef} src={src} alt="Note attachment" className="w-full h-auto cursor-pointer" />

          {selected && (
            <>
              <div onMouseDown={(e) => handleDragStart(e, 'left')} className="absolute -left-2 -top-2 w-3 h-3 bg-blue-500 border border-white cursor-nwse-resize z-20"></div>
              <div onMouseDown={(e) => handleDragStart(e, 'right')} className="absolute -right-2 -top-2 w-3 h-3 bg-blue-500 border border-white cursor-nesw-resize z-20"></div>
              <div onMouseDown={(e) => handleDragStart(e, 'left')} className="absolute -left-2 -bottom-2 w-3 h-3 bg-blue-500 border border-white cursor-nesw-resize z-20"></div>
              <div onMouseDown={(e) => handleDragStart(e, 'right')} className="absolute -right-2 -bottom-2 w-3 h-3 bg-blue-500 border border-white cursor-nwse-resize z-20"></div>
            </>
          )}
        </div>
        
        <input
          type="text"
          className="w-full mt-2 bg-transparent border-none outline-none text-sm text-center text-gray-500 dark:text-gray-400 font-medium placeholder-gray-300 dark:placeholder-[#555] transition-all focus:text-gray-900 dark:focus:text-gray-200"
          placeholder="Write a caption..."
          value={caption}
          onChange={e => updateAttributes({ caption: e.target.value })}
        />
      </div>
    </NodeViewWrapper>
  );
};

const CustomImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: '' },
      width: { default: '100%' }, 
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(InteractiveImageNode);
  },
});
// ==========================================

const NoteEditor = ({ courses = [], onBack, initialNote = null, onSave, onDelete }) => {
  const [currentNoteId, setCurrentNoteId] = useState(initialNote?._id || null);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [courseId, setCourseId] = useState(initialNote?.courseId || '');
  const [referenceFiles, setReferenceFiles] = useState(initialNote?.referenceFiles || []);
  
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isAlignDropdownOpen, setIsAlignDropdownOpen] = useState(false); 
  const [isHeadingDropdownOpen, setIsHeadingDropdownOpen] = useState(false); 
  
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState(initialNote ? 'Saved to cloud' : ''); 
  const [isDirty, setIsDirty] = useState(false);

  const noteIdRef = useRef(initialNote?._id || null);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const alignDropdownRef = useRef(null);
  const headingDropdownRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const bubbleMenuRef = useRef(null); 

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type === 'general');
  const selectedCourse = courses.find(c => (c._id || c.id) === courseId);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsCourseDropdownOpen(false);
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(event.target)) setIsAlignDropdownOpen(false);
      if (headingDropdownRef.current && !headingDropdownRef.current.contains(event.target)) setIsHeadingDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CustomCodeBlockExtension.configure({ lowlight }),
      CustomImageExtension,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }), 
      Placeholder.configure({ placeholder: 'Start typing your brilliance here...' }),
    ],
    content: initialNote?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-250px)] px-8 py-6',
      },
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            uploadImageToBackend(file);
            return true; 
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      setIsDirty(true);
      setSaveStatus('Unsaved changes');
      const text = editor.getText();
      setCharCount(text.length);
      setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
    },
  });

  // Highlight Toggle Logic (Removes entirely on click)
  const toggleHighlight = () => {
    if (editor.isActive('highlight')) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: '#fef08a' }).run();
    }
  };

  // Vanilla JS Floating Menu Logic
  useEffect(() => {
    const updateMenu = () => {
      if (!editor || !bubbleMenuRef.current) return;
      
      const { view, state } = editor;
      const { selection } = state;
      const isHighlighted = editor.isActive('highlight');
      const hasSelection = !selection.empty;

      if ((hasSelection || isHighlighted) && !editor.isActive('image')) {
        try {
          const start = view.coordsAtPos(selection.from);
          const end = view.coordsAtPos(selection.to);
          
          const menu = bubbleMenuRef.current;
          menu.style.display = 'flex';
          
          // SMART POSITIONING: Drops below text if too close to toolbar
          let topPos = start.top - 45;
          if (start.top < 120) topPos = start.bottom + 10; 
          
          menu.style.top = `${topPos}px`;
          menu.style.left = `${start.left + (end.left - start.left) / 2}px`;
          menu.style.transform = 'translateX(-50%)';
        } catch (e) {
          bubbleMenuRef.current.style.display = 'none';
        }
      } else {
        bubbleMenuRef.current.style.display = 'none';
      }
    };

    if (editor) {
      editor.on('selectionUpdate', updateMenu);
      editor.on('transaction', updateMenu);
      document.addEventListener('scroll', updateMenu, true);
    }

    return () => {
      if (editor) {
        editor.off('selectionUpdate', updateMenu);
        editor.off('transaction', updateMenu);
      }
      document.removeEventListener('scroll', updateMenu, true);
    };
  }, [editor]);

  const uploadImageToBackend = async (file) => {
    setSaveStatus('Uploading image...');
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
      if (response.ok && data.url && editor) {
        editor.chain().focus().setImage({ src: data.url, width: '100%' }).setTextAlign('center').run();
        setIsDirty(true);
        setSaveStatus('Unsaved changes');
      } else {
        setSaveStatus('Error saving');
      }
    } catch (error) {
      setSaveStatus('Error saving');
    }
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); 
    input.setAttribute('accept', 'image/*'); 
    input.click();
    input.onchange = () => {
      if (input.files[0]) uploadImageToBackend(input.files[0]);
    };
  };

  useEffect(() => {
    if (isDirty && editor) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('Saving...');
        const activeTitle = title.trim() || 'Untitled Note';
        const activeCourse = courseId || generalCourses[0]?.id || courses[0]?.id || 'general-task';
        const contentHtml = editor.getHTML(); 

        const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content: contentHtml, referenceFiles };
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
  }, [editor?.getHTML(), title, courseId, referenceFiles, isDirty, courses, generalCourses, onSave]);

  const handleCopy = () => {
    if (editor) {
      navigator.clipboard.writeText(editor.getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData(); 
    formData.append('file', file);
    try {
      const token = localStorage.getItem('token'); 
      const response = await fetch('http://localhost:5000/api/upload', { 
        method: 'POST', headers: { 'x-auth-token': token }, body: formData 
      });
      const data = await response.json();
      if (response.ok && data.url) {
        setReferenceFiles(prev => [...prev, { fileName: data.fileName || file.name, fileUrl: data.url }]);
        setIsDirty(true); setSaveStatus('Unsaved changes');
      }
    } catch (error) { console.error('Upload failed', error); }
  };

  const removeFile = (indexToRemove) => {
    setReferenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setIsDirty(true); 
    setSaveStatus('Unsaved changes');
  };

  const handleManualSave = async () => {
    setSaveStatus('Saving...');
    const activeTitle = title.trim() || 'Untitled Note';
    const activeCourse = courseId || generalCourses[0]?.id || courses[0]?.id || 'general-task';
    const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content: editor.getHTML(), referenceFiles };
    await onSave(noteData, false); 
  };

  const getCurrentHeadingLabel = () => {
    if (!editor) return 'Normal Text';
    if (editor.isActive('heading', { level: 1 })) return 'Large Title';
    if (editor.isActive('heading', { level: 2 })) return 'Medium Title';
    if (editor.isActive('heading', { level: 3 })) return 'Small Title';
    return 'Normal Text';
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-[#121212] overflow-hidden relative">
      <style>{`
        /* WORKING TEXT SIZES & HEADINGS FIX */
        .ProseMirror h1 { font-size: 2.25rem !important; font-weight: 800 !important; line-height: 1.2 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror h2 { font-size: 1.875rem !important; font-weight: 700 !important; line-height: 1.3 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror h3 { font-size: 1.5rem !important; font-weight: 600 !important; line-height: 1.4 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror p { font-size: 1rem !important; line-height: 1.6 !important; }

        .dark .ProseMirror { color: #e5e7eb !important; }
        .dark .ProseMirror p { color: #e5e7eb !important; }
        .dark .ProseMirror h1, .dark .ProseMirror h2, .dark .ProseMirror h3 { color: #ffffff !important; }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }

        .ProseMirror mark {
          background-color: #fef08a !important; 
          color: #111827 !important; 
          border-radius: 4px;
          padding: 0 2px;
        }
        .dark .ProseMirror mark {
          background-color: rgba(234, 179, 8, 0.3) !important; 
          color: #fde047 !important; 
        }
        
        .ProseMirror pre {
          background-color: #282c34 !important;
          color: #abb2bf !important;
        }
        .ProseMirror pre code {
          color: inherit !important; 
        }

        .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          color: #6b7280;
          font-style: italic;
        }
        .dark .ProseMirror blockquote { border-left-color: #444; color: #9ca3af; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; }
        
        #custom-toolbar {
          border-bottom: 1px solid #e5e7eb !important; padding: 8px 24px !important; background-color: #f9fafb;
          display: flex; flex-wrap: wrap; gap: 4px; align-items: center; position: sticky; top: 0; z-index: 40;
        }
        .dark #custom-toolbar { border-bottom-color: #2C2C2C !important; background-color: #1A1A1A; }
        .toolbar-btn {
          padding: 6px; border-radius: 6px; transition: all 0.2s; color: #4b5563; display: flex; align-items: center; justify-content: center;
        }
        .toolbar-btn:hover { background-color: #e5e7eb; color: #111827; }
        .toolbar-btn.active { background-color: #dbeafe; color: #2563eb; }
        .dark .toolbar-btn { color: #d1d5db; }
        .dark .toolbar-btn:hover { background-color: #333; color: #fff; }
        .dark .toolbar-btn.active { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .toolbar-divider { width: 1px; height: 20px; background-color: #d1d5db; margin: 0 8px; }
        .dark .toolbar-divider { background-color: #444; }
      `}</style>
        
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
            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-2xl z-[100] overflow-hidden animate-slideUp">
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

      {editor && (
        <div id="custom-toolbar">
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="toolbar-btn"><Undo2 size={16}/></button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="toolbar-btn"><Redo2 size={16}/></button>
          <div className="toolbar-divider"></div>

          <button onClick={() => editor.chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}><Bold size={16}/></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}><Italic size={16}/></button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}><span className="font-serif font-bold underline">U</span></button>
          <button onClick={toggleHighlight} className={`toolbar-btn ${editor.isActive('highlight') ? 'active text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : ''}`}><Highlighter size={16}/></button>
          <div className="toolbar-divider"></div>

          {/* SIZES AND FORMAT DROPDOWN */}
          <div className="relative" ref={headingDropdownRef}>
            <button 
              onClick={() => setIsHeadingDropdownOpen(!isHeadingDropdownOpen)}
              className="toolbar-btn flex items-center gap-2 px-3 py-1.5 min-w-[130px] justify-between"
            >
              <span className="text-sm font-bold">{getCurrentHeadingLabel()}</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            {isHeadingDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[100] py-1 min-w-[160px] animate-slideUp">
                <button onClick={() => { editor.chain().focus().setParagraph().run(); setIsHeadingDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive('paragraph') ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}>Normal text</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setIsHeadingDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-xl font-black hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-brand-blue' : 'text-gray-900 dark:text-white'}`}>Large Title</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setIsHeadingDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-lg font-bold hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-brand-blue' : 'text-gray-800 dark:text-gray-100'}`}>Medium Title</button>
                <button onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setIsHeadingDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-base font-semibold hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive('heading', { level: 3 }) ? 'text-brand-blue' : 'text-gray-700 dark:text-gray-200'}`}>Small Title</button>
              </div>
            )}
          </div>
          <div className="toolbar-divider"></div>

          <div className="relative" ref={alignDropdownRef}>
            <button 
              onClick={() => setIsAlignDropdownOpen(!isAlignDropdownOpen)} 
              className={`toolbar-btn flex items-center gap-1.5 px-3 py-1.5 ${editor.isActive({ textAlign: 'left' }) || editor.isActive({ textAlign: 'center' }) || editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            >
              {editor.isActive({ textAlign: 'center' }) ? <AlignCenter size={16}/> : editor.isActive({ textAlign: 'right' }) ? <AlignRight size={16}/> : <AlignLeft size={16}/>}
              <span className="text-sm font-medium hidden sm:block">Align</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            {isAlignDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[100] py-1 min-w-[140px] animate-slideUp">
                <button onClick={() => { editor.chain().focus().setTextAlign('left').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                  <AlignLeft size={14}/> Left Align
                </button>
                <button onClick={() => { editor.chain().focus().setTextAlign('center').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                  <AlignCenter size={14}/> Center Align
                </button>
                <button onClick={() => { editor.chain().focus().setTextAlign('right').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                  <AlignRight size={14}/> Right Align
                </button>
              </div>
            )}
          </div>
          <div className="toolbar-divider"></div>

          <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}><List size={16}/></button>
          <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}><ListOrdered size={16}/></button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}><Quote size={16}/></button>
          <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}><Code size={16}/></button>
          <div className="toolbar-divider"></div>

          <button onClick={imageHandler} className="toolbar-btn"><ImageIcon size={16}/></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
        <EditorContent editor={editor} />
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

      {/* FIXED BUBBLE MENU - PLACED AT THE ROOT TO PREVENT BEING TRAPPED */}
      <div 
        ref={bubbleMenuRef}
        className="fixed z-[9999] hidden items-center gap-1 bg-white dark:bg-[#2C2C2C] shadow-xl rounded-lg border border-gray-200 dark:border-[#444] p-1.5 transition-opacity"
        style={{ display: 'none' }}
      >
        {editor && (
          <>
            <button 
              onClick={() => editor.chain().focus().toggleBold().run()} 
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}
            >B</button>
            <button 
              onClick={() => editor.chain().focus().toggleItalic().run()} 
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm italic font-serif transition-colors ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}
            >I</button>
            <div className="w-px h-5 bg-gray-300 dark:bg-[#555] mx-1"></div>
            
            <button 
              onClick={toggleHighlight} 
              className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors ${editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-[#333]'}`}
            >
              <Highlighter size={14}/> {editor.isActive('highlight') ? 'Remove' : 'Highlight'}
            </button>
          </>
        )}
      </div>

    </div>
  );
};

export default NoteEditor;