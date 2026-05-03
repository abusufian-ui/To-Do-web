import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import FloatingBackground from './FloatingBackground'; // 🚀 Import the new background

export default function Login() {
    const navigate = useNavigate();
    
    // UI State
    const [step, setStep] = useState('EMAIL'); // EMAIL, PASSWORD, OTP, NEW_PASSWORD, NOT_FOUND
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Data State
    const [rollNumber, setRollNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [flowType, setFlowType] = useState(''); 

    const email = `${rollNumber.toLowerCase().trim()}@ucp.edu.pk`;

    // 1. Check Email
    const handleCheckEmail = async (e) => {
        e.preventDefault();
        if (!rollNumber) return setError("Please enter your Roll Number.");
        
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/web/check-email', { email });
            
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
        try {
            await axios.post('/api/web/send-otp', { email, type });
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
            const res = await axios.post('/api/web/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard'); 
        } catch (err) {
            setError(err.response?.data?.message || "Login failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // 4. Set Password & Finalize
    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) return setError("Password must be at least 6 characters.");
        if (otp.length !== 6) return setError("Please enter a valid 6-digit code.");

        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/web/set-password', { email, otp, newPassword });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || "Failed to set password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#fafafa] dark:bg-[#050505] flex items-center justify-center p-4 selection:bg-blue-500/30 transition-colors duration-500">
            
            {/* 🚀 New Floating Education SVGs */}
            <FloatingBackground />

            {/* Ambient Background Glow (Subtle & Professional) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 dark:bg-blue-600/5 blur-[120px]" />
                <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-gray-300/20 dark:bg-gray-800/20 blur-[100px]" />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-[420px] bg-white/80 dark:bg-[#0f0f0f]/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-500 animate-fade-in-up">
                
                {/* Progress Bar (Loading State) */}
                <div className="absolute top-0 left-0 w-full h-1 bg-transparent">
                    <div className={`h-full bg-blue-600 transition-all duration-300 ease-out ${isLoading ? 'w-full animate-pulse' : 'w-0'}`} />
                </div>

                <div className="p-10 pb-6 text-center">
                    {/* Fixed Logo Paths mapping to your .jpg files */}
                    <img 
                        src="/images/logo_black.jpg" 
                        alt="MyPortal" 
                        className="h-20 w-auto mx-auto mb-8 dark:hidden rounded-full shadow-sm"
                    />
                    <img 
                        src="/images/logo_white.jpg" 
                        alt="MyPortal" 
                        className="h-20 w-auto mx-auto mb-8 hidden dark:block rounded-full shadow-lg"
                    />

                    <div className="h-[72px] flex flex-col justify-end mb-2">
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight animate-slide-up-fade">
                            {step === 'EMAIL' && "Sign In"}
                            {step === 'PASSWORD' && `Welcome, ${firstName}`}
                            {step === 'OTP' && "Check your Email"}
                            {step === 'NEW_PASSWORD' && "Secure Account"}
                            {step === 'NOT_FOUND' && "Not Found"}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5 font-medium animate-slide-up-fade delay-75">
                            {step === 'EMAIL' && "Enter your university ID to continue"}
                            {step === 'PASSWORD' && "Enter your web portal password"}
                            {step === 'OTP' && `We sent a 6-digit code to ${email}`}
                            {step === 'NEW_PASSWORD' && "Create a secure password for web access"}
                        </p>
                    </div>
                </div>

                <div className="px-10 pb-10">
                    {/* Error Toast */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-24 mb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-semibold text-center flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    </div>

                    <div className="relative">
                        {/* STEP 1: EMAIL */}
                        {step === 'EMAIL' && (
                            <form onSubmit={handleCheckEmail} className="space-y-6 animate-step-enter">
                                <div className="flex items-center bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-[#222] focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all duration-300 overflow-hidden group">
                                    <input
                                        type="text"
                                        placeholder="L1F23BSCS0000"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                                        className="w-full px-5 py-4 bg-transparent outline-none font-bold text-gray-900 dark:text-white uppercase placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                                        autoFocus
                                    />
                                    <div className="px-5 py-4 border-l border-gray-200 dark:border-[#222] text-gray-400 dark:text-gray-500 font-semibold select-none group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors">
                                        @ucp.edu.pk
                                    </div>
                                </div>
                                <button disabled={isLoading} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-gray-900/10 dark:hover:shadow-white/10 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Checking...' : 'Continue'}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: PASSWORD */}
                        {step === 'PASSWORD' && (
                            <form onSubmit={handleLogin} className="space-y-6 animate-step-enter">
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-[#222] outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white font-medium transition-all duration-300"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <button type="button" onClick={() => setStep('EMAIL')} className="text-sm font-semibold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300">
                                        Wrong account?
                                    </button>
                                    <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300">
                                        Forgot Password?
                                    </button>
                                </div>
                                <button disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-blue-600/20 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Authenticating...' : 'Sign In'}
                                </button>
                            </form>
                        )}

                        {/* STEP 3: OTP */}
                        {step === 'OTP' && (
                            <form onSubmit={(e) => { e.preventDefault(); setStep('NEW_PASSWORD'); }} className="space-y-6 animate-step-enter">
                                <input
                                    type="text"
                                    placeholder="123456"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-[#222] outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-center text-3xl tracking-[0.5em] text-gray-900 dark:text-white font-black transition-all duration-300 placeholder:text-gray-300 dark:placeholder:text-gray-700 placeholder:font-medium placeholder:tracking-normal"
                                    autoFocus
                                />
                                <button disabled={otp.length !== 6} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-gray-900/10 dark:hover:shadow-white/10 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    Verify Code
                                </button>
                                <div className="text-center">
                                    <button type="button" onClick={() => sendOtp(flowType)} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-300">
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 4: SET NEW PASSWORD */}
                        {step === 'NEW_PASSWORD' && (
                            <form onSubmit={handleSetPassword} className="space-y-6 animate-step-enter">
                                <input
                                    type="password"
                                    placeholder="Create a new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-[#222] outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-gray-900 dark:text-white font-medium transition-all duration-300"
                                    autoFocus
                                />
                                <button disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-blue-600/20 transition-all duration-300 disabled:opacity-50 disabled:scale-100 disabled:shadow-none">
                                    {isLoading ? 'Securing Account...' : 'Save & Log In'}
                                </button>
                            </form>
                        )}

                        {/* STEP 5: NOT FOUND */}
                        {step === 'NOT_FOUND' && (
                            <div className="text-center space-y-8 animate-step-enter">
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-100 dark:border-red-500/20 shadow-inner">
                                    <svg className="w-10 h-10 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                                    To ensure your data is perfectly synced, you must log in via the <span className="font-bold text-gray-900 dark:text-white">MyPortal Mobile App</span> first to initialize your account.
                                </p>
                                <button onClick={() => setStep('EMAIL')} className="w-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white py-4 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-[#222] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-transparent dark:border-[#333]">
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