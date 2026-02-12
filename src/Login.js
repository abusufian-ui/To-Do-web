import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form Data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setOtpSent(false);
    setOtp('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSendOTP = async () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        alert('OTP sent to your email!');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // --- VALIDATION ---
    if (!isLogin) {
      if (password !== confirmPassword) {
        setError("Passwords do not match!");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (!otpSent) {
        setError("Please verify your email first.");
        return;
      }
      if (!otp) {
        setError("Please enter the verification code.");
        return;
      }
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin 
      ? { email, password } 
      : { name, email, password, otp }; // Include OTP in register

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] p-8 rounded-2xl shadow-2xl relative z-10 animate-slideUp">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Enter your credentials to access the portal' : 'Join the academic management platform'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg mb-6 flex items-center gap-2">
            <ShieldCheck size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SIGN UP NAME */}
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
          )}

          {/* EMAIL & OTP SECTION */}
          <div className="space-y-2">
            <div className="relative group">
              <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                required
                disabled={isLogin ? false : otpSent} // Lock email after OTP sent
              />
              
              {/* VERIFY BUTTON (Only for Sign Up) */}
              {!isLogin && !otpSent && (
                <button 
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading || !email}
                  className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Sending...' : 'Verify'}
                </button>
              )}
            </div>

            {/* OTP INPUT (Appears after sending) */}
            {!isLogin && otpSent && (
              <div className="relative group animate-fadeIn">
                <KeyRound className="absolute left-3 top-3 text-emerald-500" size={18} />
                <input
                  type="text"
                  placeholder="Enter 6-digit Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  className="w-full bg-[#09090b] border border-emerald-900/50 rounded-xl py-3 pl-10 pr-4 text-sm text-emerald-400 placeholder-emerald-900/50 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
            )}
          </div>

          {/* PASSWORD */}
          <div className="relative group">
            <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl py-3 pl-10 pr-10 text-sm text-white focus:border-blue-500 outline-none transition-all"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* CONFIRM PASSWORD (Sign Up Only) */}
          {!isLogin && (
            <div className="relative group animate-fadeIn">
              <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-[#09090b] border rounded-xl py-3 pl-10 pr-10 text-sm text-white outline-none transition-all ${
                  confirmPassword && password !== confirmPassword 
                  ? 'border-red-500 focus:border-red-500' 
                  : 'border-[#27272a] focus:border-blue-500'
                }`}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')} 
            {!loading && <ArrowRight size={18} />}
          </button>

        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={toggleMode} 
              className="ml-2 text-blue-500 hover:text-blue-400 font-bold underline decoration-2 underline-offset-4 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;