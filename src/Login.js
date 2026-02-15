import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Sparkles,
  GraduationCap, Layout, ShieldCheck, School,
  ChevronLeft, AlertCircle, RefreshCw, Download, Puzzle, ExternalLink, CheckCircle
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const features = [
  { icon: School, title: "Academic Excellence", text: "Track your CGPA, grades, and attendance in real-time." },
  { icon: Layout, title: "Task Management", text: "Organize assignments, quizzes, and personal tasks efficiently." },
  { icon: ShieldCheck, title: "Secure Portal", text: "Your data is encrypted and synced directly with the university." },
];

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1); // 1: Details, 2: OTP, 3: Extension Setup

  // Auth Storage to hold token before finalizing setup
  const [tempAuth, setTempAuth] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // OTP Individual Digits State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef([]);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-trigger extension download when reaching Step 3
  useEffect(() => {
    if (signUpStep === 3) {
      // NOTE: Replace this URL with the actual path to your extension .zip or Chrome Web Store link
      const extensionUrl = '/MyPortal-Extension.zip'; 
      
      const link = document.createElement('a');
      link.href = extensionUrl;
      link.download = 'MyPortal-Sync-Extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [signUpStep]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSignUpStep(1);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setOtpDigits(['', '', '', '', '', '']);
    setTempAuth(null);
  };

  // --- OTP INPUT LOGIC ---
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1].focus();
    }
  };

  // --- HANDLERS ---

  // STEP 1: Send OTP and Move to Step 2
  const handleInitiateSignUp = async (e) => {
    e.preventDefault();
    if (!formData.email.includes('@')) return setError('Invalid email address.');
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match.");
    if (formData.password.length < 6) return setError("Password too short (min 6 chars).");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();

      if (res.ok) {
        setSignUpStep(2); 
      } else {
        setError(data.message || "Failed to send OTP.");
      }
    } catch (err) {
      setError("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Final Registration & Move to Step 3
  const handleFinalRegister = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length < 6) return setError("Please enter the full 6-digit code.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, otp: fullOtp })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      // Save token temporarily and move to Extension Onboarding step
      setTempAuth({ token: data.token, user: data.user });
      setSignUpStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        onLogin(data.token, data.user);
      } else {
        throw new Error(`Server connection error (${res.status}). Try clearing your browser cookies.`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Determines if we are in the expanded full-screen mode
  const isExpandedMode = (!isLogin && signUpStep >= 2);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden p-4 md:p-8">

      {/* Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-brand-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />

      <div className="w-full max-w-5xl h-[650px] bg-[#121212] border border-[#252525] rounded-3xl shadow-2xl flex relative overflow-hidden z-10">

        {/* --- INFO PANEL (SLIDES OUT DURING OTP/STEP 3) --- */}
        <div
          className={`
            hidden md:flex absolute top-0 w-1/2 h-full bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] 
            flex-col justify-between p-12 z-20 transition-all duration-700 ease-in-out
            ${isLogin ? 'translate-x-full border-l border-[#252525]' : 'translate-x-0 border-r border-[#252525]'}
            ${isExpandedMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl">
              <GraduationCap className="w-8 h-8 text-brand-blue" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MyPortal</span>
          </div>

          <div className="relative z-10">
            {features.map((feat, index) => (
              <div
                key={index}
                className={`transition-all duration-700 absolute bottom-0 left-0 w-full ${activeFeature === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}
              >
                <div className="w-12 h-12 bg-[#252525] rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg border border-[#333]">
                  <feat.icon size={24} />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">{feat.title}</h2>
                <p className="text-gray-400 text-lg leading-relaxed">{feat.text}</p>
              </div>
            ))}
            <div className="opacity-0 pointer-events-none">
              <div className="w-12 h-12 mb-6"></div><h2 className="text-3xl mb-4">Spacer</h2><p className="text-lg">Spacer</p>
            </div>
          </div>

          <div className="flex gap-2">
            {features.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeFeature === i ? 'w-8 bg-brand-blue' : 'w-2 bg-[#333]'}`} />
            ))}
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        </div>

        {/* --- FORM PANEL (EXPANDS TO FULL WIDTH FOR OTP/STEP 3) --- */}
        <div
          className={`
            h-full absolute top-0 bg-[#121212] p-8 md:p-12 flex flex-col justify-center z-10
            transition-all duration-700 ease-in-out
            ${isLogin ? 'translate-x-0 w-full md:w-1/2' : 'md:translate-x-full w-full md:w-1/2'} 
            ${isExpandedMode ? '!w-full !translate-x-0' : ''}
          `}
        >
          <div className={`mx-auto w-full transition-all duration-700 ${isExpandedMode ? 'max-w-lg md:max-w-2xl' : 'max-w-sm'}`}>

            {/* Standard Header (Hidden on Step 3) */}
            {signUpStep !== 3 && (
                <div className={`mb-10 animate-fadeIn ${signUpStep === 2 ? 'flex flex-col items-center text-center' : ''}`}>
                {!isLogin && signUpStep === 2 && (
                    <button
                    onClick={() => setSignUpStep(1)}
                    className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-6 transition-colors group"
                    >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to details
                    </button>
                )}
                <h1 className={`text-3xl font-bold text-white mb-2 ${signUpStep === 2 ? 'md:text-4xl mb-4' : ''}`}>
                    {isLogin ? 'Welcome Back' : (signUpStep === 1 ? 'Create Account' : 'Verify Email')}
                </h1>
                <p className={`text-gray-500 text-sm ${signUpStep === 2 ? 'md:text-base max-w-sm' : ''}`}>
                    {isLogin ? 'Enter your credentials to access your dashboard.' : (signUpStep === 1 ? 'Join the academic revolution today.' : `Enter the 6-digit code sent to ${formData.email}`)}
                </p>
                </div>
            )}

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium animate-fadeIn">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* LOGIN FORM */}
            {isLogin && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
                <InputGroup icon={Mail} type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
                <InputGroup icon={Lock} type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} togglePass={() => setShowPassword(!showPassword)} />
                <SubmitButton loading={loading} text="Sign In" />
              </form>
            )}

            {/* SIGN UP STEP 1: Details */}
            {!isLogin && signUpStep === 1 && (
              <form onSubmit={handleInitiateSignUp} className="space-y-4 animate-fadeIn">
                <InputGroup icon={User} type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} />
                <InputGroup icon={Mail} type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-3">
                  <InputGroup icon={Lock} type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                  <InputGroup icon={Lock} type="password" name="confirmPassword" placeholder="Confirm" value={formData.confirmPassword} onChange={handleChange} />
                </div>
                <SubmitButton loading={loading} text="Verify & Continue" icon={ArrowRight} />
              </form>
            )}

            {/* SIGN UP STEP 2: OTP Verification */}
            {!isLogin && signUpStep === 2 && (
              <form onSubmit={handleFinalRegister} className="space-y-10 animate-fadeIn">
                <div className="flex justify-center gap-3 md:gap-5">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-16 md:w-20 md:h-24 bg-[#1a1a1a] border border-[#333] focus:border-brand-blue rounded-2xl text-center text-2xl md:text-4xl font-bold text-white outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>

                <div className="max-w-sm mx-auto">
                    <SubmitButton loading={loading} text="Create Account" icon={Sparkles} />
                </div>

                <div className="text-center mt-6">
                  <p className="text-gray-500 text-sm">Didn't receive the code? <button type="button" onClick={handleInitiateSignUp} className="text-brand-blue font-bold hover:underline transition-all hover:text-blue-400">Resend OTP</button></p>
                </div>
              </form>
            )}

            {/* SIGN UP STEP 3: Extension Setup (Modern UI) */}
            {!isLogin && signUpStep === 3 && (
              <div className="animate-fadeIn w-full">
                  <div className="text-center mb-10">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-500" />
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Account Verified!</h2>
                      <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
                        To keep your data strictly private, we use a secure browser extension instead of asking for your portal password. 
                        Your download should start automatically.
                      </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      {/* Step 1 */}
                      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] text-center relative hover:-translate-y-1 transition-transform">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center font-bold shadow-lg">1</div>
                          <Puzzle size={32} className="text-brand-blue mx-auto mb-4" />
                          <h3 className="text-white font-bold mb-2">Install Extension</h3>
                          <p className="text-gray-500 text-xs">Extract the downloaded zip and load it in Chrome Extensions.</p>
                      </div>
                      
                      {/* Step 2 */}
                      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] text-center relative hover:-translate-y-1 transition-transform">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center font-bold shadow-lg">2</div>
                          <School size={32} className="text-brand-blue mx-auto mb-4" />
                          <h3 className="text-white font-bold mb-2">Login to Horizon</h3>
                          <p className="text-gray-500 text-xs">Open your UCP portal and log in with your normal credentials.</p>
                      </div>

                      {/* Step 3 */}
                      <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] text-center relative hover:-translate-y-1 transition-transform">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center font-bold shadow-lg">3</div>
                          <RefreshCw size={32} className="text-brand-blue mx-auto mb-4" />
                          <h3 className="text-white font-bold mb-2">Sync & Relax</h3>
                          <p className="text-gray-500 text-xs">Click the extension icon to instantly sync your data in the background.</p>
                      </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                      <a 
                        href="https://horizon.ucp.edu.pk/student/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#252525] hover:bg-[#333] border border-[#444] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                         Open UCP Portal <ExternalLink size={18} />
                      </a>
                      <button 
                        onClick={() => onLogin(tempAuth.token, tempAuth.user)} 
                        className="flex-1 bg-brand-blue hover:bg-blue-600 shadow-lg shadow-blue-600/20 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                         I've done this, let's go! <ArrowRight size={18} />
                      </button>
                  </div>
                  
                  <div className="text-center mt-6">
                      <a href="/MyPortal-Extension.zip" download className="text-sm text-gray-500 hover:text-white underline transition-colors">
                          Download didn't start? Click here.
                      </a>
                  </div>
              </div>
            )}

            {/* BOTTOM TOGGLE (Hidden on Step 3) */}
            {signUpStep !== 3 && (
                <div className="mt-8 text-center pt-6 border-t border-[#252525]">
                <p className="text-gray-500 text-sm">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={toggleMode} className="ml-2 text-white font-bold hover:text-brand-blue transition-colors">
                    {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Components (Unchanged)
const InputGroup = ({ icon: Icon, type, name, placeholder, value, onChange, togglePass }) => (
  <div className="relative group">
    <div className="absolute left-4 top-4 text-gray-500 group-focus-within:text-brand-blue transition-colors">
      <Icon size={20} />
    </div>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full bg-[#1a1a1a] border border-[#333] group-focus-within:border-brand-blue rounded-xl py-4 pl-12 pr-4 text-base text-white placeholder-gray-600 outline-none transition-all shadow-inner"
      required
    />
    {name.includes('password') && togglePass && (
      <button type="button" onClick={togglePass} className="absolute right-4 top-4 text-gray-600 hover:text-white transition-colors">
        {type === 'password' ? <Eye size={20} /> : <EyeOff size={20} />}
      </button>
    )}
  </div>
);

const SubmitButton = ({ loading, text, icon: Icon, spinIcon }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
  >
    {loading && !spinIcon ? <Loader2 size={24} className="animate-spin" /> : (
      <>
        {text} {Icon && <Icon size={20} className={spinIcon ? "animate-spin" : ""} />}
      </>
    )}
  </button>
);

export default Login;