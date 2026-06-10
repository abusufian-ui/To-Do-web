import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Eye, AlertCircle, Loader2, Folder, ChevronDown, ChevronUp, CheckSquare, Square, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Module-level cache to persist data across component mounts
const materialsCache = {};
const statusCache = {};

const CourseMaterial = ({ courseCode, sectionCode, onViewFile }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [expandedArchives, setExpandedArchives] = useState(new Set());

  const fetchMaterials = useCallback(async (showLoader = true) => {
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

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === materials.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(materials.map(m => m._id)));
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
        const res = await axios.post(
          `${API_BASE}/api/course-material/download-zip`,
          { fileIds: Array.from(selected), courseName: courseCode },
          { headers: { 'x-auth-token': token }, responseType: 'blob' }
        );
        const url = window.URL.createObjectURL(new Blob([res.data]));
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
      setError("Failed to download file(s).");
    } finally {
      setDownloading(false);
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
    <div className="space-y-6">
      {/* Sync Banner */}
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

      {/* Toolbar */}
      {materials.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleAll}
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition text-sm font-semibold"
            >
              {selected.size === materials.length ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5" />}
              <span>{selected.size === materials.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-xs text-slate-500 font-mono">({selected.size} selected)</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchMaterials(); fetchStatus(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh Files"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {selected.size > 0 && (
              <button
                onClick={downloadSelected}
                disabled={downloading}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition shadow-lg shadow-emerald-600/10"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Download {selected.size} File{selected.size > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Materials List */}
      <div className="bg-slate-900/20 rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/30 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-200 text-base">Course Materials</h4>
            <p className="text-xs text-slate-400 font-mono">Section {sectionCode || 'N/A'} • Automated Sync</p>
          </div>
          {status?.lastProcessedAt && (
            <span className="text-xs text-slate-500 font-mono">
              Last Synced: {new Date(status.lastProcessedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-300">No course materials found</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              {status?.isProcessing 
                ? 'Files are currently downloading from your student portal...' 
                : 'Connect your portal and sync to retrieve course files.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {materials.map((file) => {
              const isSelected = selected.has(file._id);
              const isArchive = file.fileType === 'zip' || file.fileType === 'rar';
              const hasContents = isArchive && file.contents && file.contents.length > 0;
              const isExpanded = expandedArchives.has(file.fileName);

              return (
                <div key={file._id} className="transition-colors hover:bg-slate-900/10">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4 min-w-0">
                      {/* Checkbox */}
                      <button 
                        onClick={() => toggleSelect(file._id)} 
                        className="text-slate-500 hover:text-white transition"
                      >
                        {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5" />}
                      </button>

                      {/* Icon */}
                      {getFileIcon(file.fileName, file.fileType)}

                      <div className="min-w-0">
                        <p className="font-medium text-slate-200 text-sm truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                        <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-500 font-mono">
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
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          title="View contents"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Preview (only for PDFs) */}
                      {file.fileType === 'pdf' && file.downloadUrl && (
                        <button 
                          onClick={() => onViewFile(file.downloadUrl, file.fileName)}
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
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
                          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Expanded Archive contents */}
                  {isArchive && isExpanded && hasContents && (
                    <div className="bg-slate-950/30 pl-16 pr-6 py-2 border-t border-slate-900/40 space-y-2">
                      {file.contents.map((entry) => (
                        <div key={entry._id} className="py-2 flex items-center justify-between text-xs border-b border-slate-900/20 last:border-0">
                          <div className="flex items-center space-x-3 min-w-0">
                            {getFileIcon(entry.fileName, entry.fileType)}
                            <span className="text-slate-400 truncate" title={entry.fileName}>{entry.fileName}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {entry.fileType === 'pdf' && entry.downloadUrl && (
                              <button 
                                onClick={() => onViewFile(entry.downloadUrl, entry.fileName)}
                                className="p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-emerald-400 transition"
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
                                className="p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-blue-400 transition"
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
  );
};

export default CourseMaterial;
