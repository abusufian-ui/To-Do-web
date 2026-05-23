import React, { useState, useEffect } from 'react';
import {
    User, Shield, RefreshCw, BookOpen, HelpCircle, Info,
    CheckCircle2, X, AlertTriangle, Lock,
    Calendar, GraduationCap,
    Book, Linkedin, Github, Puzzle, School, ExternalLink, Download,
    ChevronDown, FileText, Activity, CheckSquare, Camera,
    Smartphone, Monitor
} from 'lucide-react';
import UCPLogo from './UCPLogo';
import { StaticLogo } from './StaticLogo';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// --- HELPER: TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    const styles = {
        success: "bg-emerald-600 text-white shadow-emerald-900/20",
        error: "bg-red-600 text-white shadow-red-900/20",
        info: "bg-blue-600 text-white shadow-blue-900/20"
    };
    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 p-4 rounded-xl shadow-xl animate-slideUp ${styles[type] || styles.info}`}>
            {type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose}><X size={16} className="opacity-70 hover:opacity-100" /></button>
        </div>
    );
};

// --- 1. PROFILE TAB ---
// --- 1. PROFILE TAB ---
const ProfileSection = ({ user, showToast, onUpdateProfilePic }) => {
    const [name, setName] = useState(user?.name || "");
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                showToast("Profile updated successfully", "success");
                // Optional: Update local user state if needed
            }
            else showToast("Failed to update profile", "error");
        } catch (e) { showToast("Server error", "error"); }
        setLoading(false);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast("Please select an image file.", "error");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast("Image must be less than 5MB.", "error");
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);

        try {
            setIsUploading(true);
            await onUpdateProfilePic(formData);
            showToast("Profile picture updated!", "success");
        } catch (error) {
            showToast("Upload failed", "error");
        } finally {
            setIsUploading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
    };

    return (
        <div className="animate-fadeIn space-y-8">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
            />

            <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-[#1E1E1E] p-8 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] shadow-sm">
                <div 
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => !isUploading && fileInputRef.current.click()}
                >
                    {user?.profilePic ? (
                        <img 
                            src={user.profilePic} 
                            alt={user.name} 
                            className="w-32 h-32 rounded-full object-cover shadow-xl ring-4 ring-blue-500/10 transition-all group-hover:opacity-75" 
                        />
                    ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-5xl text-white font-bold shadow-xl uppercase transition-all group-hover:opacity-75">
                            {user?.name?.charAt(0)}
                        </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        {isUploading ? <RefreshCw className="text-white animate-spin" size={32} /> : <Camera className="text-white" size={32} />}
                    </div>
                </div>

                <div className="flex-1 space-y-4 w-full text-center md:text-left">
                    <div>
                        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">{user?.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{user?.email}</p>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Shield size={12} /> {user?.isAdmin ? 'Administrator' : 'Student'}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={12} /> Joined {formatDate(user?.createdAt)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] space-y-6 shadow-sm">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Display Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3.5 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={user?.email || ""}
                            disabled
                            className="w-full bg-gray-100 dark:bg-[#252525] border border-transparent rounded-xl px-4 py-3.5 text-gray-500 cursor-not-allowed font-medium"
                        />
                        <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full md:w-auto bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 px-10 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : "Update Profile"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. SECURITY TAB ---
// --- 2. SECURITY TAB ---
const SecuritySection = ({ user, showToast }) => {
    const [autoLock, setAutoLock] = useState(user?.securitySettings?.autoLockEnabled || false);
    const [lockTimer, setLockTimer] = useState(user?.securitySettings?.autoLockTimer || 900000);
    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(false);

    const handleSaveSecurity = async (enabled, timer) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/user/security-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ autoLockEnabled: enabled, autoLockTimer: timer })
            });
            if (res.ok) {
                showToast("Security settings updated", "success");
            } else {
                showToast("Failed to update security", "error");
            }
        } catch (e) { showToast("Server error", "error"); }
        setLoading(false);
    };

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Security & Privacy</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Configure advanced security protocols to protect your academic and financial data.</p>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] shadow-sm space-y-8">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl shrink-0">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white text-lg">Auto-Lock Protection</h4>
                            <p className="text-sm text-gray-500 mt-1 max-w-sm">Automatically lock the interface after a period of inactivity to prevent unauthorized access.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            const newState = !autoLock;
                            setAutoLock(newState);
                            handleSaveSecurity(newState, lockTimer);
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#1E1E1E] ${autoLock ? 'bg-brand-blue' : 'bg-gray-200 dark:bg-[#333]'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoLock ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className={`space-y-4 pt-6 border-t border-gray-100 dark:border-[#2C2C2C] transition-all ${autoLock ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Lock Inactivity Timer</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: '5 Mins', value: 300000 },
                            { label: '15 Mins', value: 900000 },
                            { label: '30 Mins', value: 1800000 },
                            { label: '1 Hour', value: 3600000 }
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setLockTimer(option.value);
                                    handleSaveSecurity(autoLock, option.value);
                                }}
                                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${
                                    lockTimer === option.value 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue text-brand-blue' 
                                    : 'bg-gray-50 dark:bg-[#121212] border-gray-200 dark:border-[#333] text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. PORTAL CONNECTION TAB ---
// --- 3. SYNCING STATUS TAB ---
const SyncingStatusSection = ({ user, showToast }) => {
    // Wizard State
    const [wizardStep, setWizardStep] = useState(1);
    const [verifySuccess, setVerifySuccess] = useState(false);

    // Live Polling
    useEffect(() => {
        let pollInterval;
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/user/portal-status`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                const data = await res.json();
                
                if (data.isConnected) {
                    clearInterval(pollInterval);
                    setVerifySuccess(true);
                    showToast("Connection Established!", "success");
                    setTimeout(() => window.location.reload(), 2000);
                }
            } catch (err) { console.error(err); }
        };

        if (!user.isPortalConnected && wizardStep === 3) {
            checkStatus();
            pollInterval = setInterval(checkStatus, 3000);
        }
        return () => clearInterval(pollInterval);
    }, [wizardStep, user.isPortalConnected, showToast]);

    const isCookieActive = !!user.ucpCookie;

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Syncing Status</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Monitor your background data synchronization with the University Portal.</p>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden shadow-sm">
                
                {/* Status Header */}
                <div className="p-8 border-b border-gray-100 dark:border-[#333] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50/50 dark:bg-[#252525]">
                    <div className="flex items-center gap-5">
                        <div className="flex gap-3">
                            <div className={`p-4 rounded-2xl flex flex-col items-center gap-1 ${user.isPortalConnected ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-100 text-red-500 dark:bg-red-900/20'}`}>
                                <Monitor size={24} className={isCookieActive ? "animate-pulse" : ""} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{user.isPortalConnected ? 'Extension Connected' : 'Extension Disconnected'}</span>
                            </div>
                            <div className={`p-4 rounded-2xl flex flex-col items-center gap-1 ${(user.pushTokens && user.pushTokens.length > 0) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-100 text-red-500 dark:bg-red-900/20'}`}>
                                <Smartphone size={24} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">{(user.pushTokens && user.pushTokens.length > 0) ? 'App Connected' : 'App Disconnected'}</span>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white text-xl flex items-center gap-2">
                                {user.isPortalConnected || (user.pushTokens && user.pushTokens.length > 0) ? "Ecosystem Active" : "Ecosystem Disconnected"}
                                {user.isPortalConnected && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${isCookieActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                                        {isCookieActive ? 'Extension Live' : 'Cookie Expired'}
                                    </span>
                                )}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                                {user.isPortalConnected 
                                    ? `Student ID: ${user.portalId || 'UCP-123'} • Last sync: ${user.lastSyncAt ? new Date(user.lastSyncAt).toLocaleTimeString() : 'Never'}` 
                                    : "Link your portal to start receiving live academic updates."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {/* --- UNLINKED STATE: The Wizard --- */}
                    {!user.isPortalConnected ? (
                        <div className="max-w-2xl mx-auto animate-fadeIn">
                            <h5 className="font-bold text-gray-800 dark:text-white mb-2 text-lg text-center">Secure Setup</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8 text-center max-w-lg mx-auto">
                                Follow these steps to connect your extension. We never store your university password.
                            </p>

                            {/* Wizard Progress */}
                            <div className="flex items-center justify-between w-full mb-10 relative">
                                {[1, 2, 3].map(step => (
                                    <div key={step} className="flex flex-col items-center relative z-10 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500
                                            ${wizardStep > step ? 'bg-emerald-500 text-white' : 
                                            wizardStep === step ? 'bg-brand-blue text-white ring-4 ring-blue-500/20' : 'bg-gray-100 dark:bg-[#252525] text-gray-400'}`}
                                        >
                                            {wizardStep > step ? <CheckCircle2 size={20} /> : step}
                                        </div>
                                    </div>
                                ))}
                                <div className="absolute top-5 left-[16%] right-[16%] h-[2px] bg-gray-100 dark:bg-[#252525] -z-0">
                                    <div className="h-full bg-brand-blue transition-all duration-700 ease-out" style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Wizard Content */}
                            <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-2xl p-8 relative overflow-hidden">
                                
                                {wizardStep === 1 && (
                                    <div className="animate-fadeIn text-center">
                                        <div className="aspect-video w-full max-w-sm mx-auto bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] mb-6 flex items-center justify-center shadow-sm">
                                            <Puzzle size={56} className="text-brand-blue/30" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">1. Install the Bridge</h3>
                                        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">Download the extension zip, extract it, and load it into Chrome via Developer Mode.</p>
                                        <div className="flex gap-4 justify-center">
                                            <a href="/MyPortal-Extension.zip" download className="bg-white dark:bg-[#2C2C2C] hover:bg-gray-50 dark:hover:bg-[#383838] border border-gray-200 dark:border-[#444] text-gray-800 dark:text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 transition-all">
                                                <Download size={18} /> Download
                                            </a>
                                            <button onClick={() => setWizardStep(2)} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                                Continue
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="animate-fadeIn text-center">
                                        <div className="aspect-video w-full max-w-sm mx-auto bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] mb-6 flex items-center justify-center shadow-sm">
                                            <School size={56} className="text-blue-500/30" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">2. Portal Verification</h3>
                                        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">Log into your UCP Horizon portal in a new tab. The extension will automatically detect your session.</p>
                                        <div className="flex gap-4 justify-center">
                                            <a href="https://horizon.ucp.edu.pk" target="_blank" rel="noreferrer" className="bg-white dark:bg-[#2C2C2C] hover:bg-gray-50 dark:hover:bg-[#383838] border border-gray-200 dark:border-[#444] text-gray-800 dark:text-white font-bold py-3.5 px-8 rounded-xl flex items-center gap-2 transition-all">
                                                Open Portal <ExternalLink size={18} />
                                            </a>
                                            <button onClick={() => setWizardStep(3)} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20">
                                                I'm Logged In
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="animate-fadeIn text-center py-8">
                                        {verifySuccess ? (
                                            <div className="animate-slideUp flex flex-col items-center">
                                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 size={40} />
                                                </div>
                                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Authenticated!</h3>
                                                <p className="text-emerald-600 text-sm font-medium">Finalizing your dashboard records...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-28 h-28 flex items-center justify-center mb-8">
                                                    <div className="absolute inset-0 border-4 border-brand-blue/20 rounded-full animate-ping"></div>
                                                    <div className="absolute inset-0 border-4 border-brand-blue rounded-full animate-spin border-t-transparent"></div>
                                                    <RefreshCw size={32} className="text-brand-blue animate-pulse relative z-10" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Listening for Connection</h3>
                                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                                    Open the extension popup and click <strong>Force Sync</strong> if it doesn't start automatically.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-4">
                                <Activity size={20} className="text-emerald-600 dark:text-emerald-400 mt-1" />
                                <div>
                                    <h5 className="font-bold text-emerald-800 dark:text-emerald-400">Cloud Syncing Engine v2.0</h5>
                                    <p className="text-sm text-emerald-700/70 dark:text-emerald-500/70 mt-1 leading-relaxed">
                                        Your extension is securely pushing live academic data (grades, attendance, and timetable) to our cloud servers. You will receive push notifications for any changes.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Cookie Health</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isCookieActive ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                        <span className="text-sm font-bold dark:text-white">{isCookieActive ? 'Healthy & Valid' : 'Expired (Re-login required)'}</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#333] rounded-2xl">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Sync Frequency</span>
                                    <div className="flex items-center gap-2">
                                        <RefreshCw size={14} className="text-brand-blue" />
                                        <span className="text-sm font-bold dark:text-white">Every 30 Minutes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- 4. COURSE MANAGER TAB ---
const CourseSection = ({ courses, addCourse, removeCourse, tasks, showToast }) => {
    const [newCourse, setNewCourse] = useState("");
    const [type, setType] = useState('uni');
    const [deleteModal, setDeleteModal] = useState(null);

    const handleAdd = () => {
        if (!newCourse.trim()) return;
        addCourse(newCourse, type);
        setNewCourse("");
        showToast("Category added successfully", "success");
    };

    const initiateDelete = (course) => {
        const safeTasks = tasks || [];
        const linkedTasks = safeTasks.filter(t => t.course === course.name && !t.isDeleted);

        if (linkedTasks.length > 0) {
            setDeleteModal({ course, linkedTasks });
        } else {
            removeCourse(course._id || course.id);
            showToast("Course removed.", "success");
        }
    };

    const confirmDelete = () => {
        if (deleteModal) {
            removeCourse(deleteModal.course._id || deleteModal.course.id);
            showToast("Course removed. Tasks are now uncategorized.", "success");
            setDeleteModal(null);
        }
    };

    // THE FIX: Strict matching based on your MongoDB data
    const filtered = (courses || []).filter(c => {
        const dbType = String(c.type || '').toLowerCase().trim();
        
        if (type === 'uni') {
            // Matches your DB 'university' type (and 'uni' just in case of old data)
            return dbType === 'university' || dbType === 'uni'; 
        } else {
            // Strictly matches your DB 'general' type
            return dbType === 'general'; 
        }
    });

    // THE FIX: Protect the specific General course from rendering a delete button
    const isProtectedGeneralCourse = (c) => {
        const name = String(c.name || '').trim().toLowerCase();
        const id = String(c.id || c._id || '').trim();
        return id === 'general-task' || name === 'general' || name === 'general course' || name === 'general task';
    };

    return (
        <div className="animate-fadeIn relative">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Course Manager</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Organize your academic courses and personal task categories.</p>
            </div>

            <div className="flex p-1 bg-gray-100 dark:bg-[#1E1E1E] rounded-xl mb-6">
                <button onClick={() => setType('uni')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'uni' ? 'bg-white dark:bg-[#2C2C2C] text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>University Courses</button>
                <button onClick={() => setType('general')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'general' ? 'bg-white dark:bg-[#2C2C2C] text-brand-blue shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>General Courses</button>
            </div>

            {type === 'uni' && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl flex gap-3 animate-slideUp">
                    <Info size={20} className="text-brand-blue mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-bold text-brand-blue text-sm">Auto-Sync Active</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                            University courses are automatically synchronized by your Chrome Extension.
                        </p>
                    </div>
                </div>
            )}

            {type === 'general' && (
                <div className="flex gap-3 mb-6 animate-slideUp">
                    <input
                        type="text"
                        value={newCourse}
                        onChange={(e) => setNewCourse(e.target.value)}
                        placeholder="Enter course or category name..."
                        className="flex-1 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-blue dark:text-white transition-all"
                    />
                    <button onClick={handleAdd} className="bg-brand-blue text-white px-6 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">Add</button>
                </div>
            )}

            <div className="space-y-3 pb-8">
                {filtered.map(c => (
                    <div key={c._id || c.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-xl group hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                        <div className="flex items-center gap-3">
                            {type === 'uni' ? <UCPLogo className="w-8 h-8 text-brand-blue" /> : <Book size={24} className="text-gray-400 group-hover:text-brand-blue transition-colors" />}
                            <div>
                                <span className="font-bold text-gray-800 dark:text-gray-200 block">{c.name}</span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{type === 'uni' ? 'Synced Course' : 'Personal Course'}</span>
                            </div>
                        </div>
                        {type === 'uni' ? (
                            <span className="text-[10px] bg-gray-100 dark:bg-[#252525] text-gray-500 px-2 py-1 rounded border border-gray-200 dark:border-[#444] flex items-center gap-1"><Lock size={10} /> Synced</span>
                        ) : (
                            // THE FIX: Protect the specific General course from rendering a delete button
                            !isProtectedGeneralCourse(c) && (
                                <button onClick={() => initiateDelete(c)} className="text-gray-300 hover:text-red-500 p-2 rounded-lg transition-colors"><X size={20} /></button>
                            )
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-[#1E1E1E] rounded-xl border border-dashed border-gray-200 dark:border-[#333]">
                        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No {type === 'uni' ? 'courses' : 'general courses'} found.</p>
                    </div>
                )}
            </div>

            {/* DELETE MODAL */}
            {deleteModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] p-6 animate-slideUp">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete "{deleteModal.course.name}"?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                You have <strong>{deleteModal.linkedTasks.length} active tasks</strong> under this course.
                                Deleting it will leave these tasks uncategorized.
                            </p>

                            <div className="w-full bg-gray-50 dark:bg-[#121212] rounded-lg p-3 mb-6 max-h-32 overflow-y-auto border border-gray-200 dark:border-[#333] text-left">
                                {deleteModal.linkedTasks.map(t => (
                                    <div key={t.id} className="text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-200 dark:border-[#2C2C2C] last:border-0 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> {t.name}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2C2C2C] hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                                >
                                    Yes, Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 5. HELP SECTION (NEW INTERACTIVE ACCORDION UI) ---
const HelpSection = () => {
    const [expandedId, setExpandedId] = useState(null);

    // Color definitions corresponding to Tailwind classes for safelisting
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
        brand: 'bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-blue-400',
    };

    const helpItems = [
        {
            id: 'portal',
            icon: RefreshCw,
            color: 'brand',
            title: 'Portal Syncing Engine',
            summary: 'Learn how your data is safely retrieved from Horizon.',
            content: 'The Syncing Engine uses a secure Chrome Extension to bridge the gap between your university portal and this dashboard. It scrapes your grades, attendance, and timetable locally in your browser and pushes the updates to our encrypted database. This ensures we never need to store your university password on our servers.'
        },
        {
            id: 'tasks',
            icon: CheckSquare,
            color: 'blue',
            title: 'Tasks & Dashboard',
            summary: 'Manage daily to-dos and categorize them securely.',
            content: 'The Dashboard is your central hub for productivity. You can create tasks, assign them to specific university or personal courses, set priority levels, and track your progress. Simply drag and drop tasks across columns to dynamically change their status from "To Do" to "In Progress" or "Completed".'
        },
        {
            id: 'academics',
            icon: GraduationCap,
            color: 'purple',
            title: 'Academics & Grades',
            summary: 'View your live auto-synced grades and CGPA.',
            content: 'Your academic data is automatically synchronized. Keep an eye on your live CGPA, total earned credits, and detailed semester-wise performance. The system also tracks your attendance and warns you if you are nearing the 75% limit for any course.'
        },
        {
            id: 'security',
            icon: Shield,
            color: 'emerald',
            title: 'Security & Privacy',
            summary: 'How we protect your sensitive information.',
            content: 'We use industry-standard JWT authentication and end-to-end encryption for sensitive fields. Your financial records and academic history are strictly private and accessible only by you. Our "Auto-Lock" feature ensures that even if you leave your device unattended, your data remains secure.'
        },
        {
            id: 'terms',
            icon: FileText,
            color: 'indigo',
            title: 'Terms & Conditions',
            summary: 'Our data usage policy and user agreement.',
            content: (
                <div className="space-y-4">
                    <p>By using MyPortal, you agree to our comprehensive data policy designed to provide a personalized academic experience.</p>
                    <div className="space-y-2">
                        <h5 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider">1. Data Collection</h5>
                        <p className="text-xs">We collect academic data (grades, attendance, courses) and personal settings to provide synchronization services. We do NOT store your university login credentials.</p>
                    </div>
                    <div className="space-y-2">
                        <h5 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider">2. AI & Model Training</h5>
                        <p className="text-xs">To improve our "Hyper Focus" automation and predictive academic alerts, we may use anonymized usage patterns and performance data to train our internal AI models. Your identity remains strictly confidential during this process.</p>
                    </div>
                    <div className="space-y-2">
                        <h5 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider">3. App Functionality</h5>
                        <p className="text-xs">Your data is primarily used to generate visual analytics, financial reports, and habit tracking streaks. We do not sell your data to third parties.</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-4 italic">Last updated: May 2026</p>
                </div>
            )
        }
    ];

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Help Center</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Expand any module below to learn how to maximize your productivity.</p>
            </div>

            <div className="grid gap-4">
                {helpItems.map(item => (
                    <div key={item.id} className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden transition-all">
                        <button
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="w-full text-left p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors focus:outline-none"
                        >
                            <div className="flex gap-4 items-center">
                                <div className={`p-3 rounded-lg flex items-center justify-center shrink-0 ${colorStyles[item.color]}`}>
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-white mb-1">{item.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.summary}</p>
                                </div>
                            </div>
                            <div className={`text-gray-400 transition-transform duration-300 shrink-0 ml-4 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                                <ChevronDown size={20} />
                            </div>
                        </button>
                        
                        {/* Expandable Content Area */}
                        <div 
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedId === item.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                            <div className="p-5 pt-0 border-t border-gray-100 dark:border-[#333] mt-2 bg-gray-50/50 dark:bg-[#1A1A1A]">
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 6. ABOUT SECTION ---
const AboutSection = () => (
    <div className="animate-fadeIn text-center py-12">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/30 mb-6 animate-float">
            <StaticLogo className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">MyPortal</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Next-Gen Student Academic Assistant</p>

        <div className="inline-block bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] rounded-2xl p-8 text-left max-w-sm w-full mx-auto shadow-sm">
            <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-[#333]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Developed By</span>
                    <span className="font-bold text-gray-800 dark:text-white text-sm">abusufian-ui</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-[#333]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student ID</span>
                    <span className="font-mono text-xs bg-gray-100 dark:bg-[#252525] px-2 py-1 rounded text-gray-600 dark:text-gray-300">L1F23BSCS1329</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-[#333]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Institution</span>
                    <div className="flex items-center gap-2">
                        <StaticLogo className="w-4 h-4 text-brand-blue" />
                        <span className="font-bold text-gray-800 dark:text-white text-sm">UCP Lahore</span>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Version</span>
                    <span className="font-bold text-emerald-500 text-sm">2.0.0 (Beta)</span>
                </div>
            </div>
        </div>

        <div className="flex justify-center gap-4 mt-8 animate-slideUp">
            <a
                href="https://www.linkedin.com/in/abu-sufian-71ba2a303/"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 px-5 py-3 bg-[#0077b5] text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all"
            >
                <Linkedin size={20} className="group-hover:animate-bounce" />
                <span className="font-bold text-sm">LinkedIn</span>
            </a>

            <a
                href="https://github.com/abusufian-ui"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 px-5 py-3 bg-[#333] dark:bg-white dark:text-black text-white rounded-xl shadow-lg shadow-gray-500/30 hover:shadow-gray-500/50 hover:scale-105 transition-all"
            >
                <Github size={20} className="group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-sm">GitHub</span>
            </a>
        </div>
    </div>
);

// --- MAIN SETTINGS LAYOUT ---
const Settings = ({
    user = {},
    courses = [],
    addCourse,
    removeCourse,
    tasks = [],
    idleTimeout = 900000,
    setIdleTimeout
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [toast, setToast] = useState({ msg: null, type: null });

    const showToast = (msg, type) => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: null, type: null }), 3000);
    };    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'portal', label: 'Syncing Status', icon: RefreshCw },
        { id: 'courses', label: 'Course Manager', icon: BookOpen },
        { id: 'help', label: 'Help Center', icon: HelpCircle },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="flex h-full w-full animate-fadeIn bg-gray-50 dark:bg-[#0c0c0c] overflow-hidden">
            <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: null, type: null })} />

            {/* LEFT SIDEBAR */}
            <div className="w-64 border-r border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#151518] flex flex-col h-full shrink-0">
                <div className="p-6 pb-2">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Settings</h2>
                </div>
                <div className="px-3 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 
                        ${activeTab === tab.id
                                     ? 'bg-blue-50 dark:bg-blue-900/20 text-brand-blue shadow-sm'
                                     : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] hover:text-gray-900 dark:hover:text-gray-200'
                                 }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? "text-brand-blue" : "opacity-70"} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-[#2C2C2C]">
                    <div className="flex items-center gap-3 opacity-60">
                        <StaticLogo className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-mono text-gray-400">v2.1.0</span>
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-8 md:p-12 relative">
                <div className="max-w-3xl mx-auto pb-24">
                    {activeTab === 'profile' && <ProfileSection user={user} showToast={showToast} onUpdateProfilePic={(formData) => {
                        const token = localStorage.getItem('token');
                        return fetch(`${API_BASE}/api/user/profile-pic`, {
                            method: 'POST',
                            headers: { 'x-auth-token': token },
                            body: formData
                        }).then(res => res.json()).then(data => {
                            // Trigger a reload or update user state globally if needed
                            window.location.reload(); 
                        });
                    }} />}
                    {activeTab === 'security' && <SecuritySection user={user} showToast={showToast} />}
                    {activeTab === 'portal' && <SyncingStatusSection user={user} showToast={showToast} />}
                    {activeTab === 'courses' && <CourseSection courses={courses} addCourse={addCourse} removeCourse={removeCourse} tasks={tasks} showToast={showToast} />}
                    {activeTab === 'help' && <HelpSection />}
                    {activeTab === 'about' && <AboutSection />}
                </div>
            </div>
        </div>
    );
};

export default Settings;