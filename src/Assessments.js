import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Calendar as CalendarIcon, Clock,
  ChevronDown, ChevronRight, ChevronLeft, Book, Trash2,
  X, AlignLeft, Info, Edit2, Save,
  FileText, Users, Presentation, Target, ExternalLink, ShieldAlert
} from 'lucide-react';
import UCPLogo from './UCPLogo'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getAbbreviation = (name) => {
  if (!name || name === 'Select') return name;
  const n = name.toLowerCase().trim();
  if (n.includes('artificial intelligence')) return 'AI';
  if (n.includes('computer communication') || n.includes('computer network')) return 'CCN';
  if (n.includes('operating system')) return 'OS';
  if (n.includes('software engineering')) return 'SE';
  if (n.includes('database')) return 'DB';
  if (name.length > 15) {
    const ignoredWords = ['and', 'of', 'to', 'in', 'introduction', 'lab', 'for', 'the', '&', '-'];
    return name.split(' ').filter(word => !ignoredWords.includes(word.toLowerCase())).map(word => word[0]).join('').toUpperCase().substring(0, 5);
  }
  return name;
};

const formatDateTime = (dateString) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const COL = { name: "flex-1 pl-4", type: "w-[170px]", course: "w-[180px]", date: "w-[160px]", status: "w-[150px]", actions: "w-[60px]" };

const getTypeConfig = (type) => {
  switch (type) {
    case 'Quiz': return { icon: FileText, color: 'text-purple-600 dark:text-purple-400', label: type };
    case 'Assignment': return { icon: Book, color: 'text-blue-600 dark:text-blue-400', label: type };
    case 'Project': return { icon: Presentation, color: 'text-orange-600 dark:text-orange-400', label: type };
    case 'Presentation': return { icon: Presentation, color: 'text-pink-600 dark:text-pink-400', label: type };
    case 'Class Participation': return { icon: Users, color: 'text-emerald-600 dark:text-emerald-400', label: type };
    case 'Portal Task': return { icon: () => <UCPLogo className="w-3.5 h-3.5 fill-current text-blue-500"/>, color: 'text-blue-600 dark:text-blue-400', label: 'Portal Submission' };
    default: return { icon: FileText, color: 'text-gray-500', label: type || 'Other' };
  }
};

const getStatusConfig = (s) => {
  switch (s) {
    case 'Pending': return { icon: Clock, color: 'text-yellow-600 dark:text-yellow-500', label: s };
    case 'Submitted': return { icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400', label: s };
    case 'Graded': return { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-500', label: s };
    case 'Missed': return { icon: ShieldAlert, color: 'text-red-600 dark:text-red-500', label: s };
    default: return { icon: Clock, color: 'text-gray-400', label: s };
  }
};

const CourseIcon = ({ type, name }) => {
  if (type === 'uni') return <UCPLogo className="w-5 h-5 text-blue-600 dark:text-blue-400 opacity-90" />;
  return <Book size={18} className="text-gray-400" />;
};

// --- REUSABLE DROPDOWN FOR MODAL EDITING ---
const ModalDropdown = ({ value, options, onChange, getConfig, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = getConfig ? getConfig(value) : null;
  const CurrentIcon = currentConfig?.icon;

  return (
    <div className={`relative w-full flex-1 ${disabled ? 'opacity-70 pointer-events-none' : ''}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-3 py-1.5 text-xs text-left transition-all focus:border-brand-blue outline-none"
      >
        <span className={`flex items-center gap-2 truncate font-medium ${currentConfig?.color || 'text-gray-700 dark:text-gray-200'}`}>
          {CurrentIcon && <CurrentIcon size={14} />} 
          {value || placeholder}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-lg shadow-xl z-[150] overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
          {options.map(opt => {
            const config = getConfig ? getConfig(opt) : null;
            const Icon = config?.icon;
            return (
              <div 
                key={opt} 
                onClick={() => { onChange(opt); setIsOpen(false); }} 
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-xs ${config?.color || 'text-gray-700 dark:text-gray-200'}`}
              >
                {Icon && <Icon size={14} />} 
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- BEAUTIFUL COURSE SELECTOR FOR MODAL ---
const CourseSelectModal = ({ value, courses, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type !== 'uni');
  const currentCourse = courses.find(c => c.name === value);
  const courseType = currentCourse?.type || 'general';

  return (
    <div className={`relative w-full flex-1 ${disabled ? 'opacity-70 pointer-events-none' : ''}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-3 py-1.5 text-xs text-left transition-all focus:border-brand-blue outline-none"
      >
        <span className="flex items-center gap-2 truncate font-medium text-gray-700 dark:text-gray-200">
          {value ? <CourseIcon type={courseType} name={value} /> : <Book size={14} className="text-gray-400" />}
          {value || "Select Course"}
        </span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-[240px] mt-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl shadow-xl z-[150] max-h-[300px] overflow-y-auto custom-scrollbar py-1">
          {uniCourses.length > 0 && (
             <div className="mb-1">
               <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#252525] sticky top-0 z-10 flex items-center gap-2">
                 <UCPLogo className="w-3 h-3 text-brand-blue" /> University Courses
               </div>
               {uniCourses.map(c => (
                 <div key={c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex flex-col">
                   <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                   <span className="text-[10px] text-gray-500 truncate">{c.name}</span>
                 </div>
               ))}
             </div>
          )}
          {generalCourses.length > 0 && (
             <div>
               <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#252525] sticky top-0 z-10 flex items-center gap-2">
                 <Book size={12} className="text-gray-400" /> General Courses
               </div>
               {generalCourses.map(c => (
                 <div key={c.name} onClick={() => { onChange(c.name); setIsOpen(false); }} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex flex-col">
                   <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                   <span className="text-[10px] text-gray-500 truncate">{c.name}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
      )}
    </div>
  );
};

const Dropdown = ({ id, value, options, onChange, colorClass, icon: Icon, getOptionConfig, openDropdownId, setOpenDropdownId, disabled }) => {
  const isOpen = openDropdownId === id;
  const handleSelect = (opt) => { onChange(opt); setOpenDropdownId(null); };
  return (
    <div className="relative custom-dropdown w-full">
      <button 
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if(!disabled) setOpenDropdownId(isOpen ? null : id); }} 
        className={`flex items-center gap-2 text-sm ${colorClass} ${disabled ? 'opacity-70 cursor-default' : 'hover:opacity-80 cursor-pointer'} text-left w-full font-medium py-1 truncate`}
      >
        {Icon && <Icon size={16} />} {value}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-white dark:bg-[#1E1E1E] rounded-md shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-50 overflow-hidden">
          {options.map((opt) => {
            const config = getOptionConfig ? getOptionConfig(opt) : {};
            const ConfigIcon = config.icon;
            return (
              <div key={opt} onClick={() => handleSelect(opt)} className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer text-sm flex items-center gap-2 ${config.color || "text-gray-700 dark:text-gray-200"}`}>
                {ConfigIcon && <ConfigIcon size={16} />} <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DateCell = ({ date, onChange, disabled }) => {
  const inputRef = useRef(null);
  const displayDate = formatDateTime(date);

  if (disabled) {
    return (
      <div className="h-full flex flex-col justify-center cursor-default opacity-90">
         <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{displayDate}</span>
      </div>
    );
  }

  return (
    <div className="relative group h-full flex flex-col justify-center cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); inputRef.current.showPicker(); }}>
      <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{displayDate}</span>
      <input ref={inputRef} type="datetime-local" value={date ? new Date(date).toISOString().slice(0, 16) : ''} onChange={(e) => onChange(e.target.value)} className="absolute opacity-0 w-0 h-0 dark:[color-scheme:dark]" />
    </div>
  );
};

const AssessmentModal = ({ isOpen, onClose, assessment, courses, onSave, token, handleOverride }) => {
  const [form, setForm] = useState({ title: '', courseName: '', type: 'Quiz', dueDate: '', status: 'Pending', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const isNew = !assessment?._id && !assessment?.id;
  const isPortal = assessment?.source === 'portal';

  useEffect(() => {
    if (isOpen) {
      if (assessment) {
        setForm({
          title: assessment.title || '',
          courseName: assessment.courseName || '',
          type: assessment.type || 'Quiz',
          dueDate: assessment.dueDate ? new Date(assessment.dueDate).toISOString().slice(0, 16) : '',
          status: assessment.status || 'Pending',
          description: assessment.description || ''
        });
        setIsEditing(isNew);
      } else {
        setForm({ title: '', courseName: '', type: 'Quiz', dueDate: '', status: 'Pending', description: '' });
        setIsEditing(true);
      }
    }
  }, [isOpen, assessment, isNew]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idToUpdate = assessment?._id || assessment?.id;

    try {
      if (isNew) {
        await fetch(`${API_BASE}/api/assessments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(form)
        });
      } else {
        if (isPortal) {
           // Locally save overrides to survive backend sync resets
           handleOverride(idToUpdate, 'status', form.status);
           handleOverride(idToUpdate, 'description', form.description);
        }

        await fetch(`${API_BASE}/api/assessments/${idToUpdate}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify(form)
        });
      }
      onSave();
      onClose();
    } catch (err) { console.error("Error saving", err); }
  };

  const tConfig = getTypeConfig(form.type);
  const TypeIcon = tConfig.icon;
  const sConfig = getStatusConfig(form.status);
  const currentCourse = courses.find(c => c.name === form.courseName);
  const courseType = currentCourse?.type || 'general';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] animate-slideUp overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl"><Target className="text-brand-blue" size={20} /></div>
            <h2 className="text-xl font-bold dark:text-white text-gray-800">{isNew ? 'Add Assessment' : 'Assessment Details'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button type="button" onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isEditing ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-[#333] text-gray-500 hover:text-brand-blue'}`}>
                {isEditing ? 'Cancel Edit' : <><Edit2 size={14} /> Edit</>}
              </button>
            )}
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-full text-gray-400"><X size={20} /></button>
          </div>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              {isEditing && !isPortal ? (
                <input required type="text" placeholder="Assessment Title..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full text-2xl font-extrabold bg-transparent border-b border-gray-300 dark:border-[#333] focus:border-brand-blue text-gray-900 dark:text-white outline-none py-1" />
              ) : (
                <>
                  <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">{form.title}</h1>
                  {isPortal && <p className="text-xs text-brand-blue mt-2 flex items-center gap-1"><Info size={12}/> Synced automatically from University Portal. You can only edit the status & description.</p>}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm min-h-[32px]">
                  <CalendarIcon className="text-brand-pink shrink-0" size={16} /> 
                  <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Due Date</span>
                  {isEditing && !isPortal ? (
                    <input required type="datetime-local" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="flex-1 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded px-3 py-1.5 text-xs outline-none dark:text-white dark:[color-scheme:dark]" />
                  ) : (
                    <span className="dark:text-gray-200 font-medium bg-gray-50 dark:bg-[#2C2C2C] px-2 py-0.5 rounded-md text-xs">{formatDateTime(form.dueDate)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm min-h-[32px] z-[120]">
                  <Book className="text-blue-500 shrink-0" size={16} /> 
                  <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Course</span>
                  {isEditing && !isPortal ? (
                    <CourseSelectModal value={form.courseName} courses={courses} onChange={val => setForm({...form, courseName: val})} />
                  ) : (
                    <span className="dark:text-gray-200 font-medium flex items-center gap-1.5 bg-gray-50 dark:bg-[#2C2C2C] px-2 py-0.5 rounded-md text-xs"><CourseIcon type={courseType} name={form.courseName} /> {form.courseName}</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm min-h-[32px] z-[110]">
                  <TypeIcon size={16} className={tConfig.color.split(' ')[0]} /> 
                  <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Type</span>
                  {isEditing && !isPortal ? (
                     <ModalDropdown 
                        value={form.type} 
                        options={['Quiz', 'Assignment', 'Project', 'Presentation', 'Class Participation', 'Other']} 
                        onChange={val => setForm({...form, type: val})} 
                        getConfig={getTypeConfig} 
                     />
                  ) : (
                    <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${tConfig.color}`}>{form.type}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm min-h-[32px] z-[100]">
                  <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                  <span className="text-gray-500 w-20 shrink-0 font-bold text-[10px] uppercase tracking-wider">Status</span>
                  {isEditing ? ( 
                     <ModalDropdown 
                        value={form.status} 
                        options={['Pending', 'Submitted', 'Graded', 'Missed']} 
                        onChange={val => setForm({...form, status: val})} 
                        getConfig={getStatusConfig} 
                     />
                  ) : (
                    <span className={`font-medium flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-gray-50 dark:bg-[#2C2C2C] ${sConfig.color}`}><sConfig.icon size={14} /> {form.status}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-gray-100 dark:border-[#2C2C2C]">
              <div className="flex items-center gap-3 text-sm mb-3">
                <AlignLeft className="text-gray-400 shrink-0" size={16} /> 
                <span className="text-gray-500 font-bold text-[10px] uppercase tracking-wider">Description / Notes</span>
              </div>
              {isEditing ? (
                 <textarea 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                    placeholder="Add details, links, or notes manually..."
                    className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-brand-blue outline-none min-h-[100px] resize-none custom-scrollbar"
                 />
              ) : (
                 <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-[#181818] p-4 rounded-xl border border-gray-100 dark:border-[#2C2C2C] min-h-[80px]">
                    {form.description || <span className="italic opacity-60">No additional details provided.</span>}
                 </div>
              )}
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end">
                <button type="submit" className="bg-brand-blue hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all">
                  <Save size={16} /> Save Details
                </button>
              </div>
            )}
            
            {!isEditing && isPortal && assessment.url && (
               <div className="mt-6 bg-gray-50 dark:bg-[#181818] p-4 rounded-xl border border-gray-100 dark:border-[#2C2C2C] flex items-center justify-between">
                 <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View on University Portal</span>
                 <a href={assessment.url} target="_blank" rel="noopener noreferrer" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-200 transition-colors">
                   Open Link <ExternalLink size={14} />
                 </a>
               </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const Assessments = ({ token, assessments, courses, fetchAssessments, externalAddTrigger, viewAssessment, setViewAssessment }) => {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [modalData, setModalData] = useState({ isOpen: false, assessment: null });

  // State to hold local overrides for portal tasks to prevent backend syncs from resetting manual status changes
  const [localOverrides, setLocalOverrides] = useState(() => {
    const saved = localStorage.getItem('portalAssessmentOverrides');
    return saved ? JSON.parse(saved) : {};
  });

  const handleOverride = (id, field, value) => {
    setLocalOverrides(prev => {
      const updated = { ...prev, [id]: { ...(prev[id] || {}), [field]: value } };
      localStorage.setItem('portalAssessmentOverrides', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (externalAddTrigger > 0) setModalData({ isOpen: true, assessment: null });
  }, [externalAddTrigger]);

  useEffect(() => {
    if (viewAssessment) {
      setModalData({ isOpen: true, assessment: viewAssessment });
      setViewAssessment(null);
    }
  }, [viewAssessment, setViewAssessment]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.custom-dropdown')) setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdate = async (id, field, value) => {
    const assessment = assessments.find(a => a.id === id || a._id === id);
    if (!assessment || (assessment.source === 'portal' && !['description', 'status'].includes(field))) return;

    // Locally save overrides for portal tasks instantly
    if (assessment.source === 'portal') {
      handleOverride(id, field, value);
    }

    try {
      await fetch(`${API_BASE}/api/assessments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ [field]: value })
      });
      fetchAssessments();
    } catch (err) { console.error("Failed to update"); }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/api/assessments/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      fetchAssessments();
    } catch (err) { console.error("Failed to delete"); }
  };

  // Pre-process assessments: apply overrides and auto-miss logic
  const now = new Date();
  const processedAssessments = assessments.map(a => {
    const id = a.id || a._id;
    const override = localOverrides[id] || {};
    
    let finalStatus = a.status;
    
    // CRITICAL FIX: Only auto-mark as missed if the user hasn't explicitly set a custom status
    if (override.status) {
        finalStatus = override.status; // Strongly respect user's manual choice
    } else if (a.source === 'portal' && a.status === 'Pending' && a.dueDate && new Date(a.dueDate) < now) {
        finalStatus = 'Missed'; // Auto-mark as missed if untouched and past due date
    }

    const finalDesc = override.description !== undefined ? override.description : a.description;

    return { ...a, status: finalStatus, description: finalDesc };
  });

  const pendingAssessments = processedAssessments.filter(a => a.status === 'Pending' || a.status === 'Missed');
  const completedAssessments = processedAssessments.filter(a => a.status === 'Submitted' || a.status === 'Graded');

  const pendingPortal = pendingAssessments.filter(a => a.source === 'portal');
  const pendingManual = pendingAssessments.filter(a => a.source !== 'portal');

  const completedPortal = completedAssessments.filter(a => a.source === 'portal');
  const completedManual = completedAssessments.filter(a => a.source !== 'portal');

  const uniCourses = courses.filter(c => c.type === 'uni');
  const generalCourses = courses.filter(c => c.type !== 'uni');

  const renderRow = (assessment) => {
    const typeConfig = getTypeConfig(assessment.type);
    const TypeIcon = typeConfig.icon;
    const statusConfig = getStatusConfig(assessment.status);
    const currentCourse = courses.find(c => c.name === assessment.courseName);
    const isPortal = assessment.source === 'portal';
    const isCompleted = assessment.status === 'Submitted' || assessment.status === 'Graded';

    return (
      <div key={assessment.id || assessment._id} className="border-b border-gray-200 dark:border-[#2C2C2C]">
        <div onClick={() => setModalData({ isOpen: true, assessment })} className={`group flex items-center py-3 px-0 transition-all cursor-pointer ${isCompleted ? 'bg-gray-50 dark:bg-[#121212]' : 'bg-white dark:bg-[#181818] hover:bg-gray-50 dark:hover:bg-[#202020]'}`}>
          
          <div className={`${COL.name} flex items-center gap-3 text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
            <span className="truncate">{assessment.title}</span>
          </div>

          <div className={COL.type} onClick={e => e.stopPropagation()}>
            {isPortal ? (
               <div className={`flex items-center gap-2 text-sm ${typeConfig.color} font-medium py-1 truncate`}>
                  <TypeIcon size={16} /> {typeConfig.label}
               </div>
            ) : (
               <Dropdown 
                 id={`${assessment.id || assessment._id}-type`} 
                 value={assessment.type} 
                 icon={typeConfig.icon} 
                 options={['Quiz', 'Assignment', 'Project', 'Presentation', 'Class Participation', 'Other']} 
                 onChange={(val) => handleUpdate(assessment.id || assessment._id, 'type', val)} 
                 colorClass={typeConfig.color} 
                 getOptionConfig={getTypeConfig} 
                 openDropdownId={openDropdownId} 
                 setOpenDropdownId={setOpenDropdownId}
               />
            )}
          </div>

          <div className={COL.course} onClick={e => e.stopPropagation()}>
             {isPortal ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium py-1 truncate" title={assessment.courseName}>
                  <CourseIcon type={currentCourse?.type || 'general'} name={assessment.courseName} /> 
                  {getAbbreviation(assessment.courseName) || "Unknown"}
                </div>
             ) : (
                <div className="relative custom-dropdown w-full">
                  <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === `${assessment.id || assessment._id}-course` ? null : `${assessment.id || assessment._id}-course`); }} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:opacity-80 text-left w-full font-medium py-1 truncate" title={assessment.courseName}>
                    <CourseIcon type={currentCourse?.type || 'general'} name={assessment.courseName} /> {getAbbreviation(assessment.courseName) || "Select Course"}
                  </button>

                  {openDropdownId === `${assessment.id || assessment._id}-course` && (
                    <div className="absolute top-full left-0 mt-1 w-[200px] bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-gray-200 dark:border-[#2C2C2C] z-[100] animate-fadeIn py-1">
                      <div className="group/uni relative">
                        <div className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-default text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 font-medium">
                          <div className="flex items-center gap-3"><UCPLogo className="w-4 h-4 text-blue-600 shrink-0" /> <span>University Courses</span></div>
                          <ChevronLeft size={14} className="text-gray-400" />
                        </div>
                        <div className="hidden group-hover/uni:block absolute right-full top-0 w-[240px] pr-1 z-[110]">
                          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] max-h-[250px] overflow-y-auto custom-scrollbar py-1">
                            {uniCourses.length > 0 ? uniCourses.map((c) => (
                              <div key={c.id || c._id || c.name} onClick={() => { handleUpdate(assessment.id || assessment._id, 'courseName', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
                                <UCPLogo className="w-5 h-5 text-blue-600 shrink-0" /> 
                                <div className="flex flex-col overflow-hidden w-full">
                                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                                  <span className="text-[10px] text-gray-400 truncate">{c.name}</span>
                                </div>
                              </div>
                            )) : <div className="px-4 py-3 text-xs text-gray-500 italic">No synced courses</div>}
                          </div>
                        </div>
                      </div>

                      <div className="group/gen relative border-t border-gray-100 dark:border-[#2C2C2C]">
                        <div className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#333] cursor-default text-sm flex items-center justify-between text-gray-700 dark:text-gray-200 font-medium">
                          <div className="flex items-center gap-3"><Book size={16} className="text-gray-400 shrink-0" /> <span>General Courses</span></div>
                          <ChevronLeft size={14} className="text-gray-400" />
                        </div>
                        <div className="hidden group-hover/gen:block absolute right-full top-0 w-[240px] pr-1 z-[110]">
                          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] max-h-[250px] overflow-y-auto custom-scrollbar py-1">
                            {generalCourses.length > 0 ? generalCourses.map((c) => (
                              <div key={c.id || c._id || c.name} onClick={() => { handleUpdate(assessment.id || assessment._id, 'courseName', c.name); setOpenDropdownId(null); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#333] cursor-pointer flex items-center gap-3" title={c.name}>
                                <Book size={16} className="text-gray-400 shrink-0" /> 
                                <div className="flex flex-col overflow-hidden w-full">
                                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate">{getAbbreviation(c.name)}</span>
                                  <span className="text-[10px] text-gray-400 truncate">{c.name}</span>
                                </div>
                              </div>
                            )) : <div className="px-4 py-3 text-xs text-gray-500 italic">No general courses</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
             )}
          </div>

          <div className={COL.date} onClick={e => e.stopPropagation()}>
            <DateCell date={assessment.dueDate} onChange={(val) => handleUpdate(assessment.id || assessment._id, 'dueDate', val)} disabled={isPortal} />
          </div>

          <div className={COL.status} onClick={e => e.stopPropagation()}>
            <Dropdown 
              id={`${assessment.id || assessment._id}-status`} 
              value={statusConfig.label} 
              icon={statusConfig.icon} 
              options={['Pending', 'Submitted', 'Graded', 'Missed']} 
              onChange={(val) => handleUpdate(assessment.id || assessment._id, 'status', val)} 
              colorClass={statusConfig.color} 
              getOptionConfig={getStatusConfig} 
              openDropdownId={openDropdownId} 
              setOpenDropdownId={setOpenDropdownId}
              disabled={false} 
            />
          </div>

          <div className={`${COL.actions} text-right pr-4`} onClick={e => e.stopPropagation()}>
             {!isPortal ? (
               <button onClick={() => handleDelete(assessment.id || assessment._id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
             ) : (
               <span className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 cursor-not-allowed" title="Cannot delete synced portal assessments"><ShieldAlert size={16} /></span>
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 w-full animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Target className="text-brand-blue" size={32} />
            Assessments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Unified view of your portal submissions and manual assignments.</p>
        </div>
      </div>

      <div className="mb-8">
        <button onClick={() => setShowPending(!showPending)} className="flex items-center gap-2 mb-3 group focus:outline-none">
          {showPending ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
          <h2 className="text-gray-800 dark:text-white font-bold text-sm">Pending & Upcoming</h2>
          <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 text-xs px-2 py-0.5 rounded-full font-bold">{pendingAssessments.length}</span>
        </button>

        {showPending && (
          <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
            <div className="min-w-[850px]">
              <div className="flex text-xs text-gray-500 dark:text-[#71717A] border-b border-gray-200 dark:border-[#2C2C2C] pb-2 px-0 font-bold uppercase tracking-wider">
                <div className={COL.name}>Title</div>
                <div className={COL.type}>Type</div>
                <div className={COL.course}>Course</div>
                <div className={COL.date}>Due Date</div>
                <div className={COL.status}>Status</div>
                <div className={COL.actions}></div>
              </div>
              
              {pendingAssessments.length === 0 && <p className="py-6 text-center text-gray-500 text-sm italic">You are all caught up!</p>}

              {/* Categorized rendering for Pending */}
              {pendingPortal.length > 0 && (
                 <div>
                   <div className="pt-4 pb-2">
                     <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pl-2">
                       <UCPLogo className="w-3.5 h-3.5 text-brand-blue" />
                       Portal Submissions
                     </h3>
                   </div>
                   {pendingPortal.map(a => renderRow(a))}
                 </div>
              )}
              {pendingManual.length > 0 && (
                 <div>
                   <div className="pt-6 pb-2">
                     <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pl-2">
                       <Book className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                       Manual Assessments
                     </h3>
                   </div>
                   {pendingManual.map(a => renderRow(a))}
                 </div>
              )}
            </div>
          </div>
        )}
      </div>

      {completedAssessments.length > 0 && (
        <div className="animate-fadeIn">
          <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2 mb-3 group focus:outline-none">
            {showCompleted ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
            <h2 className="text-gray-800 dark:text-white font-bold text-sm">Completed</h2>
            <span className="bg-gray-200 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">{completedAssessments.length}</span>
          </button>
          
          {showCompleted && (
            <div className="w-full overflow-x-auto lg:overflow-visible pb-6">
              <div className="min-w-[850px]">
                  {/* Categorized rendering for Completed */}
                  {completedPortal.length > 0 && (
                     <div>
                       <div className="pt-4 pb-2">
                         <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pl-2">
                           <UCPLogo className="w-3.5 h-3.5 text-brand-blue opacity-70" />
                           Portal Submissions
                         </h3>
                       </div>
                       {completedPortal.map(a => renderRow(a))}
                     </div>
                  )}
                  {completedManual.length > 0 && (
                     <div>
                       <div className="pt-6 pb-2">
                         <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 pl-2">
                           <Book className="w-3.5 h-3.5 text-orange-500/70 dark:text-orange-400/70" />
                           Manual Assessments
                         </h3>
                       </div>
                       {completedManual.map(a => renderRow(a))}
                     </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      <AssessmentModal isOpen={modalData.isOpen} onClose={() => setModalData({ isOpen: false, assessment: null })} assessment={modalData.assessment} courses={courses} onSave={fetchAssessments} token={token} handleOverride={handleOverride} />
    </div>
  );
};

export default Assessments;