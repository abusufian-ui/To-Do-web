import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import UCPLogo from './UCPLogo';
import { 
  Folder, Search, ArrowLeft, FileText, Download, ExternalLink, 
  Loader2, RefreshCw, User, CheckSquare, Square, X, Sparkles, Layers
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/* ── Assessment Category Configs ── */
const PAPER_TYPE_CONFIG = {
  mid_term: { label: 'Mid Term', icon: '📝', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  final_term: { label: 'Final Term', icon: '🎓', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
  quiz: { label: 'Quizzes', icon: '⚡', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  assignment: { label: 'Assignments', icon: '📑', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  graded_lab: { label: 'CPs & Graded Labs', icon: '🔬', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  class_participation: { label: 'CPs', icon: '💬', badgeClass: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30' },
  other: { label: 'Other Assessments', icon: '📌', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' }
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const isPdfFile = (item) => {
  if (!item) return false;
  const nameLower = (item.displayName || item.fileName || '').toLowerCase();
  const b2Lower = (item.b2Key || '').toLowerCase();

  const isNonPdfExt = nameLower.match(/\.(csv|ipynb|pptx?|docx?|zip|rar|xlsx?|py|txt|png|jpe?g|json|html?)$/i) ||
                      b2Lower.match(/\.(csv|ipynb|pptx?|docx?|zip|rar|xlsx?|py|txt|png|jpe?g|json|html?)$/i);
  if (isNonPdfExt) return false;

  return item.fileType === 'pdf' || nameLower.endsWith('.pdf') || b2Lower.endsWith('.pdf');
};

const CourseVault = () => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  // Full-page course detail state
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('past_papers'); // 'past_papers' | 'lecture_notes'
  const [selectedPaperCategory, setSelectedPaperCategory] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');

  // Multi-file selection state (Max 10 files)
  const [selectedFileIds, setSelectedFileIds] = useState(new Set());
  const [selectedFileObjects, setSelectedFileObjects] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const [loadingContent, setLoadingContent] = useState(false);
  const [pastPapers, setPastPapers] = useState(null);
  const [lectureNotes, setLectureNotes] = useState([]);

  const [downloadingId, setDownloadingId] = useState(null);
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${API_BASE}/api/vault/courses`, {
        headers: { 'x-auth-token': token }
      });
      setCourses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch vault courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleOpenCourse = async (course) => {
    setSelectedCourse(course);
    setActiveTab('past_papers');
    setSelectedPaperCategory('all');
    setSelectedTeacher('all');
    setSelectedFileIds(new Set());
    setSelectedFileObjects([]);
    setLoadingContent(true);
    setPastPapers(null);
    setLectureNotes([]);

    try {
      const [ppRes, lnRes] = await Promise.all([
        axios.get(`${API_BASE}/api/vault/past-papers/${encodeURIComponent(course.courseName)}`, {
          headers: { 'x-auth-token': token }
        }),
        axios.get(`${API_BASE}/api/vault/lecture-notes/${encodeURIComponent(course.courseName)}`, {
          headers: { 'x-auth-token': token }
        })
      ]);
      setPastPapers(ppRes.data || {});
      setLectureNotes(lnRes.data || []);
    } catch (err) {
      console.error('Error loading course files:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleBackToCatalog = () => {
    setSelectedCourse(null);
    setSelectedFileIds(new Set());
    setSelectedFileObjects([]);
  };

  const handleOpenPdf = (item) => {
    const title = item.displayName || item.fileName || 'Document.pdf';
    const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const fileObj = {
      id: item.id,
      source: item.source,
      title: title,
      fileName: item.fileName || title
    };
    const jsonStr = JSON.stringify([fileObj]);
    try { localStorage.setItem('vault_viewer_batch', jsonStr); } catch (_) {}
    try { sessionStorage.setItem('vault_viewer_batch', jsonStr); } catch (_) {}
    const viewerUrl = `/pdf-viewer?batch=true&source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.id)}&title=${encodeURIComponent(title)}&token=${encodeURIComponent(currentToken)}`;
    window.open(viewerUrl, '_blank');
  };

  const handleDownload = async (item) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    try {
      const response = await fetch(
        `${API_BASE}/api/vault/download/${item.source}/${item.id}?token=${encodeURIComponent(token)}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const cd = response.headers.get('content-disposition');
      let filename = `${item.displayName || 'document'}`;
      if (cd) {
        const m = cd.match(/filename\*?=["']?([^"';]+)["']?/i);
        if (m?.[1]) filename = decodeURIComponent(m[1].replace(/UTF-8''/i, ''));
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { window.URL.revokeObjectURL(url); } catch (_) {}
        try { if (document.body.contains(a)) document.body.removeChild(a); } catch (_) {}
      }, 5000);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Multi-file selection handlers (Max 10 files)
  const toggleFileSelection = (item) => {
    const nextIds = new Set(selectedFileIds);
    let nextObjs = [...selectedFileObjects];

    if (nextIds.has(item.id)) {
      nextIds.delete(item.id);
      nextObjs = nextObjs.filter(o => o.id !== item.id);
    } else {
      if (nextIds.size >= 10) {
        alert('Maximum 10 files can be selected at once.');
        return;
      }
      nextIds.add(item.id);
      nextObjs.push(item);
    }

    setSelectedFileIds(nextIds);
    setSelectedFileObjects(nextObjs);
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
    setSelectedFileObjects([]);
  };

  // Smart Batch Action Handler
  const handleBatchAction = async () => {
    if (selectedFileObjects.length === 0 || batchProcessing) return;

    const pdfFiles = selectedFileObjects.filter(f => isPdfFile(f));
    const docFiles = selectedFileObjects.filter(f => !isPdfFile(f));

    // 1. Open all selected PDFs in ONE single In-App Multi-Tab Viewer window!
    if (pdfFiles.length > 0) {
      const batchList = pdfFiles.map(f => ({
        id: f.id,
        source: f.source,
        title: f.displayName || f.fileName || 'Document.pdf',
        fileName: f.fileName || f.displayName || 'Document.pdf'
      }));
      const batchKey = `vault_batch_${Date.now()}`;
      const jsonStr = JSON.stringify(batchList);
      try { localStorage.setItem(batchKey, jsonStr); } catch (_) {}
      try { sessionStorage.setItem(batchKey, jsonStr); } catch (_) {}
      try { localStorage.setItem('vault_viewer_latest_batch', jsonStr); } catch (_) {}
      try { localStorage.setItem('vault_viewer_batch', jsonStr); } catch (_) {}
      const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const viewerUrl = `/pdf-viewer?batchKey=${batchKey}&count=${batchList.length}&token=${encodeURIComponent(currentToken)}`;
      window.open(viewerUrl, '_blank');
    }

    // 2. Download doc files bundled into a single ZIP
    if (docFiles.length > 0) {
      setBatchProcessing(true);
      try {
        if (docFiles.length === 1) {
          await handleDownload(docFiles[0]);
        } else {
          const zip = new JSZip();
          for (const file of docFiles) {
            const res = await fetch(
              `${API_BASE}/api/vault/download/${file.source}/${file.id}?token=${encodeURIComponent(token)}`
            );
            if (res.ok) {
              const blob = await res.blob();
              const fName = file.displayName || file.fileName || `document_${file.id}`;
              zip.file(fName, blob);
            }
          }
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = window.URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(selectedCourse?.abbreviation || 'CourseVault')}_Selected_Files.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Batch download error:', err);
      } finally {
        setBatchProcessing(false);
      }
    }

    clearSelection();
  };

  const getTotalPapers = () =>
    pastPapers ? Object.values(pastPapers).reduce((a, b) => a + (b?.length || 0), 0) : 0;

  const getTotalNotes = () =>
    lectureNotes.reduce((a, t) => a + (t.files?.length || 0), 0);

  /* ── Skeleton loader cards ── */
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-6 h-48 flex flex-col justify-between animate-pulse shadow-sm">
      <div className="flex justify-between items-center">
        <div className="w-12 h-6 rounded-md bg-gray-200 dark:bg-gray-700/60" />
        <div className="w-10 h-5 rounded-full bg-gray-200 dark:bg-gray-700/60" />
      </div>
      <div>
        <div className="w-3/4 h-5 rounded-md bg-gray-200 dark:bg-gray-700/60 mb-2" />
        <div className="w-1/2 h-4 rounded-md bg-gray-200 dark:bg-gray-700/60" />
      </div>
      <div className="flex gap-2">
        <div className="w-16 h-6 rounded-md bg-gray-200 dark:bg-gray-700/60" />
        <div className="w-16 h-6 rounded-md bg-gray-200 dark:bg-gray-700/60" />
      </div>
    </div>
  );

  /* ── File Row Component with Checkbox Selection ── */
  const FileRow = ({ item }) => {
    const isDownloading = downloadingId === item.id;
    const isSelected = selectedFileIds.has(item.id);
    const isPdf = isPdfFile(item);
    const nameLower = (item.displayName || item.fileName || '').toLowerCase();
    const displayTitle = item.displayName || item.fileName;
    const fileLabel = PAPER_TYPE_CONFIG[item.paperType]?.label || 'Document';

    return (
      <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group ${
        isSelected 
          ? 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-500/80 dark:border-blue-400/70 shadow-sm'
          : 'bg-gray-50/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 hover:bg-white dark:hover:bg-[#1E1E24] hover:border-blue-400/50 dark:hover:border-blue-500/40'
      }`}>
        
        {/* Selection Checkbox & File Info */}
        <div className="flex items-center gap-3.5 overflow-hidden flex-1 cursor-pointer" onClick={() => toggleFileSelection(item)}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFileSelection(item); }}
            className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-blue-500 dark:text-gray-600'
            }`}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>

          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isPdf 
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' 
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
          }`}>
            <FileText size={20} />
          </div>

          <div className="overflow-hidden">
            <p className="margin-0 text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {displayTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
              <span>{formatBytes(item.fileSize)}</span>
              <span>•</span>
              <span>{fileLabel}</span>
              {item.teacherName && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Instructor: {item.teacherName}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        {isPdf ? (
          <button
            onClick={() => handleOpenPdf(item)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 transition-all shrink-0 whitespace-nowrap"
          >
            <ExternalLink size={14} /> Open
          </button>
        ) : (
          <button
            onClick={() => handleDownload(item)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl transition-all shrink-0 whitespace-nowrap"
          >
            <Download size={14} /> Download
          </button>
        )}
      </div>
    );
  };

  /* ── Course Card Component ── */
  const CourseCard = ({ course }) => {
    return (
      <div
        onClick={() => handleOpenCourse(course)}
        className="bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800/80 rounded-2xl p-5 min-h-[13rem] flex flex-col justify-between cursor-pointer hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group transform hover:-translate-y-1"
      >
        <div>
          <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <UCPLogo className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold rounded-md tracking-wider">
                [{course.abbreviation || 'CRS'}]
              </span>
              {course.isEnrolled && (
                <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                  ⚡ ENROLLED
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 shrink-0">
              <Folder size={13} /> {(course.pastPaperCount || 0) + (course.lectureNoteCount || 0)}
            </span>
          </div>

          <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {course.courseName}
          </h3>

          {course.programs && course.programs.length > 0 && (() => {
            const shortProgs = course.programs
              .map(p => getProgramAbbreviation(p))
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i);
            if (shortProgs.length === 0) return null;
            return (
              <div className="text-[11px] text-purple-600/90 dark:text-purple-300/90 font-bold tracking-wide truncate mt-1.5 flex items-center gap-1">
                <span className="shrink-0">🎓</span>
                <span className="truncate">
                  {shortProgs.join(' • ')}
                </span>
              </div>
            );
          })()}
        </div>

        <div className="flex gap-2 pt-3 mt-2 border-t border-gray-100 dark:border-gray-800/60">
          <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs font-semibold">
            📄 {course.pastPaperCount || 0} papers
          </span>
          <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50 rounded-lg text-xs font-semibold">
            📚 {course.lectureNoteCount || 0} notes
          </span>
        </div>
      </div>
    );
  };

  /* Filter courses */
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.abbreviation && c.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterMode === 'enrolled') return c.isEnrolled;
    if (filterMode === 'related') return c.isRelated || c.isEnrolled;
    return true;
  }).sort((a, b) => {
    // 1. Enrolled courses on top
    if (a.isEnrolled !== b.isEnrolled) return a.isEnrolled ? -1 : 1;
    // 2. Descending document count (courses with more documents on top)
    const totalDocsA = (a.pastPaperCount || 0) + (a.lectureNoteCount || 0);
    const totalDocsB = (b.pastPaperCount || 0) + (b.lectureNoteCount || 0);
    if (totalDocsB !== totalDocsA) return totalDocsB - totalDocsA;
    // 3. Fallback alphabetical
    return a.courseName.localeCompare(b.courseName);
  });


  let batchButtonText = '';
  let batchButtonClass = '';

  if (pdfCount > 0 && docCount === 0) {
    batchButtonText = `Open ${pdfCount} File${pdfCount > 1 ? 's' : ''}`;
    batchButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30';
  } else if (pdfCount > 0 && docCount > 0) {
    batchButtonText = `Open ${pdfCount} PDF${pdfCount > 1 ? 's' : ''} & Download ${docCount} Doc${docCount > 1 ? 's' : ''}`;
    batchButtonClass = 'bg-gradient-to-r from-blue-600 to-amber-600 hover:from-blue-700 hover:to-amber-700 text-white shadow-lg shadow-blue-500/20';
  } else if (pdfCount === 0 && docCount > 0) {
    batchButtonText = `Download All (${docCount} File${docCount > 1 ? 's' : ''} as ZIP)`;
    batchButtonClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/30';
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#0e0e11] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 relative pb-28">
      
      {/* ── MODE 1: FULL-PAGE COURSE DETAIL VIEW ── */}
      {selectedCourse ? (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 animate-fadeIn">
          
          {/* ── TOP NAV BAR: BACK BUTTON ── */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={handleBackToCatalog}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/35 transition-all group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
              Back to All Courses
            </button>
          </div>

          {/* ── COURSE HEADER CARD WITH UCP LOGO ── */}
          <div className="bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
              <UCPLogo className="w-10 h-10 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="px-3 py-1 bg-blue-600 text-white text-xs font-extrabold rounded-lg tracking-wider shadow-sm">
                    [{selectedCourse.abbreviation}]
                  </span>
                  {selectedCourse.isEnrolled && (
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold rounded-lg">
                      ⚡ ENROLLED
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {selectedCourse.courseName}
                </h1>
                {selectedCourse.programs && selectedCourse.programs.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                    <span className="text-xs font-bold text-gray-400">Taught in:</span>
                    {selectedCourse.programs.map((p, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-300 text-xs font-semibold rounded-md flex items-center gap-1">
                        🎓 {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 block">{getTotalPapers()}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Past Papers</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                <span className="text-xl font-extrabold text-amber-500 block">{getTotalNotes()}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Lecture Notes</span>
              </div>
            </div>
          </div>

          {/* ── MAIN SUB-TABS: PAST PAPERS vs LECTURE NOTES ── */}
          <div className="flex gap-2 p-1.5 bg-gray-200/70 dark:bg-[#181820] border border-gray-300/60 dark:border-gray-800 rounded-2xl mb-8 w-fit">
            {[
              { key: 'past_papers', label: `📄 Past Papers (${getTotalPapers()})` },
              { key: 'lecture_notes', label: `📚 Lecture Notes (${getTotalNotes()})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedPaperCategory('all');
                  setSelectedTeacher('all');
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── MAIN CONTENT AREA ── */}
          {loadingContent ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-blue-600 dark:text-blue-400">
              <Loader2 size={32} className="animate-spin" />
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Loading course files…</span>
            </div>
          ) : activeTab === 'past_papers' ? (
            /* ── TAB 1: PAST PAPERS ── */
            getTotalPapers() === 0 ? (
              <div className="p-16 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl">
                <div className="text-4xl mb-3">📂</div>
                <p className="font-bold text-base text-gray-900 dark:text-white margin-0">No past papers available yet</p>
                <p className="text-sm mt-1">Check back later as new past papers are uploaded.</p>
              </div>
            ) : (
              <div>
                {/* ── CATEGORY FILTER TILES ── */}
                <div className="mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Filter by Assessment Category
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {/* All Past Papers Tile */}
                    <button
                      onClick={() => setSelectedPaperCategory('all')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        selectedPaperCategory === 'all'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                          : 'bg-white dark:bg-[#181820] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <span>📁</span> All Past Papers ({getTotalPapers()})
                    </button>

                    {/* Render Category Tiles ONLY if items.length > 0 */}
                    {Object.keys(PAPER_TYPE_CONFIG).map(typeKey => {
                      const items = pastPapers?.[typeKey] || [];
                      if (items.length === 0) return null;
                      const cfg = PAPER_TYPE_CONFIG[typeKey];
                      const isSelected = selectedPaperCategory === typeKey;

                      return (
                        <button
                          key={typeKey}
                          onClick={() => setSelectedPaperCategory(typeKey)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                              : 'bg-white dark:bg-[#181820] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <span>{cfg.icon}</span> {cfg.label} ({items.length})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── PAPERS LIST ── */}
                <div className="flex flex-col gap-6">
                  {Object.keys(PAPER_TYPE_CONFIG).map(typeKey => {
                    if (selectedPaperCategory !== 'all' && selectedPaperCategory !== typeKey) return null;

                    const items = pastPapers?.[typeKey] || [];
                    if (items.length === 0) return null;
                    const cfg = PAPER_TYPE_CONFIG[typeKey];

                    return (
                      <div key={typeKey} className="bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 md:p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${cfg.badgeClass}`}>
                            <span>{cfg.icon}</span> {cfg.label} ({items.length})
                          </span>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {items.map(item => <FileRow key={item.id} item={item} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            /* ── TAB 2: LECTURE NOTES (GROUPED & FILTERABLE BY TEACHER) ── */
            getTotalNotes() === 0 ? (
              <div className="p-16 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl">
                <div className="text-4xl mb-3">📂</div>
                <p className="font-bold text-base text-gray-900 dark:text-white margin-0">No lecture notes available yet</p>
              </div>
            ) : (
              <div>
                {/* ── TITLE: SELECT LECTURE NOTES BY TEACHER ── */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User size={20} className="text-blue-600 dark:text-blue-400" /> Select Lecture Notes by Teacher
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Click on an instructor tile below to view their specific lecture slides and class notes.
                  </p>
                </div>

                {/* ── TEACHER FILTER TILES ── */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {/* All Teachers Tile */}
                  <button
                    onClick={() => setSelectedTeacher('all')}
                    className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border ${
                      selectedTeacher === 'all'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                        : 'bg-white dark:bg-[#181820] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <span>📚</span> All Teachers ({getTotalNotes()} files)
                  </button>

                  {/* Individual Teacher Tiles */}
                  {lectureNotes.map((tGroup, idx) => {
                    const isSelected = selectedTeacher === tGroup.teacherName;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedTeacher(tGroup.teacherName)}
                        className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 border ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                            : 'bg-white dark:bg-[#181820] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <User size={15} />
                        <span>{tGroup.teacherName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}>
                          {tGroup.files?.length || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── LECTURE NOTES LIST BY TEACHER ── */}
                <div className="flex flex-col gap-6">
                  {lectureNotes.map((tGroup, idx) => {
                    if (selectedTeacher !== 'all' && selectedTeacher !== tGroup.teacherName) return null;

                    return (
                      <div key={idx} className="bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 md:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <User size={18} />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                {tGroup.teacherName}
                              </h3>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Instructor • {tGroup.files?.length || 0} lecture documents
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          {(tGroup.files || []).map(item => <FileRow key={item.id} item={item} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* ── MODE 2: CATALOG SEARCH & COURSE CARDS GRID ── */
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
          
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 p-3">
                <Folder size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Course Vault
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Browse past papers and lecture notes for all your courses.
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by course name or abbreviation (OOP, AI, DSA, DLD...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-16 py-3.5 bg-white dark:bg-[#181820] border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Course Filter Tabs & Refresh */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex gap-1.5 p-1 bg-white dark:bg-[#181820] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All Courses ({courses.length})
              </button>

              <button
                onClick={() => setFilterMode('enrolled')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterMode === 'enrolled'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                ⚡ My Enrolled ({enrolledCount})
              </button>

              <button
                onClick={() => setFilterMode('related')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  filterMode === 'related'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                ✦ Recommended ({relatedCount})
              </button>
            </div>

            <button
              onClick={fetchCourses}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <RefreshCw size={14} /> Refresh Catalog
            </button>
          </div>

          {/* Courses Grid */}
          {loadingCourses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-3">🗂️</div>
              <p className="font-bold text-base text-gray-900 dark:text-white margin-0">No courses found</p>
              <p className="text-sm mt-1">Try switching filter tabs or clearing your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredCourses.map(c => <CourseCard key={c.courseName} course={c} />)}
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING SMART BATCH ACTION BAR (MAX 10 FILES) ── */}
      {selectedFileIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-[#181820]/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl px-6 py-3.5 flex items-center justify-between gap-6 max-w-xl w-[92vw] animate-slideUp">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
              {selectedFileIds.size}
            </span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white margin-0">
                {selectedFileIds.size} of 10 Selected
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 margin-0">
                {pdfCount > 0 && `${pdfCount} PDF${pdfCount > 1 ? 's' : ''}`}
                {pdfCount > 0 && docCount > 0 && ' • '}
                {docCount > 0 && `${docCount} Doc${docCount > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBatchAction}
              disabled={batchProcessing}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${batchButtonClass}`}
            >
              {batchProcessing ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
              {batchProcessing ? 'Processing Batch…' : batchButtonText}
            </button>

            <button
              onClick={clearSelection}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
              title="Clear selection"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseVault;
