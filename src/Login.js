import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AnimatedLogo from './Animation'; // 🚀 Premium SVG Animation Splash
import { StaticLogo } from './StaticLogo'; // 🚀 Premium SVG Static Logo
import FloatingBackground from './FloatingBackground'; // 🚀 SVG Educational Background
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'; // 🚀 NEW ICONS

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function Login() {
    const navigate = useNavigate();
    
    // UI State
    const [step, setStep] = useState('EMAIL'); // EMAIL, PASSWORD, OTP, NEW_PASSWORD, NOT_FOUND
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // Data State
    const [rollNumber, setRollNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [otpValues, setOtpValues] = useState(Array(6).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // 🚀 NEW CONFIRM PASSWORD STATE
    const [flowType, setFlowType] = useState(''); 

    // Visibility States
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const email = `${rollNumber.toLowerCase().trim()}@ucp.edu.pk`;
    const otp = otpValues.join('');
    const otpRefs = useRef([]);

    // 🚀 NEW: Password Strength Calculator
    const getPasswordStrength = (pass) => {
        let score = 0;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;
        return score;
    };
    const passwordStrength = getPasswordStrength(newPassword);

    // Helper to reset and go back
    const handleGoBack = () => {
        setStep('EMAIL');
        setError('');
        setSuccessMsg('');
        setOtpValues(Array(6).fill(''));
    };

    // 1. Check Email
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        if (!rollNumber) return setError("Please enter your Roll Number.");
        
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/web/check-email`, { email });
            
            if (!res.data.exists) {
                setStep('NOT_FOUND');
            } else if (res.data.hasPassword) {
                setFirstName(res.data.name);
                setStep('PASSWORD');
            } else {
                setFirstName(res.data.name);
                setFlowType('setup');
                await sendOtp('setup');
                setStep('OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || "Connection error.");
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Send OTP
    const sendOtp = async (type) => {
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await axios.post(`${API_BASE}/api/web/send-otp`, { email, type });
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

    // 3. Login
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/web/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard'); 
        } catch (err) {
            setError(err.response?.data?.message || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // 3.5 Verify OTP against Backend
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

    // 4. Set Password & Finalize
    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (passwordStrength < 4) return setError("Please meet all password requirements.");
        if (newPassword !== confirmPassword) return setError("Passwords do not match.");
        if (otp.length !== 6) return setError("Please enter a valid 6-digit code.");

        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API_BASE}/api/web/set-password`, { email, otp, newPassword });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || "Failed to set password.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- OTP Input Handlers ---
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

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 selection:bg-white/30 transition-colors duration-1000">
            
            {/* 🚀 Premium Header with Clickable Logo & Text */}
            <header className="absolute top-0 left-0 w-full p-6 sm:px-12 flex justify-between items-center z-20">
                <button onClick={handleGoBack} className="flex items-center gap-3 group outline-none">
                    <StaticLogo className="w-10 h-10 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all duration-300" />
                    <span className="text-white font-bold text-xl tracking-tight group-hover:text-gray-300 transition-colors">My Portal</span>
                </button>
            </header>

            {/* Educational SVG Animations */}
            <FloatingBackground />

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-[420px] bg-[#050505] rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.03)] border border-[#222] overflow-hidden transition-all duration-700 animate-fade-in-up">
                
                {/* Progress Bar (Loading State) */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-transparent z-20">
                    <div className={`h-full bg-white transition-all duration-300 ease-out ${isLoading ? 'w-full animate-pulse' : 'w-0'}`} />
                </div>

                {/* 🚀 Card Back Button */}
                {step !== 'EMAIL' && (
                    <button onClick={handleGoBack} className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold z-20">
                        <ArrowLeft size={16} /> Back
                    </button>
                )}

                <div className="p-10 pb-6 text-center">
                    <StaticLogo className="h-20 w-auto mx-auto mb-8 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.1)]" />

                    <div className="h-[72px] flex flex-col justify-end mb-2">
                        <h2 className="text-3xl font-extrabold text-white tracking-tight animate-slide-up-fade">
                            {step === 'EMAIL' && "Sign In"}
                            {step === 'PASSWORD' && `Hey, ${firstName ? firstName.split(' ')[0] : ''}`}
                            {step === 'OTP' && "Verification"}
                            {step === 'NEW_PASSWORD' && "Secure Account"}
                            {step === 'NOT_FOUND' && "Not Found"}
                        </h2>
                        <p className="text-sm text-[#888] mt-2.5 font-medium animate-slide-up-fade delay-75">
                            {step === 'EMAIL' && "Enter your university ID to continue"}
                            {step === 'PASSWORD' && "Enter your web portal password"}
                            {step === 'OTP' && `We sent a 6-digit code to ${email}`}
                            {step === 'NEW_PASSWORD' && "Create a strong web portal password"}
                        </p>
                    </div>
                </div>

                    <div className="px-10 pb-10">
                        {/* Error Toast */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-24 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-3.5 bg-[#111] border border-[#333] rounded-xl text-red-500 text-sm font-semibold text-center flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {error}
                            </div>
                        </div>

                        {/* Success Toast */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${successMsg ? 'max-h-24 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-3.5 bg-[#111] border border-[#333] rounded-xl text-green-500 text-sm font-semibold text-center flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                {successMsg}
                            </div>
                        </div>

                    <div className="relative">
                        {/* STEP 1: EMAIL */}
                        {step === 'EMAIL' && (
                            <form onSubmit={handleCheckEmail} className="space-y-6 animate-step-enter">
                                <div className="flex items-center bg-[#111] rounded-2xl border border-[#333] focus-within:border-white focus-within:ring-4 focus-within:ring-white/10 transition-all duration-300 overflow-hidden group">
                                    <input
                                        type="text"
                                        placeholder="L1F23BSCS0000"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                                        className="w-full px-5 py-4 bg-transparent outline-none font-bold text-white uppercase placeholder-[#555] transition-colors"
                                        autoFocus
                                    />
                                    <div className="px-5 py-4 border-l border-[#333] text-[#666] font-semibold select-none group-focus-within:text-[#999] transition-colors">
                                        @ucp.edu.pk
                                    </div>
                                </div>
                                <button disabled={isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Checking...' : 'Continue'}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: PASSWORD */}
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
                                <div className="flex justify-between items-center px-1">
                                    <button type="button" onClick={handleGoBack} className="text-sm font-semibold text-[#666] hover:text-white transition-colors duration-300">
                                        Wrong account?
                                    </button>
                                    <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-white hover:text-gray-300 transition-colors duration-300">
                                        Forgot Password?
                                    </button>
                                </div>
                                <button disabled={isLoading} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Authenticating...' : 'Sign In'}
                                </button>
                            </form>
                        )}

                        {/* STEP 3: OTP */}
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

                        {/* 🚀 STEP 4: SET NEW PASSWORD (UPGRADED UI) */}
                        {step === 'NEW_PASSWORD' && (
                            <form onSubmit={handleSetPassword} className="space-y-4 animate-step-enter">
                                
                                {/* New Password */}
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

                                {/* Confirm Password */}
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

                                {/* Live Strength Bar */}
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

                                {/* Requirements Checklist */}
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

                        {/* STEP 5: NOT FOUND */}
                        {step === 'NOT_FOUND' && (
                            <div className="text-center space-y-8 animate-step-enter">
                                <div className="w-20 h-20 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#333] shadow-inner">
                                    <svg className="w-10 h-10 text-[#888]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-[#888] font-medium leading-relaxed">
                                    To ensure your data is perfectly synced, you must log in via the <span className="font-bold text-white">MyPortal Mobile App</span> first to initialize your account.
                                </p>
                                <button onClick={handleGoBack} className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold hover:bg-[#222] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-[#333]">
                                    Try Another ID
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Custom Animations */}
            <style jsx>{`
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
            `}</style>
        </div>
    );
}