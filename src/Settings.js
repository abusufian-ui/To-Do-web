import React, { useState, useEffect, useCallback } from 'react';
import {
    User, Shield, RefreshCw, BookOpen, HelpCircle, Info,
    CheckCircle2, X, AlertTriangle, Lock,
    Calendar,
    Book, Puzzle, School, ExternalLink, Download,
    ChevronDown, FileText, Activity, Camera,
    Smartphone, Monitor, Eye, EyeOff,
    Send, UploadCloud, LifeBuoy, MessageSquare
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
const ProfileSection = ({ user, showToast, onUpdateProfilePic, onUpdatePrivacy }) => {
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
                    {(user?.customProfilePic || user?.portalProfilePic || user?.originalPortalProfilePic || user?.profilePic) ? (
                        <img 
                            src={user.customProfilePic || user.portalProfilePic || user.originalPortalProfilePic || user.profilePic} 
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
                    <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                            {(user?.showProfilePicToCommunity ?? false) ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-amber-500" />}
                            Profile Pic:
                        </span>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const currentVal = user?.showProfilePicToCommunity ?? false;
                                    await onUpdatePrivacy(!currentVal);
                                    showToast(`Profile picture is now ${!currentVal ? 'public' : 'private'}.`, "success");
                                } catch (err) {
                                    showToast(err.message || "Failed to update visibility.", "error");
                                }
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                (user?.showProfilePicToCommunity ?? false) ? 'bg-blue-600' : 'bg-gray-300 dark:bg-[#333]'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    (user?.showProfilePicToCommunity ?? false) ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            (user?.showProfilePicToCommunity ?? false) 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                        }`}>
                            {(user?.showProfilePicToCommunity ?? false) ? 'Public' : 'Private'}
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
const CourseSection = ({ courses, addCourse, removeCourse, tasks, showToast, user }) => {
    const [newCourse, setNewCourse] = useState("");
    const [type, setType] = useState('uni');
    const [deleteModal, setDeleteModal] = useState(null);
    const [localPreferences, setLocalPreferences] = useState(user?.coursePreferences || {});

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const toggleVisibility = async (courseName, currentHidden) => {
        const isVisible = currentHidden; // If currently hidden, we want to make it visible
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/user/course-preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ courseName, isVisible })
            });
            if (res.ok) {
                const data = await res.json();
                setLocalPreferences(data.coursePreferences || {});
                showToast(isVisible ? "Course unhidden" : "Course hidden", "success");
                // Trigger a global reload to update the sidebar/views if necessary
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            showToast("Failed to update visibility", "error");
        }
    };

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
                                <span className="font-bold text-gray-800 dark:text-gray-200 block">
                                    {c.name}
                                    {type === 'uni' && c.creditHrs === 0 && <span className="ml-2 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">0 CR</span>}
                                </span>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{type === 'uni' ? 'Synced Course' : 'Personal Course'}</span>
                            </div>
                        </div>
                        {type === 'uni' ? (
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const explicitPref = localPreferences[c.name];
                                    // Hidden if explicitPref is exactly false, OR if no explicit pref and 0 credit hours
                                    const isHidden = explicitPref === false || (explicitPref === undefined && c.creditHrs === 0);
                                    
                                    return (
                                        <button 
                                            onClick={() => toggleVisibility(c.name, isHidden)}
                                            className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-colors ${
                                                isHidden 
                                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400' 
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30 dark:text-emerald-400'
                                            }`}
                                        >
                                            {isHidden ? <><EyeOff size={12} /> Hidden</> : <><Eye size={12} /> Visible</>}
                                        </button>
                                    );
                                })()}
                                <span className="text-[10px] bg-gray-100 dark:bg-[#252525] text-gray-500 px-2 py-1 rounded border border-gray-200 dark:border-[#444] flex items-center gap-1 hidden sm:flex"><Lock size={10} /> Synced</span>
                            </div>
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

// --- 5. SUPPORT & HELP SECTION (TICKET SYSTEM WITH SCREENSHOT UPLOADS) ---
const SupportHelpSection = ({ showToast }) => {
    const [activeSubTab, setActiveSubTab] = useState('create');
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [mediaFiles, setMediaFiles] = useState([]); // Array of { file, previewUrl }
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [tickets, setTickets] = useState([]);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const fetchUserTickets = useCallback(async () => {
        setIsLoadingTickets(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/feedback/my`, {
                headers: { "x-auth-token": token },
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setTickets(data);
            }
        } catch (err) {
            console.error("Error loading user tickets:", err);
        } finally {
            setIsLoadingTickets(false);
        }
    }, [API_BASE]);

    useEffect(() => {
        if (activeSubTab === 'my') {
            fetchUserTickets();
        }
    }, [activeSubTab, fetchUserTickets]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const validFiles = files.filter(file => {
            if (!file.type.startsWith('image/')) {
                showToast("Please select image files only.", "error");
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast(`File ${file.name} is too large (max 5MB).`, "error");
                return false;
            }
            return true;
        });

        const newMedia = validFiles.map(file => ({
            file,
            previewUrl: URL.createObjectURL(file),
            name: file.name
        }));

        setMediaFiles(prev => [...prev, ...newMedia]);
    };

    const removeMedia = (index) => {
        setMediaFiles(prev => {
            const item = prev[index];
            if (item && item.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            showToast("Please enter both a title and description.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast("Session expired, please log in again.", "error");
                setIsSubmitting(false);
                return;
            }

            let uploadedUrls = [];

            // 1. Upload screenshots if any exist
            if (mediaFiles.length > 0) {
                const formData = new FormData();
                mediaFiles.forEach(media => {
                    formData.append("files", media.file);
                });

                const uploadRes = await fetch(`${API_BASE}/api/upload`, {
                    method: "POST",
                    headers: { "x-auth-token": token },
                    body: formData,
                });

                if (!uploadRes.ok) throw new Error("Upload failed");
                const uploadData = await uploadRes.json();
                if (uploadData.urls) {
                    uploadedUrls = uploadData.urls;
                }
            }

            // 2. Submit ticket
            const res = await fetch(`${API_BASE}/api/feedback`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": token,
                },
                body: JSON.stringify({
                    subject,
                    description,
                    screenshots: uploadedUrls,
                }),
            });

            if (res.ok) {
                showToast("Support ticket created successfully!", "success");
                setSubject("");
                setDescription("");
                setMediaFiles([]);
                setActiveSubTab('my'); // Switch to My Tickets
            } else {
                const errorData = await res.json();
                showToast(errorData.message || "Failed to submit ticket.", "error");
            }
        } catch (error) {
            console.error("Feedback error:", error);
            showToast("Connection issue, please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold dark:text-white text-gray-800 mb-2">Support & Help</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Submit technical queries and review resolutions from our system admins.</p>
                </div>
                <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue shrink-0 hidden sm:block">
                    <LifeBuoy size={32} className="animate-spin-slow" />
                </div>
            </div>

            {/* Custom Sub Tabs */}
            <div className="flex bg-gray-100 dark:bg-[#1E1E1E] p-1 rounded-xl mb-8">
                <button
                    type="button"
                    onClick={() => setActiveSubTab('create')}
                    className={`flex-grow py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeSubTab === 'create'
                            ? 'bg-white dark:bg-[#2C2C2C] text-brand-blue shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <MessageSquare size={16} /> Create Ticket
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSubTab('my')}
                    className={`flex-grow py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        activeSubTab === 'my'
                            ? 'bg-white dark:bg-[#2C2C2C] text-brand-blue shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <FileText size={16} /> My Tickets
                </button>
            </div>

            {/* Tab content */}
            {activeSubTab === 'create' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white dark:bg-[#1E1E1E] p-8 rounded-2xl border border-gray-200 dark:border-[#2C2C2C] shadow-sm space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Problem Title</label>
                            <input
                                type="text"
                                placeholder="e.g., Attendance Scraper Stuck, Double Payment..."
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3.5 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium text-sm"
                                maxLength={80}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Problem Description</label>
                            <textarea
                                placeholder="Describe your issue in detail so that our technical admins can resolve it quickly..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={6}
                                className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl px-4 py-3.5 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none transition-all font-medium text-sm resize-none"
                                required
                            />
                        </div>

                        {/* Screenshots Preview container */}
                        {mediaFiles.length > 0 && (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Attached Screenshots ({mediaFiles.length})</label>
                                <div className="flex flex-wrap gap-4">
                                    {mediaFiles.map((media, idx) => (
                                        <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-black/10 dark:bg-black/40 shrink-0">
                                            <img
                                                src={media.previewUrl}
                                                alt="preview"
                                                className="object-cover w-full h-full"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 border border-white dark:border-[#1E1E1E] transition-all shadow-md group-hover:scale-105"
                                                title="Remove Image"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dropzone Upload */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Upload Snapshots</label>
                            <label className="group flex flex-col items-center justify-center w-full h-36 bg-gray-50 dark:bg-[#121212] border-2 border-dashed border-gray-200 dark:border-[#333] hover:border-brand-blue dark:hover:border-brand-blue rounded-2xl cursor-pointer transition-all">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud size={32} className="text-gray-400 group-hover:text-brand-blue transition-colors mb-2" />
                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 font-bold">Drag & drop screenshots or click to browse</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Images only (Max 5MB)</p>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full md:w-auto bg-brand-blue hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <RefreshCw className="animate-spin" size={18} />
                            ) : (
                                <>
                                    <Send size={16} /> Submit Support Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    {isLoadingTickets ? (
                        <div className="text-center py-16 flex flex-col items-center gap-4">
                            <RefreshCw className="animate-spin text-brand-blue w-8 h-8" />
                            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider animate-pulse">Loading Support Tickets...</p>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-dashed border-gray-200 dark:border-[#333] shadow-sm">
                            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2 text-lg">No tickets filed yet</h4>
                            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                                Any support tickets you submit will be shown here along with their status and admin feedback.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-12">
                            {tickets.map(t => {
                                const isExpanded = expandedId === t._id;
                                const isResolved = t.status === "resolved";

                                return (
                                    <div key={t._id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : t._id)}
                                            className="w-full text-left p-6 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#252525]/30 transition-colors focus:outline-none"
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <h4 className="font-bold text-gray-800 dark:text-white mb-1.5 truncate text-base">{t.subject}</h4>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {new Date(t.createdAt).toLocaleString([], {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                                                    isResolved
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
                                                }`}>
                                                    {isResolved ? "Resolved" : "Open"}
                                                </span>
                                                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-6 pb-6 border-t border-gray-100 dark:border-[#2C2C2C] pt-5 bg-gray-50/30 dark:bg-[#1C1C1F]/20 space-y-5 animate-slideDown">
                                                <div>
                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</h5>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">{t.description}</p>
                                                </div>

                                                {/* Screenshot Display */}
                                                {t.screenshots && t.screenshots.length > 0 && (
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Attached Screenshots</h5>
                                                        <div className="flex flex-wrap gap-3">
                                                            {t.screenshots.map((url, index) => (
                                                                <div
                                                                    key={index}
                                                                    onClick={() => setLightboxImage(url)}
                                                                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-black/5 cursor-zoom-in shrink-0 animate-scaleIn"
                                                                >
                                                                    <img
                                                                        src={url}
                                                                        alt="snapshot"
                                                                        className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Admin resolution block */}
                                                {isResolved && t.adminResponse && (
                                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-2 animate-slideUp">
                                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 size={16} />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Admin Resolution</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300/90 leading-relaxed">{t.adminResponse}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* FULL SCREEN LIGHTBOX */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fadeIn">
                    <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                        <X size={24} />
                    </button>
                    <a
                        href={lightboxImage}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="absolute top-6 left-6 flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all"
                    >
                        <Download size={18} /> Download
                    </a>
                    <img src={lightboxImage} alt="Fullscreen Preview" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                </div>
            )}
        </div>
    );
};

// --- MAIN SETTINGS LAYOUT ---
const Settings = ({
    user = {},
    courses = [],
    addCourse,
    removeCourse,
    tasks = [],
    idleTimeout = 900000,
    setIdleTimeout,
    onUpdatePrivacy
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
        { id: 'portal', label: 'Syncing Status', icon: RefreshCw },
        { id: 'courses', label: 'Course Manager', icon: BookOpen },
        { id: 'help', label: 'Support & Help', icon: HelpCircle },
        { id: 'about', label: 'About', icon: Info },
    ];

    const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
                            type="button"
                            onClick={() => {
                                if (tab.id === 'about') {
                                    window.open('https://myportalucp.vercel.app', '_blank');
                                } else {
                                    setActiveTab(tab.id);
                                }
                            }}
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
                    {activeTab === 'profile' && <ProfileSection user={user} showToast={showToast} onUpdatePrivacy={onUpdatePrivacy} onUpdateProfilePic={(formData) => {
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
                    {activeTab === 'courses' && <CourseSection courses={courses} addCourse={addCourse} removeCourse={removeCourse} tasks={tasks} showToast={showToast} user={user} />}
                    {activeTab === 'help' && <SupportHelpSection showToast={showToast} />}
                </div>
            </div>
        </div>
    );
};

export default Settings;