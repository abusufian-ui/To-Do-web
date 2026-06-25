import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { StaticLogo } from './StaticLogo'; 
import FloatingBackground from './FloatingBackground'; 
import { 
    Eye, EyeOff, ArrowLeft, Check, Camera, 
    Shield, Sparkles, Award, ExternalLink, RefreshCw, 
    Chrome, HelpCircle, Bell, ArrowRight 
} from 'lucide-react'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Login() {
    const navigate = useNavigate();
    
    // Login & Onboarding steps: EMAIL, PASSWORD, OTP, NEW_PASSWORD, EXTENSION_ONBOARDING, EXTENSION_PROMPT, PREFERENCE_SETUP
    const [step, setStep] = useState('EMAIL'); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // Form Inputs & Context
    const [rollNumber, setRollNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [otpValues, setOtpValues] = useState(Array(6).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); 
    const [flowType, setFlowType] = useState(''); 
    const [activeEmail, setActiveEmail] = useState(''); 

    // Sync & Config settings
    const [chromeExtensionLink, setChromeExtensionLink] = useState('https://chromewebstore.google.com/');
    const [whatsappLink, setWhatsappLink] = useState('https://chat.whatsapp.com/');
    const [tempSyncId, setTempSyncId] = useState('');
    const [syncToken, setSyncToken] = useState('');
    const [tempUser, setTempUser] = useState(null);
    const [prefStep, setPrefStep] = useState(1);

    // User Preferences States
    const [gradingPolicy, setGradingPolicy] = useState('relative');
    const [themeMode, setThemeMode] = useState('system');
    const [isPublicPic, setIsPublicPic] = useState(false);
    const [profilePicUrl, setProfilePicUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [initials, setInitials] = useState('U');

    // UI Toggles
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsLink, setTermsLink] = useState('https://myportalucp.online/terms');

    const email = activeEmail || `${rollNumber.toLowerCase().trim()}@ucp.edu.pk`;
    const otp = otpValues.join('');
    const otpRefs = useRef([]);
    const pollingIntervalRef = useRef(null);
    const syncProgressIntervalRef = useRef(null);
    const [syncProgress, setSyncProgress] = useState(0);

    // Password strength check
    const getPasswordStrength = (pass) => {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;
        return score;
    };
    const passwordStrength = getPasswordStrength(newPassword);

    // Polling engine for Extension sync detection
    useEffect(() => {
        if (step === 'EXTENSION_ONBOARDING') {
            const newSyncId = 'sync_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
            setTempSyncId(newSyncId);
            setSyncProgress(0);

            // Animate a fake progress bar from 0 → 75% while waiting
            syncProgressIntervalRef.current = setInterval(() => {
                setSyncProgress(prev => {
                    if (prev >= 75) return prev;
                    return prev + (Math.random() * 2 + 0.5);
                });
            }, 1500);
            
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const res = await axios.get(`${API_BASE}/api/web/check-sync-status?tempSyncId=${newSyncId}`);
                    if (res.data && res.data.synced) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                        clearInterval(syncProgressIntervalRef.current);
                        syncProgressIntervalRef.current = null;
                        // Jump to 100% then transition
                        setSyncProgress(100);
                        setSyncToken(res.data.tempToken);
                        setFirstName(res.data.name ? res.data.name.split(' ')[0] : 'Student');
                        setFlowType('setup');
                        setTimeout(() => setStep('NEW_PASSWORD'), 700);
                    }
                } catch (err) {
                    console.error("Polling sync status failed:", err);
                }
            }, 3000);
        }
        
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            if (syncProgressIntervalRef.current) {
                clearInterval(syncProgressIntervalRef.current);
                syncProgressIntervalRef.current = null;
            }
        };
    }, [step]);

    // Go back step handler
    const handleGoBack = () => {
        setError('');
        setSuccessMsg('');
        if (step === 'NEW_PASSWORD') {
            if (syncToken) {
                setStep('EXTENSION_ONBOARDING');
            } else {
                setStep('OTP');
            }
        } else if (step === 'EXTENSION_ONBOARDING' || step === 'PASSWORD' || step === 'OTP') {
            setStep('EMAIL');
            setActiveEmail('');
            setOtpValues(Array(6).fill(''));
        } else if (step === 'PREFERENCE_SETUP') {
            if (prefStep > 1) {
                setPrefStep(prefStep - 1);
            } else {
                // Go back to extension download check if they set up password via standard OTP
                if (syncToken) {
                    setStep('EMAIL');
                } else {
                    setStep('EXTENSION_PROMPT');
                }
            }
        } else if (step === 'EXTENSION_PROMPT') {
            setStep('EMAIL');
        }
    };

    // Roll number verify and routing logic
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        if (!rollNumber) return setError("Please enter your Roll Number.");
        
        const currentEmail = `${rollNumber.toLowerCase().trim()}@ucp.edu.pk`;
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/web/check-email`, { email: currentEmail });
            
            if (!res.data.exists) {
                // If account doesn't exist, show Chrome Web Extension page to start onboarding
                setStep('EXTENSION_ONBOARDING');
            } else if (res.data.hasPassword) {
                setFirstName(res.data.name);
                setActiveEmail(currentEmail);
                setStep('PASSWORD');
            } else {
                setFirstName(res.data.name);
                setFlowType('setup');
                setActiveEmail(currentEmail);
                await sendOtp('setup', currentEmail);
                setStep('OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Connection error.");
        } finally {
            setIsLoading(false);
        }
    };

    // OTP sender
    const sendOtp = async (type, emailOverride = null) => {
        const targetEmail = emailOverride || email;
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await axios.post(`${API_BASE}/api/web/send-otp`, { email: targetEmail, type });
            setSuccessMsg('OTP sent successfully. Please check your inbox.');
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setFlowType('reset');
        await sendOtp('reset');
        setStep('OTP');
    };

    // Standard Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/web/login`, { email, password });
            const token = res.data.token;

            // Fetch full user details to check onboarding status
            const userDetailsRes = await axios.get(`${API_BASE}/api/auth/user`, {
                headers: { 'x-auth-token': token }
            });
            const fullUser = userDetailsRes.data;

            if (fullUser.showProfilePicToCommunity === null || fullUser.showProfilePicToCommunity === undefined) {
                // Not onboarded yet!
                setTempUser(fullUser);
                const name = fullUser.name || "Student";
                const userInitials = name.match(/(\b\S)?/g)?.join("").match(/(^\S|\S$)?/g)?.join("").toUpperCase() || "U";
                setInitials(userInitials);
                
                const pic = fullUser.customProfilePic || fullUser.portalProfilePic || fullUser.originalPortalProfilePic || fullUser.profilePic;
                if (pic) {
                    setProfilePicUrl(pic);
                }

                setSyncToken(token);
                setStep('PREFERENCE_SETUP');
            } else {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // OTP Verify
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) return setError("Please enter a 6-digit code.");

        setIsLoading(true);
        setError('');
        try {
            await axios.post(`${API_BASE}/api/web/verify-otp`, { email, otp });
            setStep('NEW_PASSWORD');
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP.");
            setOtpValues(Array(6).fill(''));
            otpRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    // Setup password and route to extension prompt / preference onboarding
    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (passwordStrength < 4) return setError("Please meet all password requirements.");
        if (newPassword !== confirmPassword) return setError("Passwords do not match.");

        setIsLoading(true);
        setError('');
        try {
            let res;
            if (syncToken) {
                // Set password via sync session token (Case C)
                res = await axios.post(`${API_BASE}/api/web/set-password-via-sync`, 
                    { newPassword }, 
                    { headers: { 'x-sync-token': syncToken } }
                );
            } else {
                // Set password via standard OTP (Case B)
                if (otp.length !== 6) {
                    setIsLoading(false);
                    return setError("Please enter a valid 6-digit code.");
                }
                res = await axios.post(`${API_BASE}/api/web/set-password`, { email, otp, newPassword });
            }

            const token = res.data.token;
            // Fetch full user details to check onboarding status
            const userDetailsRes = await axios.get(`${API_BASE}/api/auth/user`, {
                headers: { 'x-auth-token': token }
            });
            const fullUser = userDetailsRes.data;
            setTempUser(fullUser);
            
            // Set initials
            const name = fullUser.name || "Student";
            const userInitials = name.match(/(\b\S)?/g)?.join("").match(/(^\S|\S$)?/g)?.join("").toUpperCase() || "U";
            setInitials(userInitials);
            
            // Resolve Profile Pic
            const pic = fullUser.customProfilePic || fullUser.portalProfilePic || fullUser.originalPortalProfilePic || fullUser.profilePic;
            if (pic) {
                setProfilePicUrl(pic);
            }

            // Save authenticated token
            setSyncToken(token);

            if (fullUser.showProfilePicToCommunity === null || fullUser.showProfilePicToCommunity === undefined) {
                // If they came from extension sync (Case C), skip extension download page (they already have it)
                if (syncToken) {
                    setPrefStep(1);
                    setStep('PREFERENCE_SETUP');
                } else {
                    setStep('EXTENSION_PROMPT');
                }
            } else {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to set password.");
        } finally {
            setIsLoading(false);
        }
    };

    // Onboarding Preferences Save & Finalize
    const handleSavePreferences = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Save Grading Policy locally
            localStorage.setItem('gradingPolicyPref', gradingPolicy);

            // 2. Save Profile Pic Privacy to Server
            await axios.put(
                `${API_BASE}/api/user/privacy`,
                { showProfilePicToCommunity: isPublicPic },
                { headers: { 'x-auth-token': syncToken } }
            );

            // 3. Onboarding Complete: Save final token and user details to login session
            const userData = {
                id: tempUser.id || tempUser._id,
                name: tempUser.name,
                email: tempUser.email,
                isAdmin: tempUser.isAdmin,
                profilePic: profilePicUrl || tempUser.profilePic
            };
            localStorage.setItem('token', syncToken);
            localStorage.setItem('user', JSON.stringify(userData));

            // Dispatch event so App.js can immediately sync token without waiting for location effect
            window.dispatchEvent(new CustomEvent('portalTokenUpdate', { detail: { token: syncToken, user: userData } }));

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong saving preferences.");
        } finally {
            setIsLoading(false);
        }
    };

    // Profile Pic Upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePic', file);

        setIsUploading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/user/profile-pic`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': syncToken
                }
            });
            const pic = res.data.customProfilePic || res.data.profilePic;
            if (pic) {
                setProfilePicUrl(pic);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to upload image.");
        } finally {
            setIsUploading(false);
        }
    };

    // OTP inputs key events
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; 
        
        const newOtpValues = [...otpValues];
        newOtpValues[index] = value.slice(-1);
        setOtpValues(newOtpValues);
        
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
        if (pastedData) {
            const newOtpValues = [...otpValues];
            for (let i = 0; i < pastedData.length; i++) {
                newOtpValues[i] = pastedData[i];
            }
            setOtpValues(newOtpValues);
            const focusIndex = Math.min(pastedData.length, 5);
            otpRefs.current[focusIndex]?.focus();
        }
    };

    // Fetch config on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/public/settings`);
                if (res.data) {
                    if (res.data.termsLink) setTermsLink(res.data.termsLink);
                    if (res.data.chromeExtensionLink) setChromeExtensionLink(res.data.chromeExtensionLink);
                    if (res.data.whatsappGroupLink) setWhatsappLink(res.data.whatsappGroupLink);
                }
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 selection:bg-white/30 transition-colors duration-1000">
            
            {/* Header logo/title */}
            <header className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-between items-center z-20">
                <button onClick={handleGoBack} className="flex items-center gap-3 group outline-none">
                    <StaticLogo className="w-10 h-10 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-300" />
                    <span className="text-white font-bold text-xl tracking-tight group-hover:text-gray-300 transition-colors">My Portal</span>
                </button>
            </header>

            {/* Glowing background */}
            <FloatingBackground />

            {/* Main Content Modal */}
            <div className="relative z-30 w-full max-w-[440px] bg-[#050505] rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.03)] border border-[#222] overflow-hidden transition-all duration-700 animate-fade-in-up">
                
                {/* Loader bar */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-transparent z-20">
                    <div className={`h-full bg-white transition-all duration-300 ease-out ${isLoading ? 'w-full animate-pulse' : 'w-0'}`} />
                </div>

                {/* Back button */}
                {step !== 'EMAIL' && (
                    <button onClick={handleGoBack} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold z-20">
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                {/* Step Header */}
                {step !== 'PREFERENCE_SETUP' && (
                    <div className="p-10 pb-6 text-center">
                        <StaticLogo className="h-20 w-auto mx-auto mb-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]" />

                        <div className="h-[72px] flex flex-col justify-end mb-2">
                            <h2 className="text-3xl font-extrabold text-white tracking-tight animate-slide-up-fade">
                                {step === 'EMAIL' && "Sign In"}
                                {step === 'PASSWORD' && `Hey, ${firstName ? firstName.split(' ')[0] : ''}`}
                                {step === 'OTP' && "Verification"}
                                {step === 'NEW_PASSWORD' && "Secure Account"}
                                {step === 'EXTENSION_ONBOARDING' && "Sync Account"}
                                {step === 'EXTENSION_PROMPT' && "Install Extension"}
                            </h2>
                            <p className="text-sm text-[#888] mt-2.5 font-medium animate-slide-up-fade delay-75 leading-relaxed">
                                {step === 'EMAIL' && "Enter your university ID to continue"}
                                {step === 'PASSWORD' && "Enter your web portal password"}
                                {step === 'OTP' && `We sent a 6-digit code to ${email}`}
                                {step === 'NEW_PASSWORD' && "Create a strong web portal password"}
                                {step === 'EXTENSION_ONBOARDING' && "Connect Horizon portal to initialize data"}
                                {step === 'EXTENSION_PROMPT' && "Add Chrome extension for live data sync"}
                            </p>
                        </div>
                    </div>
                )}

                <div className={`px-10 pb-10${step === 'PREFERENCE_SETUP' ? ' pt-14' : ''}`}>
                    {/* Error Box */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-24 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-3.5 bg-[#111] border border-[#333] rounded-xl text-red-500 text-sm font-semibold text-center flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    </div>

                    {/* Success Box */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${successMsg ? 'max-h-24 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-3.5 bg-[#111] border border-[#333] rounded-xl text-green-500 text-sm font-semibold text-center flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {successMsg}
                        </div>
                    </div>

                    <div className="relative">
                        {/* EMAIL STEP */}
                        {step === 'EMAIL' && (
                            <form onSubmit={handleCheckEmail} className="space-y-6 animate-step-enter">
                                <div className="flex items-center bg-[#111] rounded-2xl border border-[#333] focus-within:border-white focus-within:ring-4 focus-within:ring-white/10 transition-all duration-300 overflow-hidden group">
                                    <input
                                        type="text"
                                        placeholder="L1F23BSCS0000"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        disabled={isLoading}
                                        className="w-full px-5 py-4 bg-transparent outline-none font-bold text-white uppercase placeholder-[#555] transition-colors disabled:opacity-50"
                                        autoFocus
                                        name="portal-roll-number-input"
                                    />
                                    <div className="px-5 py-4 border-l border-[#333] text-[#666] font-semibold select-none group-focus-within:text-[#999] transition-colors">
                                        @ucp.edu.pk
                                    </div>
                                </div>
                                <button disabled={isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Checking...' : 'Continue'}
                                </button>
                                <p className="text-[11px] text-gray-500 text-center font-medium mt-4 select-none">
                                    By logging in you agree to our{' '}
                                    <a href={termsLink} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white underline font-bold transition-colors">
                                        Terms & conditions
                                    </a>.
                                </p>
                            </form>
                        )}

                        {/* PASSWORD STEP */}
                        {step === 'PASSWORD' && (
                            <form onSubmit={handleLogin} className="space-y-6 animate-step-enter">
                                <div className="space-y-3 relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-[#111] rounded-2xl border border-[#333] outline-none focus:border-white focus:ring-4 focus:ring-white/10 text-white font-medium transition-all duration-300 pr-12"
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                <div className="flex justify-between items-baseline px-1">
                                    <button type="button" onClick={handleGoBack} className="text-sm font-semibold text-[#666] hover:text-white transition-colors duration-300 p-0 bg-transparent border-none outline-none cursor-pointer">
                                        Wrong account?
                                    </button>
                                    <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-white hover:text-gray-300 transition-colors duration-300 p-0 bg-transparent border-none outline-none cursor-pointer">
                                        Forgot Password?
                                    </button>
                                </div>
                                <button disabled={isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Authenticating...' : 'Sign In'}
                                </button>
                                <p className="text-[11px] text-gray-500 text-center font-medium mt-4 select-none">
                                    By logging in you agree to our{' '}
                                    <a href={termsLink} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white underline font-bold transition-colors">
                                        Terms & conditions
                                    </a>.
                                </p>
                            </form>
                        )}

                        {/* OTP STEP */}
                        {step === 'OTP' && (
                            <form onSubmit={handleVerifyOtp} className="space-y-8 animate-step-enter">
                                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                                    {otpValues.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={el => otpRefs.current[index] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className="w-[14%] aspect-square bg-[#111] rounded-xl border border-[#333] outline-none focus:border-white focus:ring-2 focus:ring-white/20 text-center text-2xl text-white font-bold transition-all duration-300"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <button disabled={otp.length !== 6 || isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Verifying...' : 'Verify Code'}
                                </button>
                                <div className="text-center">
                                    <button type="button" onClick={() => sendOtp(flowType)} className="text-sm font-bold text-[#888] hover:text-white transition-colors duration-300">
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* NEW PASSWORD STEP */}
                        {step === 'NEW_PASSWORD' && (
                            <form onSubmit={handleSetPassword} className="space-y-4 animate-step-enter">
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="Create a new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-[#111] rounded-2xl border border-[#333] outline-none focus:border-white focus:ring-4 focus:ring-white/10 text-white font-medium transition-all duration-300 pr-12"
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-[#111] rounded-2xl border border-[#333] outline-none focus:border-white focus:ring-4 focus:ring-white/10 text-white font-medium transition-all duration-300 pr-12"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <div className="flex gap-2 h-1.5">
                                        {[1, 2, 3, 4].map(level => (
                                            <div key={level} className={`flex-1 rounded-full transition-colors duration-500 ${passwordStrength >= level ? (passwordStrength < 3 ? (passwordStrength < 2 ? 'bg-red-500' : 'bg-yellow-500') : 'bg-green-500') : 'bg-[#333]'}`} />
                                        ))}
                                    </div>
                                    <div className="text-[11px] font-bold text-right uppercase tracking-wider">
                                        {passwordStrength === 0 && <span className="text-gray-600">Enter password</span>}
                                        {passwordStrength > 0 && passwordStrength < 2 && <span className="text-red-500">Weak</span>}
                                        {passwordStrength >= 2 && passwordStrength < 4 && <span className="text-yellow-500">Normal</span>}
                                        {passwordStrength === 4 && <span className="text-green-500">Strong</span>}
                                    </div>
                                </div>

                                <ul className="text-xs space-y-2.5 mt-2 text-gray-400 bg-[#111] p-4 rounded-xl border border-[#222]">
                                    <li className={`flex items-center gap-2 transition-colors duration-300 ${newPassword.length >= 8 ? 'text-green-500 font-medium' : ''}`}>
                                        <Check size={14} className={newPassword.length >= 8 ? 'opacity-100' : 'opacity-30'} /> At least 8 characters
                                    </li>
                                    <li className={`flex items-center gap-2 transition-colors duration-300 ${/[A-Z]/.test(newPassword) ? 'text-green-500 font-medium' : ''}`}>
                                        <Check size={14} className={/[A-Z]/.test(newPassword) ? 'opacity-100' : 'opacity-30'} /> At least 1 capital letter
                                    </li>
                                    <li className={`flex items-center gap-2 transition-colors duration-300 ${/[a-z]/.test(newPassword) ? 'text-green-500 font-medium' : ''}`}>
                                        <Check size={14} className={/[a-z]/.test(newPassword) ? 'opacity-100' : 'opacity-30'} /> At least 1 small letter
                                    </li>
                                    <li className={`flex items-center gap-2 transition-colors duration-300 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-500 font-medium' : ''}`}>
                                        <Check size={14} className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'opacity-100' : 'opacity-30'} /> At least 1 special character
                                    </li>
                                </ul>

                                <button disabled={isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-4">
                                    {isLoading ? 'Securing Account...' : 'Save & Log In'}
                                </button>
                            </form>
                        )}

                        {/* STEP: EXTENSION ONBOARDING (For accounts not found in DB) */}
                        {step === 'EXTENSION_ONBOARDING' && (
                            <div className="text-center space-y-6 animate-step-enter">
                                <div className="p-5 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-2xl border border-[#333] shadow-inner space-y-4">
                                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center mx-auto text-blue-500">
                                        <Chrome size={24} className="animate-spin-slow" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-white text-sm">Chrome Web Extension Required</h3>
                                        <p className="text-xs text-[#888]">Setup your student account automatically via Chrome</p>
                                    </div>
                                    <a 
                                        href={chromeExtensionLink} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="inline-flex items-center justify-center gap-2 w-full bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-white py-3 rounded-xl font-bold text-xs transition-colors"
                                    >
                                        <Chrome size={14} /> Add MyPortal to Chrome
                                    </a>
                                </div>

                                <div className="text-left bg-[#0e0e0f] rounded-2xl border border-[#222] p-5 space-y-3.5">
                                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#666]">Instructions</h4>
                                    <ol className="text-xs text-[#aaa] space-y-3 list-decimal list-inside pl-1 font-medium leading-relaxed">
                                        <li>Download and install the extension from the Web Store.</li>
                                        <li>Open the Horizon Portal and log in to your account.</li>
                                        <li>The extension will automatically import and sync your data.</li>
                                        <li>Keep this page open. We will proceed automatically once synced.</li>
                                    </ol>
                                </div>

                                <div className="space-y-4">
                                    <a 
                                        href={`https://horizon.ucp.edu.pk/#myportal_sync_id=${tempSyncId}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center justify-center gap-2 w-full bg-white hover:scale-[1.01] active:scale-[0.99] text-black py-4 rounded-2xl font-bold transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.15)] text-sm"
                                    >
                                        Open Horizon Portal <ExternalLink size={16} />
                                    </a>

                                    {/* Scraping Progress Bar */}
                                    <div className="space-y-2.5 pt-1">
                                        <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden border border-[#2a2a2a]">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ 
                                                    width: `${Math.min(syncProgress, 100)}%`,
                                                    background: syncProgress >= 100 
                                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                                        : 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold" style={{ color: syncProgress >= 100 ? '#10b981' : '#555' }}>
                                            <RefreshCw size={11} className={syncProgress >= 100 ? '' : 'animate-spin'} />
                                            <span>
                                                {syncProgress >= 100 
                                                    ? 'Sync complete! Setting up account...' 
                                                    : syncProgress >= 50 
                                                        ? 'Extension detected — loading your data...'
                                                        : 'Waiting for extension sync...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP: EXTENSION PROMPT (Case B: 1-Time Chrome Extension Download screen after set-password) */}
                        {step === 'EXTENSION_PROMPT' && (
                            <div className="text-center space-y-6 animate-step-enter">
                                <div className="p-6 bg-gradient-to-br from-[#111] to-[#0d0d0f] rounded-3xl border border-[#222] text-center space-y-5">
                                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-500">
                                        <Chrome size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-extrabold text-white text-lg">Live Desktop Sync</h3>
                                        <p className="text-xs text-[#888] leading-relaxed px-2">
                                            Install the Chrome extension to automatically sync your grades, timetable, and attendance right from your browser.
                                        </p>
                                    </div>
                                    
                                    <a 
                                        href={chromeExtensionLink} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center justify-center gap-3 w-full bg-[#1d1d1f] hover:bg-[#2c2c2e] border border-[#333] text-white py-3.5 rounded-2xl font-black text-xs transition-colors shadow-inner"
                                    >
                                        <Chrome size={18} className="text-blue-500" />
                                        <span>Download Extension from Web Store</span>
                                    </a>
                                </div>

                                <button 
                                    onClick={() => {
                                        setPrefStep(1);
                                        setStep('PREFERENCE_SETUP');
                                    }} 
                                    className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 text-sm"
                                >
                                    Proceed to Preferences <ArrowRight size={16} />
                                </button>
                            </div>
                        )}

                        {/* STEP: PREFERENCE SETUP (Onboarding Wizard) */}
                        {step === 'PREFERENCE_SETUP' && (
                            <div className="space-y-6 animate-step-enter text-left min-w-[280px]">
                                {/* Step Header */}
                                <div className="text-center space-y-2 mb-6">
                                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-500">Step {prefStep} of 3</span>
                                    <h3 className="text-2xl font-black text-white">
                                        {prefStep === 1 && "Grading Preference"}
                                        {prefStep === 2 && "Profile & Privacy"}
                                        {prefStep === 3 && "Join Community"}
                                    </h3>
                                    <p className="text-xs text-[#888] leading-relaxed max-w-sm mx-auto">
                                        {prefStep === 1 && "Select how your academic parameters are evaluated."}
                                        {prefStep === 2 && "Select community profile visibility settings."}
                                        {prefStep === 3 && "Join the official student community channels."}
                                    </p>
                                </div>

                                {/* Step Content: 1. Grading */}
                                {prefStep === 1 && (
                                    <div className="space-y-4">
                                        <div 
                                            onClick={() => setGradingPolicy('relative')}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center bg-[#111] hover:border-[#444] ${gradingPolicy === 'relative' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] bg-blue-500/5' : 'border-[#222]'}`}
                                        >
                                            <div className={`p-2.5 rounded-xl border ${gradingPolicy === 'relative' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-[#1e1e20] border-[#333] text-[#888]'}`}>
                                                <Award size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white">Relative Grading</h4>
                                                <p className="text-[11px] text-[#888] mt-1 leading-normal">Grades are curved based on cohort performance. Standard bell curve distribution.</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gradingPolicy === 'relative' ? 'border-blue-500' : 'border-[#444]'}`}>
                                                {gradingPolicy === 'relative' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => setGradingPolicy('absolute')}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center bg-[#111] hover:border-[#444] ${gradingPolicy === 'absolute' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] bg-blue-500/5' : 'border-[#222]'}`}
                                        >
                                            <div className={`p-2.5 rounded-xl border ${gradingPolicy === 'absolute' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-[#1e1e20] border-[#333] text-[#888]'}`}>
                                                <Award size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white">Absolute Grading</h4>
                                                <p className="text-[11px] text-[#888] mt-1 leading-normal">Fixed grading thresholds. Scores are evaluated strictly on individual performance.</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gradingPolicy === 'absolute' ? 'border-blue-500' : 'border-[#444]'}`}>
                                                {gradingPolicy === 'absolute' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step Content: 2. Profile & Privacy */}
                                {prefStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-full border-2 border-[#333] bg-[#111] overflow-hidden flex items-center justify-center shadow-inner">
                                                    {isUploading ? (
                                                        <RefreshCw size={24} className="animate-spin text-blue-500" />
                                                    ) : profilePicUrl ? (
                                                        <img src={profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-3xl font-black text-gray-500">{initials}</span>
                                                    )}
                                                </div>
                                                <label 
                                                    htmlFor="onboarding-avatar-upload" 
                                                    className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-90 transition-all shadow-md"
                                                >
                                                    <Camera size={14} />
                                                </label>
                                                <input 
                                                    type="file" 
                                                    id="onboarding-avatar-upload" 
                                                    accept="image/*" 
                                                    onChange={handleImageUpload} 
                                                    className="hidden" 
                                                    disabled={isUploading}
                                                />
                                            </div>
                                            <span className="text-xs text-[#888] font-bold">Upload Custom Profile Picture</span>
                                        </div>

                                        <div className="space-y-3.5">
                                            <span className="text-xs uppercase font-extrabold tracking-widest text-[#555] block pl-1">Visibility settings</span>
                                            
                                            <div 
                                                onClick={() => setIsPublicPic(false)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center bg-[#111] hover:border-[#444] ${!isPublicPic ? 'border-blue-500 bg-blue-500/5' : 'border-[#222]'}`}
                                            >
                                                <div className={`p-2 rounded-lg ${!isPublicPic ? 'text-blue-500' : 'text-[#888]'}`}>
                                                    <Shield size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-white">Private Profile Mode</h4>
                                                    <p className="text-[10px] text-[#888] mt-0.5 leading-normal">Only your initials will show on public leaderboards and group chats.</p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!isPublicPic ? 'border-blue-500' : 'border-[#444]'}`}>
                                                    {!isPublicPic && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => setIsPublicPic(true)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-center bg-[#111] hover:border-[#444] ${isPublicPic ? 'border-blue-500 bg-blue-500/5' : 'border-[#222]'}`}
                                            >
                                                <div className={`p-2 rounded-lg ${isPublicPic ? 'text-blue-500' : 'text-[#888]'}`}>
                                                    <Sparkles size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-white">Public Profile Mode</h4>
                                                    <p className="text-[10px] text-[#888] mt-0.5 leading-normal">Enable other students to see your profile picture across leaderboard screens.</p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isPublicPic ? 'border-blue-500' : 'border-[#444]'}`}>
                                                    {isPublicPic && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step Content: 3. Join Community */}
                                {prefStep === 3 && (
                                    <div className="space-y-6 text-center py-2 animate-fade-in">
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 bg-[#128C7E]/10 border border-[#128C7E]/20 rounded-full flex items-center justify-center mx-auto text-[#128C7E] shadow-inner">
                                                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.59 1.977 14.113.953 11.487.953c-5.446 0-9.871 4.37-9.875 9.8.001 1.937.536 3.823 1.547 5.49L2.176 20l3.83-1.397c1.683.921 3.424 1.401 4.64 1.401z"/>
                                                </svg>
                                            </div>
                                            <p className="text-xs text-[#888] leading-relaxed max-w-xs mx-auto">
                                                Gain access to official community group chats to get live announcements, notes, and direct developer support.
                                            </p>
                                        </div>

                                        <a 
                                            href={whatsappLink} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="inline-flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20ba56] text-white py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-[0_4px_15px_rgba(37,211,102,0.2)]"
                                        >
                                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.59 1.977 14.113.953 11.487.953c-5.446 0-9.871 4.37-9.875 9.8.001 1.937.536 3.823 1.547 5.49L2.176 20l3.83-1.397c1.683.921 3.424 1.401 4.64 1.401z"/>
                                            </svg>
                                            Join WhatsApp Community
                                        </a>

                                        {/* Perks */}
                                        <div className="grid grid-cols-3 gap-3.5 mt-8">
                                            <div className="p-3 bg-[#111] border border-[#222] rounded-2xl text-center space-y-1">
                                                <Bell size={16} className="mx-auto text-blue-500" />
                                                <p className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Alerts</p>
                                            </div>
                                            <div className="p-3 bg-[#111] border border-[#222] rounded-2xl text-center space-y-1">
                                                <Sparkles size={16} className="mx-auto text-blue-500" />
                                                <p className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Updates</p>
                                            </div>
                                            <div className="p-3 bg-[#111] border border-[#222] rounded-2xl text-center space-y-1">
                                                <HelpCircle size={16} className="mx-auto text-blue-500" />
                                                <p className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Support</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Onboarding Wizard Footer Navigation */}
                                <div className="flex justify-between items-center pt-6 border-t border-[#222] mt-6">
                                    <button 
                                        type="button" 
                                        onClick={handleGoBack}
                                        className="text-xs font-bold text-gray-500 hover:text-white transition-colors duration-300"
                                    >
                                        Back
                                    </button>

                                    {/* Progress dots */}
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(s => (
                                            <div 
                                                key={s} 
                                                className={`h-1.5 rounded-full transition-all duration-300 ${prefStep === s ? 'w-5 bg-blue-500' : 'w-1.5 bg-[#333]'}`} 
                                            />
                                        ))}
                                    </div>

                                    <button 
                                        type="button"
                                        disabled={isLoading}
                                        onClick={() => {
                                            if (prefStep < 3) {
                                                setPrefStep(prefStep + 1);
                                            } else {
                                                handleSavePreferences();
                                            }
                                        }}
                                        className="px-6 py-2.5 rounded-xl font-bold bg-white text-black text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-1"
                                    >
                                        {isLoading ? 'Saving...' : (prefStep === 3 ? 'Finish' : 'Next')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Custom onboarding animation styles */}
            <style jsx="true">{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
                    to { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes stepEnter {
                    from { opacity: 0; transform: scale(0.98) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-slide-up-fade {
                    animation: slideUpFade 0.5s ease-out forwards;
                }
                .animate-step-enter {
                    animation: stepEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .delay-75 {
                    animation-delay: 75ms;
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}