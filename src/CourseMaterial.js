import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Download, Eye, AlertCircle, Loader2, Folder, ChevronDown, ChevronUp, CheckSquare, Square, RefreshCw, BookOpen } from 'lucide-react';
import UCPLogo from './UCPLogo';
import ParallelSyncDashboard from './ParallelSyncDashboard';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Module-level cache to persist data across component mounts
const materialsCache = {};
const statusCache = {};

const CourseMaterial = ({ 
  courses = [], 
  onViewFile, 
  showSyncDashboard, 
  setShowSyncDashboard, 
  coursesSyncStatus, 
  fetchStatuses,
  searchQuery = ''
}) => {
  const [selectedCourse, setSelectedCourse] = useState(courses.length > 0 ? courses[0] : null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [selected, setSelected] = useState(new Set());
  
  // Zip download progress states
  const [downloading, setDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState(null); // { processed: number, total: number }

  const [expandedArchives, setExpandedArchives] = useState(new Set());

  const courseCode = selectedCourse?.code;
  const sectionCode = selectedCourse?.section;

  const fetchMaterials = useCallback(async (showLoader = true) => {
    if (!courseCode || !sectionCode) return;
    const cacheKey = `${courseCode}_${sectionCode}`;
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/course-material/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionCode)}`, {
        headers: { 'x-auth-token': token }
      });
      const files = response.data.files || [];
      setMaterials(files);
      materialsCache[cacheKey] = files;
    } catch (err) {
      console.error("Error fetching materials:", err);
      setError("Failed to load materials.");
    } finally {
      setLoading(false);
    }
  }, [courseCode, sectionCode]);

  const fetchStatus = useCallback(async () => {
    if (!courseCode || !sectionCode) return;
    const cacheKey = `${courseCode}_${sectionCode}`;
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/course-material/status/${encodeURIComponent(courseCode)}/${encodeURIComponent(sectionCode)}`, {
        headers: { 'x-auth-token': token }
      });
      const data = response.data;
      setStatus(data);
      statusCache[cacheKey] = data;
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  }, [courseCode, sectionCode]);

  // Handle course sync on mount / change
  useEffect(() => {
    if (courseCode && sectionCode) {
      setSelected(new Set()); // Reset selections on course change
      const cacheKey = `${courseCode}_${sectionCode}`;
      const cachedMaterials = materialsCache[cacheKey];
      const cachedStatus = statusCache[cacheKey];

      if (cachedMaterials) {
        setMaterials(cachedMaterials);
        if (cachedStatus) setStatus(cachedStatus);
        setLoading(false);
        // Silent background fetch to update cache/UI
        fetchMaterials(false);
        fetchStatus();
      } else {
        fetchMaterials(true);
        fetchStatus();
      }
    }
  }, [courseCode, sectionCode, fetchMaterials, fetchStatus]);

  // Polling for processing updates
  useEffect(() => {
    let interval;
    if (status?.isProcessing) {
      interval = setInterval(() => {
        fetchStatus();
        fetchMaterials();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [status?.isProcessing, fetchStatus, fetchMaterials]);

  // Search/genre filtering
  const filteredMaterials = useMemo(() => {
    if (!searchQuery || searchQuery.trim() === '') return materials;
    const query = searchQuery.toLowerCase().trim();
    
    // Check if query is an extension search, e.g. ".pdf" or "pdf"
    const isExtensionSearch = query.startsWith('.');
    const extToMatch = isExtensionSearch ? query.slice(1) : query;

    return materials.filter(m => {
      const nameMatch = m.fileName?.toLowerCase().includes(query);
      const extMatch = m.fileType?.toLowerCase() === extToMatch;
      
      const innerMatch = m.contents && m.contents.some(entry => {
        const entryNameMatch = entry.fileName?.toLowerCase().includes(query);
        const entryExtMatch = entry.fileType?.toLowerCase() === extToMatch;
        return entryNameMatch || entryExtMatch;
      });

      return nameMatch || extMatch || innerMatch;
    });
  }, [materials, searchQuery]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredMaterials.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredMaterials.map(m => m._id)));
    }
  };

  const toggleArchive = (fileName) => {
    setExpandedArchives(prev => {
      const next = new Set(prev);
      next.has(fileName) ? next.delete(fileName) : next.add(fileName);
      return next;
    });
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    try {
      setDownloading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (selected.size === 1) {
        const fileId = Array.from(selected)[0];
        const file = materials.find(f => f._id === fileId);
        if (file && file.downloadUrl) {
          window.open(file.downloadUrl, '_blank');
        }
      } else {
        // Multi-file ZIP download with progress tracking
        setZipProgress({ processed: 0, total: selected.size });

        const startRes = await axios.post(
          `${API_BASE}/api/course-material/download-zip/start`,
          { fileIds: Array.from(selected), courseName: courseCode },
          { headers: { 'x-auth-token': token } }
        );

        const { jobId } = startRes.data;

        // Poll job status every 500ms
        await new Promise((resolve, reject) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await axios.get(
                `${API_BASE}/api/course-material/download-zip/status/${jobId}`,
                { headers: { 'x-auth-token': token } }
              );
              const { status: jobStatus, processed, total, error: jobError } = statusRes.data;

              setZipProgress({ processed, total });

              if (jobStatus === 'completed') {
                clearInterval(pollInterval);
                resolve(jobId);
              } else if (jobStatus === 'failed') {
                clearInterval(pollInterval);
                reject(new Error(jobError || "Failed to create zip file on backend."));
              }
            } catch (err) {
              clearInterval(pollInterval);
              reject(err);
            }
          }, 500);
        });

        // Trigger file download
        const fileRes = await axios.get(
          `${API_BASE}/api/course-material/download-zip/file/${jobId}`,
          { headers: { 'x-auth-token': token }, responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(new Blob([fileRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${courseCode.replace(/\s+/g, '_')}_files.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      setSelected(new Set());
    } catch (err) {
      console.error("Download error:", err);
      setError(err.message || "Failed to download file(s).");
    } finally {
      setDownloading(false);
      setZipProgress(null);
    }
  };

  const downloadCourseFolderZip = async (course) => {
    try {
      setDownloading(true);
      setZipProgress({ processed: 0, total: 1 });
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      const startRes = await axios.post(
        `${API_BASE}/api/course-material/download-zip/start`,
        { 
          fileIds: [], 
          courseCode: course.code, 
          sectionCode: course.section, 
          courseName: course.name 
        },
        { headers: { 'x-auth-token': token } }
      );

      const { jobId } = startRes.data;

      await new Promise((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await axios.get(
              `${API_BASE}/api/course-material/download-zip/status/${jobId}`,
              { headers: { 'x-auth-token': token } }
            );
            const { status: jobStatus, processed, total, error: jobError } = statusRes.data;

            setZipProgress({ processed, total });

            if (jobStatus === 'completed') {
              clearInterval(pollInterval);
              resolve(jobId);
            } else if (jobStatus === 'failed') {
              clearInterval(pollInterval);
              reject(new Error(jobError || "Failed to create zip file on backend."));
            }
          } catch (err) {
            clearInterval(pollInterval);
            reject(err);
          }
        }, 500);
      });

      // Trigger file download
      const fileRes = await axios.get(
        `${API_BASE}/api/course-material/download-zip/file/${jobId}`,
        { headers: { 'x-auth-token': token }, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course.name.replace(/\s+/g, '_')}_files.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download folder error:", err);
      setError(err.message || "Failed to download course folder.");
    } finally {
      setDownloading(false);
      setZipProgress(null);
    }
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = (fileType || fileName.split('.').pop()).toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-400" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-8 h-8 text-blue-400" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText className="w-8 h-8 text-orange-400" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText className="w-8 h-8 text-emerald-400" />;
    if (['zip', 'rar'].includes(ext)) return <Folder className="w-8 h-8 text-purple-400" />;
    return <FileText className="w-8 h-8 text-slate-400" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex w-full h-full overflow-hidden bg-[#FAFAFA] dark:bg-[#09090B] relative">
      
      {/* 🚀 COURSES SIDEBAR */}
      <div className="w-72 md:w-80 shrink-0 h-full bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-gray-800/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] flex flex-col z-30">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800/50 shrink-0 bg-white dark:bg-[#121214] z-10 sticky top-0">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" /> University Courses
          </h3>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar pb-20">
          {courses.map((course) => {
            const isActive = course.code === selectedCourse?.code;
            const credits = course.creditHours ?? 0;
            
            return (
              <div 
                key={course._id || course.id || course.code} 
                className="relative group flex items-center w-full"
              >
                <button
                  onClick={() => setSelectedCourse(course)}
                  className={`flex-1 text-left px-4 py-3.5 rounded-2xl transition-all border pr-10 ${
                    isActive 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' 
                      : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 p-1.5 ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                      <UCPLogo color={isActive ? "#ffffff" : (document.documentElement.classList.contains('dark') ? '#60A5FA' : '#2563EB')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-bold leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{course.name}</p>
                      <p className={`text-[10px] font-semibold tracking-wider uppercase mt-1 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                        Section {course.section || 'N/A'} • {credits} Cr. Hrs
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadCourseFolderZip(course); }}
                  className={`absolute right-3 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                    isActive 
                      ? 'text-white/80 hover:text-white hover:bg-white/10' 
                      : 'text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-[#1A1A1E]'
                  }`}
                  title="Download full course folder as ZIP"
                >
                  <Download size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
        {showSyncDashboard ? (
          <ParallelSyncDashboard 
            courses={courses} 
            statuses={coursesSyncStatus} 
            onClose={() => setShowSyncDashboard(false)} 
            onRefresh={fetchStatuses}
          />
        ) : (
          <div className="w-full max-w-5xl mx-auto pb-24 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-widest uppercase mb-3 border border-blue-100 dark:border-blue-500/20">
                  Course Material
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {selectedCourse?.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Section {selectedCourse?.section || 'N/A'} • Course Code: {selectedCourse?.code}
                </p>
              </div>
            </div>

            {/* Sync Status Banner */}
            {status?.isProcessing && (() => {
              const total = status.totalFiles || 0;
              const completed = status.processedFiles || 0;
              const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
              return (
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-300 text-sm space-y-2">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="font-medium">
                      {total > 0
                        ? `Syncing files from Horizon Portal: ${completed}/${total} downloaded (${pct}%)`
                        : 'Syncing files from Horizon Portal...'}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Zip Download progress overlay */}
            {zipProgress && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm space-y-2">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="font-bold">
                    Preparing download zip: {zipProgress.processed} / {zipProgress.total} files processed
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-50 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${(zipProgress.processed / zipProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Toolbar */}
            {filteredMaterials.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-4 rounded-2xl border border-gray-200 dark:border-gray-800/80 shadow-sm">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition text-sm font-semibold"
                  >
                    {selected.size === filteredMaterials.length ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5" />}
                    <span>{selected.size === filteredMaterials.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <span className="text-xs text-gray-400 font-mono">({selected.size} selected)</span>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { fetchMaterials(); fetchStatus(); }}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition border border-gray-200 dark:border-gray-750"
                    title="Refresh Files"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={downloadSelected}
                      disabled={downloading}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-blue-600/10"
                    >
                      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>Download {selected.size} File{selected.size > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start space-x-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Materials List */}
            <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-200 dark:border-gray-800/85 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50/50 dark:bg-[#121214]/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-850 dark:text-slate-200 text-base">Course Materials</h4>
                  <p className="text-xs text-gray-400 font-mono">Section {sectionCode || 'N/A'} • Automated Sync</p>
                </div>
                {status?.lastProcessedAt && (
                  <span className="text-xs text-gray-400 font-mono">
                    Last Synced: {new Date(status.lastProcessedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : filteredMaterials.length === 0 ? (
                <div className="p-12 text-center text-gray-450 dark:text-slate-400">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-bold text-gray-750 dark:text-slate-300">No course materials found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchQuery 
                      ? 'No files match your search query.' 
                      : (status?.isProcessing 
                        ? 'Files are currently downloading from your student portal...' 
                        : 'Connect your portal and sync to retrieve course files.')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800/50">
                  {filteredMaterials.map((file) => {
                    const isSelected = selected.has(file._id);
                    const isArchive = file.fileType === 'zip' || file.fileType === 'rar';
                    const hasContents = isArchive && file.contents && file.contents.length > 0;
                    const isExpanded = expandedArchives.has(file.fileName);

                    return (
                      <div key={file._id} className="transition-colors hover:bg-gray-50/30 dark:hover:bg-[#1C1C1F]/20">
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center space-x-4 min-w-0">
                            {/* Checkbox */}
                            <button 
                              onClick={() => toggleSelect(file._id)} 
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                            </button>

                            {/* Icon */}
                            {getFileIcon(file.fileName, file.fileType)}

                            <div className="min-w-0">
                              <p className="font-semibold text-gray-850 dark:text-slate-200 text-sm truncate" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5 text-xs text-gray-450 dark:text-gray-400 font-mono">
                                <span>{file.fileType?.toUpperCase()}</span>
                                {file.fileSize > 0 && <span>• {formatSize(file.fileSize)}</span>}
                                {file.parentArchive && <span>• from {file.parentArchive}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Archive Toggle */}
                            {hasContents && (
                              <button 
                                onClick={() => toggleArchive(file.fileName)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                                title="View contents"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}

                            {/* Preview (only for PDFs) */}
                            {file.fileType === 'pdf' && file.downloadUrl && (
                              <button 
                                onClick={() => onViewFile(file.downloadUrl, file.fileName)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
                                title="View Securely"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Direct download */}
                            {file.downloadUrl && (
                              <a 
                                href={file.downloadUrl} 
                                download={file.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Expanded Archive contents */}
                        {isArchive && isExpanded && hasContents && (
                          <div className="bg-gray-50/50 dark:bg-black/10 pl-16 pr-6 py-2 border-t border-gray-150 dark:border-gray-800/40 space-y-2">
                            {file.contents.map((entry) => (
                              <div key={entry._id} className="py-2 flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-800/20 last:border-0">
                                <div className="flex items-center space-x-3 min-w-0">
                                  {getFileIcon(entry.fileName, entry.fileType)}
                                  <span className="text-gray-500 dark:text-gray-400 truncate" title={entry.fileName}>{entry.fileName}</span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  {entry.fileType === 'pdf' && entry.downloadUrl && (
                                    <button 
                                      onClick={() => onViewFile(entry.downloadUrl, entry.fileName)}
                                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {entry.downloadUrl && (
                                    <a 
                                      href={entry.downloadUrl} 
                                      download={entry.fileName}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseMaterial;
