import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2, Sparkles,
  GraduationCap, Layout, ShieldCheck, School,
  ChevronLeft, AlertCircle, RefreshCw, Puzzle, ExternalLink, Download, CheckCircle2, Search
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
  const [signUpStep, setSignUpStep] = useState(1); 
  const [tempAuth, setTempAuth] = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef([]);

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);

  // --- NEW: Wizard State for Step 3 ---
  const [wizardStep, setWizardStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // --- NEW: Live Polling for Extension Sync ---
  useEffect(() => {
    let pollInterval;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user/portal-status`, {
          headers: { 'x-auth-token': tempAuth.token }
        });
        const data = await res.json();
        
        if (data.isConnected) {
          clearInterval(pollInterval);
          setIsVerifying(false);
          setVerifySuccess(true);
          // Magic Moment: Auto-login after 2 seconds of showing success!
          setTimeout(() => onLogin(tempAuth.token, tempAuth.user), 2000);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    };

    if (signUpStep === 3 && wizardStep === 3) {
      setIsVerifying(true);
      // Check immediately, then every 3 seconds
      checkStatus();
      pollInterval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(pollInterval);
  }, [signUpStep, wizardStep, tempAuth, onLogin]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSignUpStep(1);
    setWizardStep(1);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setOtpDigits(['', '', '', '', '', '']);
    setTempAuth(null);
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);
    if (value && index < 5) otpInputs.current[index + 1].focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputs.current[index - 1].focus();
    }
  };

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
      if (res.ok) setSignUpStep(2); 
      else setError(data.message || "Failed to send OTP.");
    } catch (err) { setError("Server unreachable."); } 
    finally { setLoading(false); }
  };

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

      setTempAuth({ token: data.token, user: data.user });
      setSignUpStep(3); // Enter the Wizard!
      
      // Auto-trigger download on reaching Step 3
      const link = document.createElement('a');
      link.href = '/MyPortal-Extension.zip';
      link.download = 'MyPortal-Sync-Extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

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
      } else { throw new Error(`Server connection error.`); }
    } catch (err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const isExpandedMode = (!isLogin && signUpStep >= 2);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden p-4 md:p-8">
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-brand-blue/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-1000" />

      <div className="w-full max-w-5xl h-[650px] bg-[#121212] border border-[#252525] rounded-3xl shadow-2xl flex relative overflow-hidden z-10">

        {/* LEFT INFO PANEL */}
        <div className={`hidden md:flex absolute top-0 w-1/2 h-full bg-gradient-to-br from-[#1a1a1a] to-[#0c0c0c] flex-col justify-between p-12 z-20 transition-all duration-700 ease-in-out ${isLogin ? 'translate-x-full border-l border-[#252525]' : 'translate-x-0 border-r border-[#252525]'} ${isExpandedMode ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-blue/10 rounded-xl"><GraduationCap className="w-8 h-8 text-brand-blue" /></div>
            <span className="text-xl font-bold text-white tracking-tight">MyPortal</span>
          </div>
          <div className="relative z-10">
            {features.map((feat, index) => (
              <div key={index} className={`transition-all duration-700 absolute bottom-0 left-0 w-full ${activeFeature === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                <div className="w-12 h-12 bg-[#252525] rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg border border-[#333]"><feat.icon size={24} /></div>
                <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">{feat.title}</h2>
                <p className="text-gray-400 text-lg leading-relaxed">{feat.text}</p>
              </div>
            ))}
            <div className="opacity-0 pointer-events-none"><div className="w-12 h-12 mb-6"></div><h2 className="text-3xl mb-4">Spacer</h2><p className="text-lg">Spacer</p></div>
          </div>
          <div className="flex gap-2">
            {features.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeFeature === i ? 'w-8 bg-brand-blue' : 'w-2 bg-[#333]'}`} />))}
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className={`h-full absolute top-0 bg-[#121212] p-8 md:p-12 flex flex-col justify-center z-10 transition-all duration-700 ease-in-out ${isLogin ? 'translate-x-0 w-full md:w-1/2' : 'md:translate-x-full w-full md:w-1/2'} ${isExpandedMode ? '!w-full !translate-x-0' : ''}`}>
          <div className={`mx-auto w-full transition-all duration-700 ${isExpandedMode ? 'max-w-lg md:max-w-2xl' : 'max-w-sm'}`}>

            {signUpStep !== 3 && (
                <div className={`mb-10 animate-fadeIn ${signUpStep === 2 ? 'flex flex-col items-center text-center' : ''}`}>
                {!isLogin && signUpStep === 2 && (
                    <button onClick={() => setSignUpStep(1)} className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-6 transition-colors group"><ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to details</button>
                )}
                <h1 className={`text-3xl font-bold text-white mb-2 ${signUpStep === 2 ? 'md:text-4xl mb-4' : ''}`}>
                    {isLogin ? 'Welcome Back' : (signUpStep === 1 ? 'Create Account' : 'Verify Email')}
                </h1>
                <p className={`text-gray-500 text-sm ${signUpStep === 2 ? 'md:text-base max-w-sm' : ''}`}>
                    {isLogin ? 'Enter your credentials to access your dashboard.' : (signUpStep === 1 ? 'Join the academic revolution today.' : `Enter the 6-digit code sent to ${formData.email}`)}
                </p>
                </div>
            )}

            {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-medium animate-fadeIn"><AlertCircle size={16} /> {error}</div>}

            {isLogin && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 animate-fadeIn">
                <InputGroup icon={Mail} type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
                <InputGroup icon={Lock} type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} togglePass={() => setShowPassword(!showPassword)} />
                <SubmitButton loading={loading} text="Sign In" />
              </form>
            )}

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

            {!isLogin && signUpStep === 2 && (
              <form onSubmit={handleFinalRegister} className="space-y-10 animate-fadeIn">
                <div className="flex justify-center gap-3 md:gap-5">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index} ref={(el) => (otpInputs.current[index] = el)} type="text" maxLength={1} value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-16 md:w-20 md:h-24 bg-[#1a1a1a] border border-[#333] focus:border-brand-blue rounded-2xl text-center text-2xl md:text-4xl font-bold text-white outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>
                <div className="max-w-sm mx-auto"><SubmitButton loading={loading} text="Create Account" icon={Sparkles} /></div>
              </form>
            )}

            {/* --- THE EXTENSION WIZARD --- */}
            {!isLogin && signUpStep === 3 && (
              <div className="animate-fadeIn w-full flex flex-col items-center max-w-xl mx-auto">
                
                {/* Wizard Header */}
                <div className="flex items-center justify-between w-full mb-8">
                  {[1, 2, 3].map(step => (
                    <div key={step} className="flex flex-col items-center relative z-10 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500
                        ${wizardStep > step ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 
                          wizardStep === step ? 'bg-brand-blue text-white ring-4 ring-blue-500/30' : 'bg-[#252525] text-gray-500 border border-[#333]'}`}
                      >
                        {wizardStep > step ? <CheckCircle2 size={20} /> : step}
                      </div>
                      <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider ${wizardStep >= step ? 'text-brand-blue' : 'text-gray-600'}`}>
                        {step === 1 ? 'Install' : step === 2 ? 'Login' : 'Verify'}
                      </span>
                    </div>
                  ))}
                  <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-[#252525] -z-0">
                    <div className="h-full bg-brand-blue transition-all duration-700 ease-out" style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}></div>
                  </div>
                </div>

                {/* Wizard Content */}
                <div className="w-full bg-[#1a1a1a] border border-[#333] rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl">
                  
                  {/* Step 1: Install */}
                  {wizardStep === 1 && (
                    <div className="animate-fadeIn text-center">
                      {/* Video/Animation Box */}
                      <div className="aspect-video w-full bg-gradient-to-br from-[#252525] to-[#121212] rounded-2xl border border-[#333] mb-6 flex items-center justify-center relative overflow-hidden">
                         {/* Replace this icon with your actual video later: <video src="/assets/step1.mp4" autoPlay loop muted className="object-cover w-full h-full" /> */}
                         <Puzzle size={64} className="text-brand-blue/50 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Extract & Load Extension</h3>
                      <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        We downloaded a `.zip` file for you. Extract it, open Chrome Extensions, turn on Developer Mode, and click <strong>Load unpacked</strong>.
                      </p>
                      <button onClick={() => setWizardStep(2)} className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all">
                        I have loaded the extension <ArrowRight size={18} />
                      </button>
                    </div>
                  )}

                  {/* Step 2: Login */}
                  {wizardStep === 2 && (
                    <div className="animate-fadeIn text-center">
                      <div className="aspect-video w-full bg-gradient-to-br from-[#252525] to-[#121212] rounded-2xl border border-[#333] mb-6 flex items-center justify-center">
                         {/* <video src="/assets/step2.mp4" autoPlay loop muted className="object-cover w-full h-full" /> */}
                         <School size={64} className="text-blue-500/50 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Login to UCP Horizon</h3>
                      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Open the university portal in a new tab and log in. The extension needs an active session to begin fetching your data securely.
                      </p>
                      <div className="flex gap-3">
                        <a href="https://horizon.ucp.edu.pk/student/dashboard" target="_blank" rel="noopener noreferrer" className="flex-1 bg-[#252525] hover:bg-[#333] border border-[#444] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                          Open Portal <ExternalLink size={16} />
                        </a>
                        <button onClick={() => setWizardStep(3)} className="flex-1 bg-brand-blue hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all">
                          Done <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Verify (Live Polling) */}
                  {wizardStep === 3 && (
                    <div className="animate-fadeIn text-center py-6">
                      
                      {verifySuccess ? (
                        <div className="animate-slideUp flex flex-col items-center">
                          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={48} className="text-green-500" />
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2">Connection Established!</h3>
                          <p className="text-green-400 text-sm">Data is flowing. Redirecting to your dashboard...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                             <div className="absolute inset-0 border-4 border-brand-blue/30 rounded-full animate-ping"></div>
                             <div className="absolute inset-4 border-4 border-brand-blue/50 rounded-full animate-spin"></div>
                             <Search size={32} className="text-brand-blue relative z-10" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Waiting for Extension...</h3>
                          <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                            Please open your UCP dashboard and click the <strong>Force Sync</strong> button in the extension. We are listening for your data...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Universal Skip Button */}
                {!verifySuccess && (
                  <button 
                    onClick={() => onLogin(tempAuth.token, tempAuth.user)}
                    className="mt-6 text-sm text-gray-500 hover:text-white transition-colors font-medium underline underline-offset-4"
                  >
                    I'll figure this out later, let me in.
                  </button>
                )}
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