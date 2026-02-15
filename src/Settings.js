import React, { useState } from 'react';
import {
    User, Shield, RefreshCw, BookOpen, HelpCircle, Info,
    CheckCircle2, X, AlertTriangle, Lock,
    Calendar, Wallet, GraduationCap, Layout,
    Book, Linkedin, Github, Puzzle, School, ExternalLink, Download
} from 'lucide-react';
import UCPLogo from './UCPLogo';

const API_BASE = process.env.REACT_APP_API_URL || '';

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
const ProfileSection = ({ user, showToast }) => {
    const [name, setName] = useState(user?.name || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ name })
            });
            if (res.ok) showToast("Profile updated successfully", "success");
            else showToast("Failed to update profile", "error");
        } catch (e) { showToast("Server error", "error"); }
        setLoading(false);
    };

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Personal Information</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Update your display name and view your account details.</p>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] space-y-6 max-w-xl">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Display Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                    <input
                        type="text"
                        value={user?.email || ""}
                        disabled
                        className="w-full bg-gray-100 dark:bg-[#252525] border border-transparent rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><Lock size={10} /> Email cannot be changed.</p>
                </div>
                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 2. SECURITY TAB ---
const SecuritySection = ({ idleTimeout, setIdleTimeout }) => (
    <div className="animate-fadeIn">
        <div className="mb-8">
            <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Security & Session</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage how long you stay logged in to protect your data.</p>
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-xl">
                    <Shield size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">Auto-Lock Timer</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">Automatically lock the screen after a period of inactivity to prevent unauthorized access.</p>
                </div>
            </div>
            <div className="relative">
                <select
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    className="appearance-none w-full md:w-48 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3 text-sm font-medium dark:text-white focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer"
                >
                    <option value={300000}>5 Minutes</option>
                    <option value={900000}>15 Minutes</option>
                    <option value={1800000}>30 Minutes</option>
                    <option value={3600000}>1 Hour</option>
                    <option value={0}>Never</option>
                </select>
            </div>
        </div>
    </div>
);

// --- 3. PORTAL CONNECTION TAB (NO LOGIN FORM) ---
const PortalSection = ({ user, showToast }) => {
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

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

    const confirmUnlink = async () => {
        setIsUnlinking(true);
        try {
            const res = await fetch(`${API_BASE}/api/user/unlink-portal`, {
                method: 'POST',
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            if (res.ok) {
                showToast("Portal disconnected successfully.", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast("Failed to disconnect portal.", "error");
            }
        } catch (e) { showToast("Server error.", "error"); }
        setIsUnlinking(false);
        setShowUnlinkConfirm(false);
    };

    return (
        <div className="animate-fadeIn">
            <div className="mb-8">
                <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Portal Connection</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your secure Chrome Extension connection with the UCP server.</p>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-[#2C2C2C] overflow-hidden shadow-sm">
                
                {/* Status Header */}
                <div className="p-6 border-b border-gray-100 dark:border-[#333] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-[#252525]">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${user.isPortalConnected ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-100 text-red-500 dark:bg-red-900/20'}`}>
                            {user.isPortalConnected ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white text-lg">
                                {user.isPortalConnected ? "Connected via Extension" : "Not Linked"}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {user.isPortalConnected ? `ID: ${user.portalId || 'Active'}` : "Waiting for first extension sync..."}
                            </p>
                        </div>
                    </div>
                    {user.isPortalConnected && (
                        <button onClick={() => setShowUnlinkConfirm(true)} className="px-5 py-2.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl text-sm font-bold transition-colors">
                            Disconnect
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {/* --- UNLINKED STATE: The Wizard --- */}
                    {!user.isPortalConnected && (
                        <div className="max-w-2xl mx-auto animate-fadeIn">
                            <h5 className="font-bold text-gray-800 dark:text-white mb-2 text-lg text-center">Secure Setup</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8 text-center max-w-lg mx-auto">
                                We no longer ask for your password. Follow these steps to connect your extension.
                            </p>

                            {/* Wizard Progress */}
                            <div className="flex items-center justify-between w-full mb-8 relative">
                                {[1, 2, 3].map(step => (
                                    <div key={step} className="flex flex-col items-center relative z-10 flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500
                                            ${wizardStep > step ? 'bg-emerald-500 text-white' : 
                                            wizardStep === step ? 'bg-brand-blue text-white ring-4 ring-blue-500/20' : 'bg-gray-100 dark:bg-[#252525] text-gray-400'}`}
                                        >
                                            {wizardStep > step ? <CheckCircle2 size={16} /> : step}
                                        </div>
                                    </div>
                                ))}
                                <div className="absolute top-4 left-[15%] right-[15%] h-[2px] bg-gray-100 dark:bg-[#252525] -z-0">
                                    <div className="h-full bg-brand-blue transition-all duration-700 ease-out" style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Wizard Content */}
                            <div className="bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-2xl p-6 relative overflow-hidden">
                                
                                {wizardStep === 1 && (
                                    <div className="animate-fadeIn text-center">
                                        <div className="aspect-video w-full max-w-sm mx-auto bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] mb-6 flex items-center justify-center shadow-sm">
                                            {/* <video src="/assets/step1.mp4" autoPlay loop muted /> */}
                                            <Puzzle size={48} className="text-brand-blue/50 animate-bounce" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">1. Load the Extension</h3>
                                        <p className="text-gray-500 text-xs mb-6 max-w-sm mx-auto">Download the zip below, extract it, and load it into Chrome via Developer Mode.</p>
                                        <div className="flex gap-3 justify-center">
                                            <a href="/MyPortal-Extension.zip" download className="bg-gray-200 dark:bg-[#333] hover:bg-gray-300 dark:hover:bg-[#444] text-gray-800 dark:text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                                                <Download size={16} /> Download Zip
                                            </a>
                                            <button onClick={() => setWizardStep(2)} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                                                Next Step
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="animate-fadeIn text-center">
                                        <div className="aspect-video w-full max-w-sm mx-auto bg-white dark:bg-[#252525] rounded-xl border border-gray-200 dark:border-[#333] mb-6 flex items-center justify-center shadow-sm">
                                            {/* <video src="/assets/step2.mp4" autoPlay loop muted /> */}
                                            <School size={48} className="text-blue-500/50 animate-pulse" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">2. Login to Horizon</h3>
                                        <p className="text-gray-500 text-xs mb-6 max-w-sm mx-auto">Log into your university portal in a new tab so the extension can detect your session.</p>
                                        <div className="flex gap-3 justify-center">
                                            <a href="https://horizon.ucp.edu.pk" target="_blank" rel="noreferrer" className="bg-gray-200 dark:bg-[#333] hover:bg-gray-300 dark:hover:bg-[#444] text-gray-800 dark:text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors">
                                                Open Portal <ExternalLink size={16} />
                                            </a>
                                            <button onClick={() => setWizardStep(3)} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                                                Next Step
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="animate-fadeIn text-center py-6">
                                        {verifySuccess ? (
                                            <div className="animate-slideUp flex flex-col items-center">
                                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Success!</h3>
                                                <p className="text-emerald-600 text-sm">Refreshing settings...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                                    <div className="absolute inset-0 border-4 border-brand-blue/20 rounded-full animate-ping"></div>
                                                    <RefreshCw size={28} className="text-brand-blue animate-spin relative z-10" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Awaiting Data...</h3>
                                                <p className="text-gray-500 text-xs max-w-xs mx-auto">
                                                    Open the extension popup and click <strong>Force Sync</strong>. We are listening for the connection.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Skip Button */}
                            {wizardStep < 3 && (
                                <div className="text-center mt-6">
                                    <button onClick={() => window.location.reload()} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium underline">
                                        Skip configuration for now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- LINKED STATE: Show Sync Status --- */}
                    {user.isPortalConnected && (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl animate-fadeIn">
                            <div>
                                <h5 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                                    <RefreshCw size={18} className="animate-spin" /> Background Sync Active
                                </h5>
                                <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">Your extension is actively pushing live data.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CUSTOM UNLINK CONFIRMATION MODAL */}
            {showUnlinkConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2C2C] p-6 animate-slideUp">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Unlink Portal?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                Are you sure you want to disconnect? <strong className="text-gray-800 dark:text-gray-200">All your synced courses, grades, and academic history will vanish</strong> from your dashboard immediately.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setShowUnlinkConfirm(false)} 
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2C2C2C] hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmUnlink} 
                                    disabled={isUnlinking} 
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex justify-center items-center"
                                >
                                    {isUnlinking ? <RefreshCw className="animate-spin" size={18}/> : 'Yes, Vanish Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

    const filtered = (courses || []).filter(c => c.type === type);

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

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
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
                            // --- HIDE DELETE BUTTON FOR DEFAULT COURSE ---
                            (c.id !== 'general-task' && c.name !== 'General Course' && c.name !== 'General Task') && (
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

// --- 5. HELP SECTION ---
const HelpSection = () => (
    <div className="animate-fadeIn">
        <div className="mb-8">
            <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Help Center</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Learn how to maximize your productivity with MyPortal.</p>
        </div>

        <div className="grid gap-4">
            <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-xl border border-gray-200 dark:border-[#333] flex gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-brand-blue rounded-lg h-fit"><Layout size={20} /></div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-1">Dashboard & Tasks</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Your central hub. Manage daily to-dos, categorize them by course, and track your progress. Drag and drop tasks to change their status.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-xl border border-gray-200 dark:border-[#333] flex gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg h-fit"><GraduationCap size={20} /></div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-1">Academics</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        View your auto-synced grades, GPA, and transcript. This data is fetched seamlessly by your Chrome Extension.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-xl border border-gray-200 dark:border-[#333] flex gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg h-fit"><Wallet size={20} /></div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-1">Cash Manager</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Track your income and expenses. Set monthly budgets for categories like Food or Transport to save money effectively.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1E1E1E] p-5 rounded-xl border border-gray-200 dark:border-[#333] flex gap-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg h-fit"><Calendar size={20} /></div>
                <div>
                    <h4 className="font-bold text-gray-800 dark:text-white mb-1">Calendar</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Visualize your deadlines and academic schedule. Switch between Month, Week, and Day views to stay organized.
                    </p>
                </div>
            </div>
        </div>
    </div>
);

// --- 6. ABOUT SECTION ---
const AboutSection = () => (
    <div className="animate-fadeIn text-center py-12">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/30 mb-6 animate-float">
            <UCPLogo className="w-12 h-12 text-white" />
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
                        <UCPLogo className="w-4 h-4 text-brand-blue" />
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
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'portal', label: 'Portal Connection', icon: RefreshCw },
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
                        <UCPLogo className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-mono text-gray-400">v2.0.0</span>
                    </div>
                </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-8 md:p-12 relative">
                <div className="max-w-3xl mx-auto pb-24">
                    {activeTab === 'profile' && <ProfileSection user={user} showToast={showToast} />}
                    {activeTab === 'security' && <SecuritySection idleTimeout={idleTimeout} setIdleTimeout={setIdleTimeout} />}
                    {activeTab === 'portal' && <PortalSection user={user} showToast={showToast} />}
                    {activeTab === 'courses' && <CourseSection courses={courses} addCourse={addCourse} removeCourse={removeCourse} tasks={tasks} showToast={showToast} />}
                    {activeTab === 'help' && <HelpSection />}
                    {activeTab === 'about' && <AboutSection />}
                </div>
            </div>
        </div>
    );
};

export default Settings;