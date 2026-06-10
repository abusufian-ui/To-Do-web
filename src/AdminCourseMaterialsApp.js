import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, ChevronRight, ChevronDown, FileText, Download, 
  Users, RefreshCw, Loader2, AlertCircle, HelpCircle
} from 'lucide-react';
import axios from 'axios';
import { ToastConfig } from './CustomToast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Module-level cache to persist data across section selections
const adminDetailsCache = {};

const AdminCourseMaterialsApp = ({ token }) => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null); // { courseCode, courseName, sectionCode, semester }

  const [files, setFiles] = useState([]);
  const [studentStats, setStudentStats] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedArchives, setExpandedArchives] = useState(new Set());

  // Fetch courses list
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/course-materials/courses`, {
        headers: { 'x-auth-token': token }
      });
      setCourses(res.data || []);
    } catch (err) {
      console.error("Error fetching admin courses list:", err);
      ToastConfig.show({ 
        title: 'Fetch Failed', 
        message: 'Could not load courses structure.', 
        type: 'error' 
      });
    } finally {
      setLoadingCourses(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch files and student stats for a selected section
  const fetchSectionDetails = useCallback(async (sec, showLoader = true) => {
    const cacheKey = `${sec.courseCode}_${sec.sectionCode}_${sec.semester}`;
    if (showLoader) {
      setLoadingDetails(true);
    }
    setDetailsError(null);
    try {
      const res = await axios.get(
        `${API_BASE}/api/admin/course-materials/files?courseCode=${encodeURIComponent(sec.courseCode)}&sectionCode=${encodeURIComponent(sec.sectionCode)}&semester=${encodeURIComponent(sec.semester)}`,
        { headers: { 'x-auth-token': token } }
      );
      const data = res.data || {};
      setFiles(data.files || []);
      setStudentStats(data.studentStats || null);
      adminDetailsCache[cacheKey] = data;
    } catch (err) {
      console.error("Error fetching section details:", err);
      setDetailsError("Failed to retrieve materials and student counts.");
    } finally {
      setLoadingDetails(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedSection) {
      const cacheKey = `${selectedSection.courseCode}_${selectedSection.sectionCode}_${selectedSection.semester}`;
      const cachedData = adminDetailsCache[cacheKey];

      if (cachedData) {
        setFiles(cachedData.files || []);
        setStudentStats(cachedData.studentStats || null);
        setLoadingDetails(false);
        // Silent background fetch to update cache/UI
        fetchSectionDetails(selectedSection, false);
      } else {
        fetchSectionDetails(selectedSection, true);
      }
    } else {
      setFiles([]);
      setStudentStats(null);
    }
  }, [selectedSection, fetchSectionDetails]);

  const toggleCourseExpand = (courseCode) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.has(courseCode) ? next.delete(courseCode) : next.add(courseCode);
      return next;
    });
  };

  const toggleArchiveExpand = (fileName) => {
    setExpandedArchives(prev => {
      const next = new Set(prev);
      next.has(fileName) ? next.delete(fileName) : next.add(fileName);
      return next;
    });
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = (fileType || fileName.split('.').pop()).toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-5 h-5 text-blue-500" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText className="w-5 h-5 text-orange-500" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText className="w-5 h-5 text-emerald-500" />;
    if (['zip', 'rar'].includes(ext)) return <Folder className="w-5 h-5 text-purple-500" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)] bg-gray-50 dark:bg-[#0c0c0e] text-gray-900 dark:text-white">
      {/* LEFT SIDEBAR: Course & Section Buckets Tree */}
      <div className="w-full lg:w-80 border-r border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-[#27272a] flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <Folder size={16} /> Course Buckets
          </h3>
          <button 
            onClick={fetchCourses} 
            disabled={loadingCourses}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#27272a] text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={loadingCourses ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loadingCourses ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 mb-2" />
              <span className="text-xs">Loading structure…</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No synced course materials found in DB.
            </div>
          ) : (
            courses.map(course => {
              const isExpanded = expandedCourses.has(course.courseCode);
              return (
                <div key={course.courseCode} className="space-y-0.5">
                  {/* Course Folder Header */}
                  <button
                    onClick={() => toggleCourseExpand(course.courseCode)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1c1c1f] text-left transition-colors group"
                  >
                    <div className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <Folder size={18} className="text-purple-400 shrink-0 fill-purple-400/10" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate leading-tight">
                        {course.courseName}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {course.courseCode}
                      </p>
                    </div>
                  </button>

                  {/* Course Sections */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-gray-100 dark:border-gray-800 ml-5">
                      {course.sections.map(sec => {
                        const isSelected = selectedSection && 
                          selectedSection.courseCode === course.courseCode && 
                          selectedSection.sectionCode === sec.sectionCode &&
                          selectedSection.semester === sec.semester;

                        return (
                          <button
                            key={`${sec.sectionCode}-${sec.semester}`}
                            onClick={() => setSelectedSection({
                              courseCode: course.courseCode,
                              courseName: course.courseName,
                              sectionCode: sec.sectionCode,
                              semester: sec.semester
                            })}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                              isSelected 
                                ? 'bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-black' 
                                : 'hover:bg-gray-50 dark:hover:bg-[#18181b]/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                              Section {sec.sectionCode}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] bg-gray-100 dark:bg-[#27272a] px-1.5 py-0.5 rounded text-gray-500 font-mono uppercase">
                                {sec.semester}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400">
                                ({sec.fileCount})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANE: Details, Files List & Connection Statistics */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {!selectedSection ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-24 bg-white dark:bg-[#111113]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#27272a]">
            <Folder size={64} className="opacity-30 mb-4 text-purple-400" />
            <h4 className="font-bold text-gray-700 dark:text-gray-300">No Section Selected</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1 leading-relaxed">
              Select a section bucket from the course tree on the left to inspect synced materials and connection stats.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Detail */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] p-6 rounded-2xl shadow-sm">
              <div>
                <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                  {selectedSection.semester}
                </span>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mt-2 leading-tight">
                  {selectedSection.courseName}
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  Course: <span className="font-mono">{selectedSection.courseCode}</span> · Section: <span className="text-purple-500">{selectedSection.sectionCode}</span>
                </p>
              </div>

              <button
                onClick={() => fetchSectionDetails(selectedSection)}
                disabled={loadingDetails}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#27272a] dark:hover:bg-[#323237] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-gray-200 dark:border-transparent shrink-0"
              >
                <RefreshCw size={13} className={loadingDetails ? "animate-spin" : ""} />
                <span>Refresh Materials</span>
              </button>
            </div>

            {/* Student Connection Stats Section */}
            <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} className="text-purple-500" /> Student Enrollment & Link Status
              </h3>

              {loadingDetails ? (
                <div className="h-24 flex items-center justify-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                  <span className="text-xs">Loading statistics…</span>
                </div>
              ) : studentStats ? (
                <div className="space-y-4">
                  {/* Progress bar visual */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2">
                      <div className="flex justify-between text-xs mb-1.5 font-bold">
                        <span className="text-gray-500">Connected Student Portal Access</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {studentStats.connectedCount} <span className="text-gray-400">/ {studentStats.total} Linked</span>
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-150 dark:bg-[#222] rounded-full overflow-hidden border border-gray-200/40 dark:border-[#27272a]">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${studentStats.total > 0 ? (studentStats.connectedCount / studentStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl flex items-center gap-3">
                      <Users size={24} className="text-purple-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black">Connected students</p>
                        <p className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                          {studentStats.connectedCount} active user{studentStats.connectedCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connected list */}
                  {studentStats.connectedList && studentStats.connectedList.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Connected Students Roster</p>
                      <div className="flex flex-wrap gap-2">
                        {studentStats.connectedList.map(u => (
                          <div 
                            key={u._id}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1d] border border-gray-200 dark:border-[#27272a] px-3 py-1.5 rounded-xl text-xs"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 animate-pulse"></div>
                            <div className="text-left leading-tight">
                              <p className="font-bold text-gray-800 dark:text-gray-200">{u.name}</p>
                              <p className="text-[9px] text-gray-400 font-mono">{u.rollNumber || u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-left text-xs text-gray-400 p-3 bg-gray-50 dark:bg-[#141417] rounded-xl flex items-center gap-2">
                      <AlertCircle size={14} className="text-orange-500" />
                      No students are currently connected via portal credentials for this section in the database.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-400">Failed to fetch stats.</div>
              )}
            </div>

            {/* Files List Panel */}
            <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#151518] flex items-center justify-between">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Course Materials</h4>
                <span className="text-xs text-gray-400 font-mono">
                  {files.length} file{files.length !== 1 ? 's' : ''} synced
                </span>
              </div>

              {loadingDetails ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                  <span className="text-xs">Fetching file listing…</span>
                </div>
              ) : detailsError ? (
                <div className="p-12 text-center text-rose-500 flex flex-col items-center justify-center gap-2">
                  <AlertCircle size={32} />
                  <p className="text-xs font-semibold">{detailsError}</p>
                </div>
              ) : files.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                  <p className="font-bold text-gray-700 dark:text-gray-300">No materials fetched yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    The background engine hasn't processed any material links for this course section. Verify if scraping succeeded.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-150 dark:divide-[#27272a]">
                  {files.map(file => {
                    const isArchive = file.fileType === 'zip' || file.fileType === 'rar';
                    const hasContents = isArchive && file.contents && file.contents.length > 0;
                    const isExpanded = expandedArchives.has(file.fileName);

                    return (
                      <div key={file._id} className="transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1d]/30">
                        {/* Parent file row */}
                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-4 min-w-0">
                            {getFileIcon(file.fileName, file.fileType)}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-gray-400 font-mono">
                                <span className="uppercase text-purple-500">{file.fileType}</span>
                                {file.fileSize > 0 && <span>• {formatSize(file.fileSize)}</span>}
                                {file.parentArchive && <span>• from {file.parentArchive}</span>}
                                {file.createdAt && <span>• Synced {new Date(file.createdAt).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {/* Zip Archive Contents Toggle */}
                            {hasContents && (
                              <button
                                onClick={() => toggleArchiveExpand(file.fileName)}
                                className="p-2 rounded-xl hover:bg-gray-155 dark:hover:bg-[#27272a] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="View archive contents"
                              >
                                {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </button>
                            )}

                            {/* Download Button */}
                            {file.downloadUrl ? (
                              <a
                                href={file.downloadUrl}
                                download={file.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500 text-purple-600 dark:text-purple-400 hover:text-white transition-all border border-purple-500/20"
                                title="Download File"
                              >
                                <Download size={15} />
                              </a>
                            ) : (
                              <button
                                disabled
                                className="p-2 rounded-xl bg-gray-100 dark:bg-[#27272a] text-gray-400 opacity-50 cursor-not-allowed border border-transparent"
                                title="No Download URL"
                              >
                                <HelpCircle size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Zip Archive Extracts Child List */}
                        {isArchive && isExpanded && hasContents && (
                          <div className="bg-gray-50/50 dark:bg-[#0c0c0e]/50 pl-14 pr-6 py-2 border-t border-gray-150 dark:border-gray-800 space-y-1.5">
                            {file.contents.map(entry => (
                              <div key={entry._id} className="py-2 flex items-center justify-between text-xs border-b border-gray-100 dark:border-gray-800/40 last:border-0">
                                <div className="flex items-center space-x-3 min-w-0">
                                  {getFileIcon(entry.fileName, entry.fileType)}
                                  <span className="text-gray-600 dark:text-gray-400 truncate" title={entry.fileName}>
                                    {entry.fileName}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  {entry.downloadUrl && (
                                    <a
                                      href={entry.downloadUrl}
                                      download={entry.fileName}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
                                    >
                                      <Download size={13} />
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

export default AdminCourseMaterialsApp;
