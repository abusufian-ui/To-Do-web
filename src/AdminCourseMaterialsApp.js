import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Folder, ChevronRight, ChevronDown, FileText, Download, 
  Users, RefreshCw, Loader2, AlertCircle, HelpCircle, Search, X, CheckSquare, Square
} from 'lucide-react';
import axios from 'axios';
import { ToastConfig } from './CustomToast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';


const adminDetailsCache = {};

const AdminCourseMaterialsApp = ({ token }) => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null); 

  const [files, setFiles] = useState([]);
  const [studentStats, setStudentStats] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [expandedArchives, setExpandedArchives] = useState(new Set());

  
  const [selected, setSelected] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [zipProgress, setZipProgress] = useState(null);

  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudentSections, setSelectedStudentSections] = useState(null); 
  const [highlightFileId, setHighlightFileId] = useState(null);

  const searchContainerRef = useRef(null);

  
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
    setSelected(new Set()); 
    if (selectedSection) {
      const cacheKey = `${selectedSection.courseCode}_${selectedSection.sectionCode}_${selectedSection.semester}`;
      const cachedData = adminDetailsCache[cacheKey];

      if (cachedData) {
        setFiles(cachedData.files || []);
        setStudentStats(cachedData.studentStats || null);
        setLoadingDetails(false);
        
        fetchSectionDetails(selectedSection, false);
      } else {
        fetchSectionDetails(selectedSection, true);
      }
    } else {
      setFiles([]);
      setStudentStats(null);
    }
  }, [selectedSection, fetchSectionDetails]);

  
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/admin/course-materials/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'x-auth-token': token }
        });
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  
  useEffect(() => {
    const handleClickOutsideSearch = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, []);

  
  useEffect(() => {
    if (highlightFileId && files.length > 0) {
      const element = document.getElementById(`file-row-${highlightFileId}`);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        const timer = setTimeout(() => setHighlightFileId(null), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightFileId, files]);

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

  const selectSearchCourse = (c) => {
    setSelectedSection({
      courseCode: c.courseCode,
      courseName: c.courseName,
      sectionCode: c.sectionCode,
      semester: c.semester
    });
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.add(c.courseCode);
      return next;
    });
    setSearchResults(null);
    setSearchQuery('');
  };

  const selectSearchFile = (f) => {
    setSelectedSection({
      courseCode: f.courseCode,
      courseName: f.courseCode, 
      sectionCode: f.sectionCode,
      semester: f.semester
    });
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.add(f.courseCode);
      return next;
    });
    setHighlightFileId(f._id);
    setSearchResults(null);
    setSearchQuery('');
  };

  const fetchStudentSections = async (student) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/course-materials/student-sections/${student._id}`, {
        headers: { 'x-auth-token': token }
      });
      setSelectedStudentSections({
        student,
        sections: res.data || []
      });
    } catch (err) {
      console.error("Error fetching student sections:", err);
      ToastConfig.show({
        title: 'Error',
        message: 'Failed to retrieve sections for student.',
        type: 'error'
      });
    }
  };

  const selectStudentSection = (student, sec) => {
    setSelectedSection({
      courseCode: sec.courseCode,
      courseName: sec.courseName,
      sectionCode: sec.sectionCode,
      semester: sec.semester
    });
    setExpandedCourses(prev => {
      const next = new Set(prev);
      next.add(sec.courseCode);
      return next;
    });
    setSelectedStudentSections(null);
    setSearchResults(null);
    setSearchQuery('');
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map(f => f._id)));
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    try {
      setDownloading(true);
      setZipProgress({ processed: 0, total: selected.size });

      if (selected.size === 1) {
        const fileId = Array.from(selected)[0];
        const file = files.find(f => f._id === fileId);
        if (file && file.downloadUrl) {
          window.open(file.downloadUrl, '_blank');
        }
      } else {
        const startRes = await axios.post(
          `${API_BASE}/api/course-material/download-zip/start`,
          { fileIds: Array.from(selected), courseName: selectedSection.courseCode },
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

        const fileRes = await axios.get(
          `${API_BASE}/api/course-material/download-zip/file/${jobId}`,
          { headers: { 'x-auth-token': token }, responseType: 'blob' }
        );

        const url = window.URL.createObjectURL(new Blob([fileRes.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${selectedSection.courseCode.replace(/\s+/g, '_')}_files.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      setSelected(new Set());
    } catch (err) {
      console.error("Download error:", err);
      ToastConfig.show({
        title: 'Download Failed',
        message: err.message || 'Failed to download selected files.',
        type: 'error'
      });
    } finally {
      setDownloading(false);
      setZipProgress(null);
    }
  };

  const downloadCourseFolderZip = async (course) => {
    try {
      setDownloading(true);
      setZipProgress({ processed: 0, total: 1 });
      const startRes = await axios.post(
        `${API_BASE}/api/course-material/download-zip/start`,
        { 
          fileIds: [], 
          courseCode: course.courseCode, 
          courseName: course.courseName 
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

      const fileRes = await axios.get(
        `${API_BASE}/api/course-material/download-zip/file/${jobId}`,
        { headers: { 'x-auth-token': token }, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course.courseName.replace(/\s+/g, '_')}_files.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download course error:", err);
      ToastConfig.show({
        title: 'Download Failed',
        message: err.message || 'Failed to download course ZIP.',
        type: 'error'
      });
    } finally {
      setDownloading(false);
      setZipProgress(null);
    }
  };

  const downloadSectionFolderZip = async (course, sec) => {
    try {
      setDownloading(true);
      setZipProgress({ processed: 0, total: sec.fileCount || 1 });
      const startRes = await axios.post(
        `${API_BASE}/api/course-material/download-zip/start`,
        { 
          fileIds: [], 
          courseCode: course.courseCode, 
          sectionCode: sec.sectionCode,
          semester: sec.semester,
          courseName: `${course.courseName}_Section_${sec.sectionCode}`
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

      const fileRes = await axios.get(
        `${API_BASE}/api/course-material/download-zip/file/${jobId}`,
        { headers: { 'x-auth-token': token }, responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course.courseName.replace(/\s+/g, '_')}_Sec_${sec.sectionCode}_files.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download section error:", err);
      ToastConfig.show({
        title: 'Download Failed',
        message: err.message || 'Failed to download section ZIP.',
        type: 'error'
      });
    } finally {
      setDownloading(false);
      setZipProgress(null);
    }
  };

  const getFileIcon = (fileName, fileType) => {
    const ext = (fileType || fileName.split('.').pop()).toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-5 h-5 text-blue-500" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText className="w-5 h-5 text-orange-500" />;
    if (['xls', 'xlsx'].includes(ext)) return <FileText className="w-5 h-5 text-emerald-500" />;
    if (['zip', 'rar'].includes(ext)) return <Folder className="w-5 h-5 text-blue-400" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const studentsRoster = studentStats?.studentsList || studentStats?.connectedList || [];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-gray-50 dark:bg-[#0c0c0e] text-gray-900 dark:text-white relative overflow-hidden">
      
      {}
      <div className="w-full lg:w-80 border-r border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#111113] flex flex-col shrink-0">
        
        {}
        <div className="p-4 border-b border-gray-200 dark:border-[#27272a] space-y-3 shrink-0 relative z-40" ref={searchContainerRef}>
          <div className="flex items-center justify-between">
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

          {}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, files, students..."
              className="w-full bg-gray-50 dark:bg-[#1c1c1f] border border-gray-200 dark:border-[#27272a] focus:border-blue-500 text-gray-800 dark:text-white text-xs rounded-xl py-2 pl-9 pr-8 outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}

            {}
            {searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn max-h-96 overflow-y-auto custom-scrollbar">
                
                {searchLoading && (
                  <div className="p-4 flex items-center justify-center text-gray-400 text-xs gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    <span>Searching...</span>
                  </div>
                )}

                {!searchLoading && 
                  searchResults.courses.length === 0 && 
                  searchResults.files.length === 0 && 
                  searchResults.students.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      No matching results found.
                    </div>
                )}

                {}
                {!searchLoading && searchResults.courses.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-[#252525] border-b border-gray-100 dark:border-[#2a2a2d]">Courses</div>
                    {searchResults.courses.map((c, i) => (
                      <button 
                        key={i}
                        onClick={() => selectSearchCourse(c)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#2c2c2f] text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-[#252525] last:border-0 flex flex-col"
                      >
                        <span className="font-bold leading-tight truncate">{c.courseName}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{c.courseCode} · Section {c.sectionCode}</span>
                      </button>
                    ))}
                  </div>
                )}

                {}
                {!searchLoading && searchResults.files.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-[#252525] border-b border-gray-100 dark:border-[#2a2a2d]">Files</div>
                    {searchResults.files.map((f) => (
                      <button 
                        key={f._id}
                        onClick={() => selectSearchFile(f)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#2c2c2f] text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-[#252525] last:border-0 flex items-start gap-2"
                      >
                        <FileText size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold leading-tight truncate">{f.fileName}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{f.courseCode} · Sec {f.sectionCode} ({formatSize(f.fileSize)})</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {}
                {!searchLoading && searchResults.students.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-[#252525] border-b border-gray-100 dark:border-[#2a2a2d]">Students</div>
                    {searchResults.students.map((u) => (
                      <button 
                        key={u._id}
                        onClick={() => fetchStudentSections(u)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#2c2c2f] text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-[#252525] last:border-0 flex flex-col"
                      >
                        <span className="font-bold leading-tight">{u.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{u.portalId || u.email}</span>
                      </button>
                    ))}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loadingCourses ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
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
                  {}
                  <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1c1c1f] text-left transition-colors group relative">
                    <button
                      onClick={() => toggleCourseExpand(course.courseCode)}
                      className="flex-grow flex items-center gap-2.5 min-w-0 text-left"
                    >
                      <div className="text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <Folder size={18} className="text-blue-500 shrink-0 fill-blue-500/10" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200 line-clamp-2 leading-tight text-left">
                          {course.courseName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 text-left">
                          {course.courseCode}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadCourseFolderZip(course); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Download full course folder as ZIP"
                    >
                      <Download size={14} />
                    </button>
                  </div>

                  {}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l border-gray-100 dark:border-gray-800 ml-5">
                      {course.sections.map(sec => {
                        const isSelected = selectedSection && 
                          selectedSection.courseCode === course.courseCode && 
                          selectedSection.sectionCode === sec.sectionCode &&
                          selectedSection.semester === sec.semester;

                        return (
                          <div
                            key={`${sec.sectionCode}-${sec.semester}`}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all group/sec relative ${
                              isSelected 
                                ? 'bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-black' 
                                : 'hover:bg-gray-50 dark:hover:bg-[#18181b]/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedSection({
                                courseCode: course.courseCode,
                                courseName: course.courseName,
                                sectionCode: sec.sectionCode,
                                semester: sec.semester
                              })}
                              className="flex-1 text-left truncate flex items-center gap-1.5 min-w-0"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                              <span className="truncate">Section {sec.sectionCode}</span>
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] bg-gray-105 dark:bg-[#27272a] px-1.5 py-0.5 rounded text-gray-500 font-mono uppercase group-hover/sec:hidden">
                                {sec.semester}
                              </span>
                              <span className="text-[10px] font-mono text-gray-400 group-hover/sec:hidden">
                                ({sec.fileCount})
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadSectionFolderZip(course, sec); }}
                                className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-800 hidden group-hover/sec:block"
                                title="Download section folder as ZIP"
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          </div>
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

      {}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {!selectedSection ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-24 bg-white dark:bg-[#111113]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#27272a]">
            <Folder size={64} className="opacity-30 mb-4 text-blue-500" />
            <h4 className="font-bold text-gray-700 dark:text-gray-300">No Section Selected</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1 leading-relaxed">
              Select a section bucket from the course tree on the left to inspect synced materials and connection stats.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] p-6 rounded-2xl shadow-sm">
              <div>
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider font-mono">
                  {selectedSection.semester}
                </span>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mt-2 leading-tight">
                  {selectedSection.courseName}
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  Course: <span className="font-mono">{selectedSection.courseCode}</span> · Section: <span className="text-blue-500">{selectedSection.sectionCode}</span>
                </p>
              </div>

              <button
                onClick={() => fetchSectionDetails(selectedSection)}
                disabled={loadingDetails}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-105 hover:bg-gray-200 dark:bg-[#27272a] dark:hover:bg-[#323237] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 border border-gray-200 dark:border-transparent shrink-0"
              >
                <RefreshCw size={13} className={loadingDetails ? "animate-spin" : ""} />
                <span>Refresh Materials</span>
              </button>
            </div>

            {}
            <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] p-6 rounded-2xl shadow-sm">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> Student Enrollment & Link Status
              </h3>

              {loadingDetails ? (
                <div className="h-24 flex items-center justify-center text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                  <span className="text-xs">Loading statistics…</span>
                </div>
              ) : studentStats ? (
                <div className="space-y-4">
                  {}
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
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${studentStats.total > 0 ? (studentStats.connectedCount / studentStats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-center gap-3">
                      <Users size={24} className="text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black">Connected students</p>
                        <p className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                          {studentStats.connectedCount} active user{studentStats.connectedCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {}
                  {studentsRoster.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Section Enrolled Students Roster ({studentsRoster.length})</p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-[#121214]/10">
                        {studentsRoster.map(u => (
                          <div 
                            key={u._id}
                            className="flex items-center gap-2 bg-white dark:bg-[#1a1a1d] border border-gray-200 dark:border-[#27272a] px-3 py-1.5 rounded-xl text-xs"
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.isPortalConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <div className="text-left leading-tight">
                              <p className="font-bold text-gray-800 dark:text-gray-200">{u.name}</p>
                              <p className="text-[9px] text-gray-450 dark:text-gray-500 font-mono">{u.rollNumber || u.email}</p>
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



            {}
            {files.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111113] p-4 rounded-2xl border border-gray-200 dark:border-[#27272a] shadow-sm">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={toggleAll}
                    className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition text-xs font-bold"
                  >
                    {selected.size === files.length ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-gray-400" />}
                    <span>{selected.size === files.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <span className="text-[10px] text-gray-400 font-mono">({selected.size} selected)</span>
                </div>

                <div className="flex items-center gap-3">
                  {selected.size > 0 && (
                    <button
                      onClick={downloadSelected}
                      disabled={downloading}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-blue-600/10"
                    >
                      {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Download {selected.size} File{selected.size > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {}
            <div className="bg-white dark:bg-[#111113] border border-gray-200 dark:border-[#27272a] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#151518] flex items-center justify-between">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Course Materials</h4>
                <span className="text-xs text-gray-400 font-mono">
                  {files.length} file{files.length !== 1 ? 's' : ''} synced
                </span>
              </div>

              {loadingDetails ? (
                <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
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
                    const isHighlighted = highlightFileId === file._id;
                    const isSelected = selected.has(file._id);

                    return (
                      <div 
                        key={file._id} 
                        id={`file-row-${file._id}`}
                        className={`transition-all duration-500 ${
                          isHighlighted 
                            ? 'bg-blue-500/15 border-l-4 border-blue-500' 
                            : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1d]/30 border-l-4 border-transparent'
                        }`}
                      >
                        {/* Parent file row */}
                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-4 min-w-0">
                            {/* Checkbox */}
                            <button 
                              onClick={() => toggleSelect(file._id)} 
                              className="text-gray-400 hover:text-gray-650 dark:hover:text-white transition shrink-0"
                            >
                              {isSelected ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4" />}
                            </button>

                            {getFileIcon(file.fileName, file.fileType)}
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-gray-400 font-mono">
                                <span className="uppercase text-blue-500">{file.fileType}</span>
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
                                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500 text-blue-600 dark:text-blue-400 hover:text-white transition-all border border-blue-500/20"
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
                                      className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-405 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
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

      {/* Floating Overlay for Enrolled Student Sections Lookup */}
      {selectedStudentSections && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-gray-200 dark:border-[#333] shadow-2xl p-6 w-full max-w-md animate-slideUp relative">
            <button 
              onClick={() => setSelectedStudentSections(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-50 dark:bg-[#2c2c2f] p-1.5 rounded-full"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
              {selectedStudentSections.student.name}
            </h3>
            <p className="text-xs text-gray-400 font-mono mb-4">
              ID: {selectedStudentSections.student.portalId || 'N/A'}
            </p>

            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Enrolled Section Buckets</label>
            {selectedStudentSections.sections.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-[#141416] rounded-xl border border-dashed border-gray-250 dark:border-[#27272a]">
                Student is not enrolled in any sections.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {selectedStudentSections.sections.map((sec, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectStudentSection(selectedStudentSections.student, sec)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-[#27272a] hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 text-left transition-all text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{sec.courseName}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{sec.courseCode} · Sec {sec.sectionCode}</p>
                    </div>
                    <span className="text-[9px] bg-gray-100 dark:bg-[#27272a] px-2 py-0.5 rounded font-bold uppercase text-gray-500 shrink-0">
                      {sec.semester}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL DOWNLOAD PROGRESS MODAL/OVERLAY */}
      {downloading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center animate-fadeIn p-4">
          <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-[#27272a] rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center animate-scaleIn relative">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 animate-pulse">
              <Download size={32} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Creating Zip Archive</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fetching and packing your course materials from the cloud.
              </p>
            </div>

            {zipProgress ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-450 dark:text-gray-400 uppercase tracking-wider">Progress</span>
                  <span className="text-blue-500 font-mono">
                    {zipProgress.processed} / {zipProgress.total} Files
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden p-[2px] border border-slate-200/20">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${zipProgress.total > 0 ? (zipProgress.processed / zipProgress.total) * 100 : 0}%` }}
                  />
                </div>
                
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {Math.round((zipProgress.total > 0 ? (zipProgress.processed / zipProgress.total) * 100 : 0))}% Completed
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Initializing download job...</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminCourseMaterialsApp;
