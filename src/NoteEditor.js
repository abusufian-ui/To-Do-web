import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Node, mergeAttributes } from '@tiptap/core';
import Editor from '@monaco-editor/react';
import { ToastConfig } from './CustomToast';

// New Extensions
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import SuperscriptExtension from '@tiptap/extension-superscript';
import SubscriptExtension from '@tiptap/extension-subscript';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { 
  Paperclip, X, Book, ArrowLeft, ChevronDown, Copy, Trash2, CheckCircle2, 
  Undo2, Redo2, Loader2, Cloud, Highlighter, Bold, Italic, Image as ImageIcon, 
  Code, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, Maximize2, Minimize2,
  CheckSquare, Terminal, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Sigma, FileCode, Send, Globe, Lock, Strikethrough
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 
import katex from 'katex';
import 'katex/dist/katex.min.css'; 

const lowlight = createLowlight(all);
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

const InteractiveMonacoBlock = ({ node, updateAttributes, deleteNode, editor }) => {
  const isEditable = editor.isEditable;
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState('vs-light');
  const [contentHeight, setContentHeight] = useState(250);
  
  const dropdownRef = useRef(null);

  const languages = [
    { id: 'javascript', label: 'JavaScript / React' },
    { id: 'python', label: 'Python' },
    { id: 'cpp', label: 'C++' },
    { id: 'c', label: 'C' },
    { id: 'csharp', label: 'C#' },
    { id: 'html', label: 'HTML' },
    { id: 'css', label: 'CSS' }
  ];

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setEditorTheme(isDark ? 'aesthetic-dark' : 'light');
    };
    updateTheme(); 
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsLangDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(node.attrs.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('aesthetic-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c678dd' },     
        { token: 'string', foreground: '98c379' },      
        { token: 'variable', foreground: 'e06c75' },    
        { token: 'function', foreground: '61afef' },    
        { token: 'comment', foreground: '7f848e', fontStyle: 'italic' },
      ],
      colors: { 'editor.background': '#1A1A1A', 'editor.lineHighlightBackground': '#2C2C2C' }
    });
  };

  const handleEditorDidMount = (editorInstance) => {
    const updateHeight = () => setContentHeight(editorInstance.getContentHeight());
    editorInstance.onDidContentSizeChange(updateHeight);
    updateHeight();
  };

  const currentLangLabel = languages.find(l => l.id === node.attrs.language)?.label || 'JavaScript / React';

  return (
    <NodeViewWrapper className="relative group my-6 rounded-xl border border-gray-200 dark:border-[#333] overflow-hidden shadow-sm flex flex-col transition-all duration-300" contentEditable="false">
      <div className="bg-gray-50 dark:bg-[#1A1A1A] flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-[#333]">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => isEditable && setIsLangDropdownOpen(!isLangDropdownOpen)}
            className={`flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-colors text-xs font-bold px-2 py-1 rounded-md ${isEditable ? 'hover:text-brand-blue dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2C2C2C]' : 'cursor-default'}`}
          >
            {currentLangLabel}
            {isEditable && <ChevronDown size={14} className={`transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />}
          </button>

          {isLangDropdownOpen && isEditable && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-50 py-1 animate-slideUp">
              {languages.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => { updateAttributes({ language: lang.id }); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-[#333] ${node.attrs.language === lang.id ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={`text-gray-500 hover:text-brand-blue dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C2C2C] ${isExpanded ? 'bg-blue-100 text-brand-blue dark:bg-blue-900/40 dark:text-blue-400' : ''}`}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />} 
            <span className="hidden sm:block">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
          <div className="w-px h-4 bg-gray-300 dark:bg-[#444] mx-1"></div>
          <button onClick={handleCopy} className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C2C2C]">
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} 
            <span className="hidden sm:block">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {isEditable && (
            <button onClick={deleteNode} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-[#2C2C2C]" title="Delete Block">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div 
        className="w-full bg-white dark:bg-[#1A1A1A] pt-2 transition-all duration-300 ease-in-out" 
        style={{ height: isExpanded ? `${Math.max(250, contentHeight + 30)}px` : '250px' }}
        onKeyDown={e => e.stopPropagation()}
      >
        <Editor
          height="100%"
          language={node.attrs.language}
          theme={editorTheme}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          defaultValue={node.attrs.code}
          onChange={(value) => updateAttributes({ code: value })}
          options={{
            readOnly: !isEditable,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
            scrollBeyondLastLine: false,
            padding: { top: 10, bottom: 10 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            wordWrap: "on",
            scrollbar: { alwaysConsumeMouseWheel: !isExpanded, vertical: isExpanded ? 'hidden' : 'auto' },
            quickSuggestions: isEditable,
            suggestOnTriggerCharacters: isEditable,
            parameterHints: { enabled: isEditable }
          }}
        />
      </div>
    </NodeViewWrapper>
  );
};

const MonacoCodeBlockExtension = Node.create({
  name: 'monacoCodeBlock',
  group: 'block',
  atom: true, 
  addAttributes() { return { language: { default: 'javascript' }, code: { default: '// Start coding with IntelliSense...\n' } }; },
  parseHTML() { return [{ tag: 'div[data-monaco-block]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-monaco-block': '' })]; },
  addNodeView() { return ReactNodeViewRenderer(InteractiveMonacoBlock); },
});

const StaticCodeBlockNode = ({ node, deleteNode, editor }) => {
  const isEditable = editor.isEditable;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(node.textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <NodeViewWrapper className="relative group my-6 rounded-lg bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 bg-[#2D2D2D] border-b border-[#3D3D3D]">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-gray-400" />
          <span className="text-xs font-bold text-gray-300 tracking-wider uppercase">Code Snippet</span>
          {node.attrs.language && (
            <span className="text-[10px] font-extrabold bg-[#3b82f6]/20 text-[#60a5fa] px-2 py-0.5 rounded uppercase tracking-wider border border-[#3b82f6]/30 select-none">
              {node.attrs.language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button contentEditable={false} onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 bg-[#3D3D3D] hover:bg-[#4D4D4D] px-2 py-1 rounded">
            {copied ? <CheckCircle2 size={12} className="text-green-400"/> : <Copy size={12}/>}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {isEditable && (
            <button contentEditable={false} onClick={deleteNode} className="text-gray-400 hover:text-red-500 transition-colors bg-[#3D3D3D] hover:bg-red-900/40 px-2 py-1 rounded" title="Delete Snippet">
              <Trash2 size={12}/>
            </button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-200 m-0 bg-[#1E1E1E]">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

const StaticCodeBlockExtension = CodeBlockLowlight.extend({
  addNodeView() { return ReactNodeViewRenderer(StaticCodeBlockNode); }
}).configure({
  lowlight,
});

const EquationBlockNode = ({ node, updateAttributes, deleteNode, editor }) => {
  const isEditable = editor.isEditable;
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(node.attrs.latex || '');
  const inputRef = useRef(null);

  const align = node.attrs.textAlign || 'center';
  const alignClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  const textClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';

  useEffect(() => {
    setInputValue(node.attrs.latex || '');
  }, [node.attrs.latex]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const cleanLatex = (val) => {
    let cleaned = val.trim();
    if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    } else if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    } else if (cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    } else if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    return cleaned;
  };

  const handleSave = () => {
    const cleaned = cleanLatex(inputValue);
    updateAttributes({ latex: cleaned });
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setInputValue(node.attrs.latex || '');
      setIsEditing(false);
    }
  };

  // Compile LaTeX to HTML
  let renderedHtml = '';
  const latexVal = node.attrs.latex || '';
  if (!latexVal.trim()) {
    renderedHtml = `<span class="text-gray-400 dark:text-gray-600 italic text-sm select-none">Empty equation. Click to edit.</span>`;
  } else {
    try {
      renderedHtml = katex.renderToString(latexVal, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (err) {
      renderedHtml = `<span class="text-red-500 text-xs font-mono break-all select-none">Error: ${err.message}</span>`;
    }
  }

  return (
    <NodeViewWrapper className={`my-6 flex w-full ${alignClass}`}>
      <div 
        onClick={() => isEditable && !isEditing && setIsEditing(true)}
        className={`relative group w-full max-w-2xl bg-gray-50/50 dark:bg-[#1A1A1A]/50 border ${
          isEditing 
            ? 'border-brand-blue dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30' 
            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
        } rounded-lg py-4 px-8 transition-all duration-200 cursor-pointer`}
      >
        {/* Label */}
        <div className="absolute -top-2.5 left-6 bg-white dark:bg-[#121212] px-2 text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 select-none">
          <Sigma size={10} /> Equation
        </div>

        {/* Delete block button for edit mode or hover */}
        {isEditable && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); deleteNode(); }} 
              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors"
              title="Delete Equation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-2 w-full pt-1" onKeyDown={(e) => e.stopPropagation()}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full bg-transparent border-none outline-none font-mono text-sm text-gray-900 dark:text-gray-100 resize-none placeholder-gray-400 dark:placeholder-gray-600"
              placeholder="Type or paste LaTeX here... (e.g. \lnot(P \lor Q) \leftrightarrow (\lnot P \land \lnot Q))"
            />
            <div className="text-[10px] text-gray-400 dark:text-gray-500 select-none flex justify-between items-center">
              <span>Press <kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Enter</kbd> to save, <kbd className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Shift+Enter</kbd> for new line.</span>
              <span>Delimiters like $$ will be stripped.</span>
            </div>
          </div>
        ) : (
          <div 
            className={`w-full overflow-x-auto custom-scrollbar font-serif italic text-xl md:text-2xl text-gray-900 dark:text-gray-100 ${textClass}`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

const EquationExtension = Node.create({
  name: 'equationBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      latex: { default: '\\lnot(P \\lor Q) \\leftrightarrow (\\lnot P \\land \\lnot Q)' },
      textAlign: { default: 'center' }
    };
  },
  parseHTML() {
    return [{
      tag: 'div[data-equation]',
      getAttrs: dom => ({
        latex: dom.getAttribute('data-latex') || dom.textContent || '',
        textAlign: dom.style.textAlign || 'center'
      })
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-equation': '', 'data-latex': HTMLAttributes.latex || '' })];
  },
  addNodeView() { return ReactNodeViewRenderer(EquationBlockNode); }
});

const InteractiveImageNode = ({ node, updateAttributes, selected, editor }) => {
  const isEditable = editor.isEditable;
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
      <div className="flex flex-col" style={{ width: width }}>
        <div className={`relative inline-block ${selected && isEditable ? 'border-[3px] border-blue-500' : 'border-[3px] border-transparent'}`}>
          <img ref={imgRef} src={src} alt="Note attachment" className="w-full h-auto cursor-pointer" />
          {selected && isEditable && (
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
          readOnly={!isEditable}
          className={`w-full mt-2 bg-transparent border-none outline-none text-sm text-center text-gray-500 dark:text-gray-400 font-medium placeholder-gray-300 dark:placeholder-[#555] transition-all focus:text-gray-900 dark:focus:text-gray-200 ${!isEditable ? 'pointer-events-none' : ''}`}
          placeholder={isEditable ? "Write a caption..." : ""}
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
  addNodeView() { return ReactNodeViewRenderer(InteractiveImageNode); },
});

// ==========================================

const NoteEditor = ({ courses = [], onBack, initialNote = null, onSave, onDelete, onShare, readOnly = false, defaultIsPrivate = true }) => {
  const [, setCurrentNoteId] = useState(initialNote?._id || null);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [courseId, setCourseId] = useState(initialNote?.courseId || '');
  const [referenceFiles, setReferenceFiles] = useState(initialNote?.referenceFiles || []);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPrivate, setIsPrivate] = useState(initialNote !== null ? initialNote.isPrivate : defaultIsPrivate);
  
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
    editable: !readOnly,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      MonacoCodeBlockExtension,
      StaticCodeBlockExtension,
      EquationExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      SuperscriptExtension,
      SubscriptExtension,
      CustomImageExtension,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph', 'image', 'equationBlock'] }), 
      Placeholder.configure({ placeholder: readOnly ? '' : 'Start typing your brilliance here...' }),
    ],
    content: initialNote?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[calc(100vh-250px)] px-8 py-6',
      },
      handlePaste: (view, event, slice) => {
        if (readOnly) return false;
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
      if (readOnly) return;
      setIsDirty(true);
      setSaveStatus('Unsaved changes');
      const text = editor.getText();
      setCharCount(text.length);
      setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
    },
  });

  const toggleHighlight = () => {
    if (editor.isActive('highlight')) {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: '#fef08a' }).run();
    }
  };

  useEffect(() => {
    const updateMenu = () => {
      if (!editor || !bubbleMenuRef.current || readOnly) {
        if (bubbleMenuRef.current) bubbleMenuRef.current.style.display = 'none';
        return;
      }
      
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

    if (editor && !readOnly) {
      editor.on('selectionUpdate', updateMenu);
      editor.on('transaction', updateMenu);
      document.addEventListener('scroll', updateMenu, true);
    }

    return () => {
      if (editor && !readOnly) {
        editor.off('selectionUpdate', updateMenu);
        editor.off('transaction', updateMenu);
      }
      document.removeEventListener('scroll', updateMenu, true);
    };
  }, [editor, readOnly]);

  const uploadImageToBackend = async (file) => {
    if (readOnly) return;
    setSaveStatus('Uploading image...');
    const formData = new FormData();
    formData.append('files', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });
      
      const data = await response.json();
      if (response.ok && data.urls && data.urls.length > 0 && editor) {
        editor.chain().focus().setImage({ src: data.urls[0], width: '100%' }).setTextAlign('center').run();
        setIsDirty(true);
        setSaveStatus('Saved');
        ToastConfig.show({ title: "Success", message: "Image uploaded and inserted.", type: "success" });
      } else {
        ToastConfig.show({ title: "Error", message: "Image upload failed.", type: "error" });
        setSaveStatus('Saved');
      }
    } catch (error) {
      ToastConfig.show({ title: "Error", message: "Network error uploading image.", type: "error" });
      setSaveStatus('Saved');
    }
  };

  const imageHandler = () => {
    if (readOnly) return;
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); 
    input.setAttribute('accept', 'image/*'); 
    input.click();
    input.onchange = () => {
      if (input.files[0]) uploadImageToBackend(input.files[0]);
    };
  };

  // Keep latest props and state in refs to avoid resetting the timeout
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const coursesRef = useRef(courses);
  useEffect(() => {
    coursesRef.current = courses;
  }, [courses]);

  const editorHTML = editor ? editor.getHTML() : '';

  useEffect(() => {
    if (!readOnly && isDirty && editor) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      
      autoSaveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('Saving...');
        const activeTitle = title.trim() || 'Untitled Note';
        const latestCourses = coursesRef.current;
        const latestGeneralCourses = latestCourses.filter(c => c.type === 'general');
        const activeCourse = courseId || latestGeneralCourses[0]?.id || latestCourses[0]?.id || 'general-task';
        const contentHtml = editorHTML; 

        const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content: contentHtml, referenceFiles, isPrivate };
        const savedNote = await onSaveRef.current(noteData, true); 
        
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
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [editor, editorHTML, title, courseId, referenceFiles, isPrivate, isDirty, readOnly]);

  const handleCopyText = () => {
    if (editor) {
      navigator.clipboard.writeText(editor.getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileUpload = async (e) => {
    if (readOnly) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setIsUploadingFile(true); 
    setSaveStatus(`Uploading ${files.length} attachment(s)...`);
    
    const formData = new FormData(); 
    files.forEach(file => formData.append('files', file));
    
    try {
      const token = localStorage.getItem('token'); 
      const response = await fetch(`${API_BASE}/api/upload`, { 
        method: 'POST', headers: { 'x-auth-token': token }, body: formData 
      });
      const data = await response.json();
      
      if (response.ok && data.urls && data.urls.length > 0) {
        const newAttachments = files.map((file, index) => ({
          fileName: file.name,
          fileUrl: data.urls[index]
        }));
        
        setReferenceFiles(prev => [...prev, ...newAttachments]);
        setIsDirty(true); 
        ToastConfig.show({ title: "Success", message: `${files.length} attachment(s) uploaded.`, type: "success" });
        setSaveStatus('Saved');
      } else {
        ToastConfig.show({ title: "Error", message: "File upload failed.", type: "error" });
        setSaveStatus('Saved');
      }
    } catch (error) { 
      ToastConfig.show({ title: "Error", message: "Network error uploading files.", type: "error" });
      setSaveStatus('Saved');
    } finally {
      setIsUploadingFile(false); 
      e.target.value = ''; 
    }
  };

  const handleDownload = async (e, url, filename) => {
    e.preventDefault();
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network error during download");
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.setAttribute('download', filename); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      
    } catch (error) {
      if (url.includes('cloudinary.com/')) {
        const parts = url.split('/upload/');
        if (parts.length === 2) {
           const safeName = encodeURIComponent(filename.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
           const downloadUrl = `${parts[0]}/upload/fl_attachment:${safeName}/${parts[1]}`;
           window.open(downloadUrl, '_blank');
           return;
        }
      }
      window.open(url, '_blank');
    }
  };

  const removeFile = (indexToRemove) => {
    if (readOnly) return;
    setReferenceFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setIsDirty(true); 
    setSaveStatus('Unsaved changes');
  };

  const handleManualSave = async () => {
    setSaveStatus('Saving...');
    const activeTitle = title.trim() || 'Untitled Note';
    const activeCourse = courseId || generalCourses[0]?.id || courses[0]?.id || 'general-task';
    const noteData = { _id: noteIdRef.current, title: activeTitle, courseId: activeCourse, content: editor.getHTML(), referenceFiles, isPrivate };
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
    <div className={`flex flex-col bg-white dark:bg-[#121212] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999]' : 'h-full w-full relative'}`}>
      <style>{`
        .ProseMirror h1 { font-size: 2.25rem !important; font-weight: 800 !important; line-height: 1.2 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror h2 { font-size: 1.875rem !important; font-weight: 700 !important; line-height: 1.3 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror h3 { font-size: 1.5rem !important; font-weight: 600 !important; line-height: 1.4 !important; margin-top: 0.5em; margin-bottom: 0.25em; }
        .ProseMirror p { font-size: 1rem !important; line-height: 1.6 !important; }
        .dark .ProseMirror { color: #e5e7eb !important; }
        .dark .ProseMirror p { color: #e5e7eb !important; }
        .dark .ProseMirror h1, .dark .ProseMirror h2, .dark .ProseMirror h3 { color: #ffffff !important; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #9ca3af; pointer-events: none; height: 0; font-style: italic; }
        .ProseMirror mark { background-color: #fef08a !important; color: #111827 !important; border-radius: 4px; padding: 0 2px; }
        .dark .ProseMirror mark { background-color: rgba(234, 179, 8, 0.3) !important; color: #fde047 !important; }
        .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1rem; margin-left: 0; color: #6b7280; font-style: italic; }
        .dark .ProseMirror blockquote { border-left-color: #444; color: #9ca3af; }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; }
        .ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; }
        .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.25rem; }
        .ProseMirror ul[data-type="taskList"] li > div > p { margin: 0 !important; }
        .ProseMirror ul[data-type="taskList"] li > label { margin-top: 0.15rem; flex-shrink: 0; user-select: none; }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 1.2rem; height: 1.2rem; border: 2px solid #9ca3af; border-radius: 4px; cursor: pointer; display: inline-grid; place-content: center; transition: all 0.2s ease; background-color: transparent; margin: 0; }
        .dark .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] { border-color: #6b7280; }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"]::before { content: ""; width: 0.75em; height: 0.75em; transform: scale(0); transition: 120ms transform ease-in-out; background-color: #3b82f6; transform-origin: center; clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); }
        .dark .ProseMirror ul[data-type="taskList"] li input[type="checkbox"]::before { background-color: #60a5fa; }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"]:checked { border-color: #3b82f6; background-color: transparent; }
        .dark .ProseMirror ul[data-type="taskList"] li input[type="checkbox"]:checked { border-color: #60a5fa; }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"]:checked::before { transform: scale(1); }
        .ProseMirror ul[data-type="taskList"] li > div { flex: 1; transition: all 0.2s ease; margin-top: 0; }
        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div { text-decoration: line-through; color: #9ca3af; }
        .dark .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div { color: #6b7280; }
        .ProseMirror code { background-color: #f3f4f6; color: #ef4444; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875em; }
        .dark .ProseMirror code { background-color: #2d3748; color: #fca5a5; }

        /* Syntax Highlighting (Highlight.js / One Dark theme) */
        .ProseMirror pre code .hljs-comment,
        .ProseMirror pre code .hljs-quote {
          color: #727b87;
          font-style: italic;
        }
        .ProseMirror pre code .hljs-keyword,
        .ProseMirror pre code .hljs-selector-tag,
        .ProseMirror pre code .hljs-addition {
          color: #c678dd;
          font-weight: bold;
        }
        .ProseMirror pre code .hljs-number,
        .ProseMirror pre code .hljs-string,
        .ProseMirror pre code .hljs-meta .hljs-string,
        .ProseMirror pre code .hljs-literal,
        .ProseMirror pre code .hljs-doctag,
        .ProseMirror pre code .hljs-regexp {
          color: #98c379;
        }
        .ProseMirror pre code .hljs-title,
        .ProseMirror pre code .hljs-section,
        .ProseMirror pre code .hljs-name,
        .ProseMirror pre code .hljs-selector-id,
        .ProseMirror pre code .hljs-selector-class {
          color: #61afef;
        }
        .ProseMirror pre code .hljs-attribute,
        .ProseMirror pre code .hljs-attr,
        .ProseMirror pre code .hljs-variable,
        .ProseMirror pre code .hljs-template-variable,
        .ProseMirror pre code .hljs-class .hljs-title,
        .ProseMirror pre code .hljs-type {
          color: #d19a66;
        }
        .ProseMirror pre code .hljs-symbol,
        .ProseMirror pre code .hljs-bullet,
        .ProseMirror pre code .hljs-subst,
        .ProseMirror pre code .hljs-meta,
        .ProseMirror pre code .hljs-link {
          color: #56b6c2;
        }
        .ProseMirror pre code .hljs-built_in,
        .ProseMirror pre code .hljs-title.class_ {
          color: #e6c07b;
        }
        .ProseMirror pre code .hljs-emphasis {
          font-style: italic;
        }
        .ProseMirror pre code .hljs-strong {
          font-weight: bold;
        }

        #custom-toolbar { border-bottom: 1px solid #e5e7eb !important; padding: 8px 24px !important; background-color: #f9fafb; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; position: sticky; top: 0; z-index: 40; }
        .dark #custom-toolbar { border-bottom-color: #2C2C2C !important; background-color: #1A1A1A; }
        .toolbar-btn { padding: 6px; border-radius: 6px; transition: all 0.2s; color: #4b5563; display: flex; align-items: center; justify-content: center; }
        .toolbar-btn:hover { background-color: #e5e7eb; color: #111827; }
        .toolbar-btn.active { background-color: #dbeafe; color: #2563eb; }
        .dark .toolbar-btn { color: #d1d5db; }
        .dark .toolbar-btn:hover { background-color: #333; color: #fff; }
        .dark .toolbar-btn.active { background-color: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .toolbar-divider { width: 1px; height: 20px; background-color: #d1d5db; margin: 0 8px; }
        .dark .toolbar-divider { background-color: #444; }
      `}</style>
        
      {/* 🚀 BUG FIXED: Responsive Toolbars & Flexible Wrapped Headings */}
      <div className="bg-white dark:bg-[#121212] px-4 md:px-6 py-3 border-b border-gray-200 dark:border-[#2C2C2C] z-50 shrink-0 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 shadow-sm">
        
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto flex-1 min-w-0">
          <button onClick={onBack} className="flex items-center justify-center p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>
          
          <input 
            type="text" placeholder="Untitled Note..." 
            className="w-full text-xl md:text-2xl font-black bg-transparent text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-[#444] outline-none transition-colors tracking-tight min-w-0" 
            value={title} 
            readOnly={readOnly}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); setSaveStatus('Unsaved changes'); }} 
          />
          
          {saveStatus && !readOnly && (
            <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full transition-colors whitespace-nowrap shrink-0 ${
              saveStatus.includes('Saving') || saveStatus.includes('Uploading') ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' :
              saveStatus === 'Saved to cloud' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' :
              saveStatus.includes('Error') ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' :
              'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-[#252525]'
            }`}>
              {(saveStatus.includes('Saving') || saveStatus.includes('Uploading')) && <Loader2 size={12} className="animate-spin" />}
              {saveStatus === 'Saved to cloud' && <Cloud size={12} />}
              {saveStatus === 'Unsaved changes' && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
              <span className="hidden sm:inline">{saveStatus}</span>
            </div>
          )}
        </div>
        
        {/* Scrollable action bar for smaller devices so nothing overflows */}
        <div className="flex items-center gap-2 flex-wrap pb-1 md:pb-0 w-full md:w-auto shrink-0">
          
          <div className="relative group shrink-0" ref={dropdownRef}>
            <button 
              onClick={() => !readOnly && setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className={`flex items-center gap-2 px-3 sm:px-4 h-10 bg-gray-50 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-all outline-none whitespace-nowrap ${readOnly ? 'cursor-default' : 'hover:border-blue-500 focus:ring-2 focus:ring-brand-blue'}`}
            >
              <span className="flex items-center gap-2">
                {selectedCourse ? (
                  <>
                    {selectedCourse.type === 'uni' ? (
                      <UCPLogo className="w-4 h-4 text-blue-500 shrink-0 mt-[1px]" />
                    ) : (
                      <Book size={16} className="text-gray-400 shrink-0" />
                    )}
                    <span className="truncate max-w-[120px] sm:max-w-[200px]">
                      {selectedCourse.name}
                    </span>
                  </>
                ) : (
                  <><Book size={16} className="text-gray-400 shrink-0" /> <span>Link Course</span></>
                )}
              </span>
              {!readOnly && <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isCourseDropdownOpen && !readOnly && (
              <div className="absolute top-full right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl overflow-hidden z-[100] animate-fadeIn custom-scrollbar max-h-[350px] overflow-y-auto">
                {uniCourses.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#252525] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#2C2C2C]">University Courses</div>
                    {uniCourses.map(c => (
                      <button 
                        key={c._id || c.id} 
                        onClick={() => { setCourseId(c._id || c.id); setIsCourseDropdownOpen(false); setIsDirty(true); setSaveStatus('Unsaved changes'); }} 
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-start justify-between gap-2 border-b border-gray-50 dark:border-[#2C2C2C] transition-colors last:border-0"
                      >
                        <span className="flex items-start gap-2 text-gray-700 dark:text-gray-200 pr-2">
                          <UCPLogo className="w-4 h-4 text-blue-500 shrink-0 mt-[2px]" />
                          <span className="leading-snug whitespace-normal break-words text-left font-medium">{c.name}</span>
                        </span>
                        {courseId === (c._id || c.id) && <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-[2px]" />}
                      </button>
                    ))}
                  </>
                )}
                {generalCourses.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-gray-50 dark:bg-[#252525] text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-[#2C2C2C] border-t border-t-gray-100 dark:border-t-[#2C2C2C]">General / Manual</div>
                    {generalCourses.map(c => (
                      <button 
                        key={c._id || c.id} 
                        onClick={() => { setCourseId(c._id || c.id); setIsCourseDropdownOpen(false); setIsDirty(true); setSaveStatus('Unsaved changes'); }} 
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-start justify-between gap-2 border-b border-gray-50 dark:border-[#2C2C2C] transition-colors last:border-0"
                      >
                        <span className="flex items-start gap-2 text-gray-700 dark:text-gray-200 pr-2">
                          <Book size={16} className="text-gray-400 shrink-0 mt-[2px]" />
                          <span className="leading-snug whitespace-normal break-words text-left font-medium">{c.name}</span>
                        </span>
                        {courseId === (c._id || c.id) && <CheckCircle2 size={16} className="text-brand-blue shrink-0 mt-[2px]" />}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 shrink-0">
              {onShare && initialNote && (
                <button
                  onClick={onShare}
                  className="flex items-center gap-1.5 px-3 h-10 rounded-lg border bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333] text-gray-500 hover:text-brand-blue hover:border-brand-blue dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] text-xs font-bold transition-all whitespace-nowrap"
                  title="Share to specific users in the community"
                >
                  <Send size={14} /> <span className="hidden sm:inline">Share</span>
                </button>
              )}

              <button
                onClick={() => { setIsPrivate(!isPrivate); setIsDirty(true); setSaveStatus('Unsaved changes'); }}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap ${
                  isPrivate 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                    : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333] text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#2C2C2C]'
                }`}
                title={isPrivate ? "Make Shared with Workspace Group" : "Make Private"}
              >
                {isPrivate ? <Lock size={14} /> : <Globe size={14} />} 
                <span className="hidden sm:inline">{isPrivate ? 'Private' : 'Shared Group'}</span>
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center justify-center h-10 w-10 text-gray-500 hover:text-brand-blue bg-gray-50 hover:bg-blue-50 dark:bg-[#1E1E1E] dark:hover:bg-blue-900/20 border border-gray-200 dark:border-[#333] rounded-lg transition-colors shrink-0"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Editor"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

        </div> 
      </div>

      {editor && !readOnly && (
        <div id="custom-toolbar">
          <button title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="toolbar-btn"><Undo2 size={16}/></button>
          <button title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="toolbar-btn"><Redo2 size={16}/></button>
          <div className="toolbar-divider"></div>

          <button title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}><Bold size={16}/></button>
          <button title="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}><Italic size={16}/></button>
          <button title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}><span className="font-serif font-bold underline">U</span></button>
          <button title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}><Strikethrough size={16}/></button>
          <button title="Superscript" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`toolbar-btn ${editor.isActive('superscript') ? 'active' : ''}`}><SuperscriptIcon size={16}/></button>
          <button title="Subscript" onClick={() => editor.chain().focus().toggleSubscript().run()} className={`toolbar-btn ${editor.isActive('subscript') ? 'active' : ''}`}><SubscriptIcon size={16}/></button>
          <button title="Inline Code" onClick={() => editor.chain().focus().toggleCode().run()} className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}><Terminal size={16}/></button>
          <button title="Highlight" onClick={toggleHighlight} className={`toolbar-btn ${editor.isActive('highlight') ? 'active text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : ''}`}><Highlighter size={16}/></button>
          <div className="toolbar-divider"></div>

          <div className="relative" ref={headingDropdownRef}>
            <button 
              title="Headings"
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
              title="Text Alignment"
              onClick={() => setIsAlignDropdownOpen(!isAlignDropdownOpen)} 
              className={`toolbar-btn flex items-center gap-1.5 px-3 py-1.5 ${editor.isActive({ textAlign: 'left' }) || editor.isActive({ textAlign: 'center' }) || editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            >
              {editor.isActive({ textAlign: 'center' }) ? <AlignCenter size={16}/> : editor.isActive({ textAlign: 'right' }) ? <AlignRight size={16}/> : <AlignLeft size={16}/>}
              <span className="text-sm font-medium hidden sm:block">Align</span>
              <ChevronDown size={14} className="opacity-50" />
            </button>
            {isAlignDropdownOpen && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[100] py-1 min-w-[140px] animate-slideUp">
                <button onClick={() => { editor.chain().focus().setTextAlign('left').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}><AlignLeft size={14}/> Left Align</button>
                <button onClick={() => { editor.chain().focus().setTextAlign('center').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}><AlignCenter size={14}/> Center Align</button>
                <button onClick={() => { editor.chain().focus().setTextAlign('right').run(); setIsAlignDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'text-brand-blue font-bold' : 'text-gray-700 dark:text-gray-300'}`}><AlignRight size={14}/> Right Align</button>
              </div>
            )}
          </div>
          <div className="toolbar-divider"></div>

          <button title="Bullet List" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}><List size={16}/></button>
          <button title="Numbered List" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}><ListOrdered size={16}/></button>
          <button title="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}><CheckSquare size={16}/></button>
          <button title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}><Quote size={16}/></button>
          <div className="toolbar-divider"></div>

          <button title="Static Code Block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}><FileCode size={16}/></button>
          <button title="Interactive IntelliSense Block" onClick={() => editor.chain().focus().insertContent({ type: 'monacoCodeBlock' }).run()} className="toolbar-btn"><Code size={16}/></button>
          <button title="Insert Math Equation" onClick={() => editor.chain().focus().insertContent({ type: 'equationBlock' }).run()} className="toolbar-btn"><Sigma size={16}/></button>
          <div className="toolbar-divider"></div>

          <button title="Insert Image" onClick={imageHandler} className="toolbar-btn"><ImageIcon size={16}/></button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
        <EditorContent editor={editor} />
      </div>

      {/* 🚀 BUG FIXED: Footer correctly stacked to avoid button-squishing */}
      <div className="bg-white dark:bg-[#1A1A1A] border-t border-gray-200 dark:border-[#333] px-4 md:px-6 py-3 z-40 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex items-center gap-3 md:gap-4 flex-wrap w-full sm:w-auto">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              <span className="text-gray-900 dark:text-gray-200 font-bold">{wordCount}</span> words &nbsp;|&nbsp; <span className="text-gray-900 dark:text-gray-200 font-bold">{charCount}</span> chars
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-[#444] hidden md:block"></div>
            <button onClick={handleCopyText} className={`flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ${copied ? 'text-green-600' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
              {copied ? <><CheckCircle2 size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
            </button>
            {initialNote && onDelete && (
              <button onClick={() => onDelete(initialNote)} className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-red-500 hover:text-red-700 transition-colors whitespace-nowrap md:ml-2">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <div className="flex flex-nowrap items-center gap-2 max-w-[200px] sm:max-w-none overflow-x-auto custom-scrollbar pr-1">
              {referenceFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] hover:border-brand-blue/40 rounded-lg text-xs transition-all shadow-sm shrink-0">
                  <Paperclip size={12} className="text-gray-400 shrink-0" />
                  <button onClick={(e) => handleDownload(e, file.fileUrl, file.fileName)} className="truncate max-w-[80px] sm:max-w-[120px] text-gray-700 dark:text-gray-300 font-medium hover:text-brand-blue dark:hover:text-blue-400 cursor-pointer text-left">
                    {file.fileName}
                  </button>
                  {!readOnly && (
                    <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-500 ml-1 shrink-0"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>

            {!readOnly && (
              <>
                <input type="file" ref={fileInputRef} multiple onChange={handleFileUpload} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  disabled={isUploadingFile}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold shrink-0 transition-all ${isUploadingFile ? 'bg-blue-50 text-brand-blue cursor-not-allowed dark:bg-blue-900/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#2C2C2C] dark:text-gray-300 dark:hover:bg-[#333]'}`}
                >
                  {isUploadingFile ? <Loader2 size={14} className="animate-spin text-brand-blue" /> : <Paperclip size={14} />} 
                  <span className="hidden sm:inline">{isUploadingFile ? 'Uploading...' : 'Attach'}</span>
                </button>
              </>
            )}

            {readOnly ? (
              <button onClick={onBack} className="flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-[#333] dark:hover:bg-[#444] text-gray-800 dark:text-gray-200 font-bold py-2 px-4 sm:px-5 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 text-sm whitespace-nowrap">
                <X size={16} /> Close
              </button>
            ) : (
              <button onClick={handleManualSave} disabled={saveStatus === 'Saving...'} className="flex items-center gap-1.5 bg-brand-blue hover:bg-blue-600 disabled:bg-blue-400 text-white font-bold py-2 px-4 sm:px-5 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 text-sm whitespace-nowrap">
                <CheckCircle2 size={16} /> <span className="hidden sm:inline">Finish & Close</span><span className="sm:hidden">Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div 
        ref={bubbleMenuRef}
        className="fixed z-[9999] hidden items-center gap-1 bg-white dark:bg-[#2C2C2C] shadow-xl rounded-lg border border-gray-200 dark:border-[#444] p-1.5 transition-opacity"
        style={{ display: 'none' }}
      >
        {editor && !readOnly && (
          <>
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}>B</button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`w-8 h-8 flex items-center justify-center rounded-md text-sm italic font-serif transition-colors ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-[#444] text-brand-blue' : 'hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300'}`}>I</button>
            <div className="w-px h-5 bg-gray-300 dark:bg-[#555] mx-1"></div>
            <button onClick={toggleHighlight} className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors ${editor.isActive('highlight') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-[#333]'}`}>
              <Highlighter size={14}/> {editor.isActive('highlight') ? 'Remove' : 'Highlight'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;