import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Lock, Mail, ArrowRight, User } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const videoRef = useRef(null);

  // --- CONFIGURATION ---
  const PAUSE_TIME = 11000; 

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setShowForm(true);
    }, PAUSE_TIME);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // --- AUTHENTICATION CHECK ---
    if (email === 'admin' && password === 'admin') {
      onLogin(email, password);
    } else {
      alert("ACCESS DENIED: Incorrect Credentials");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center bg-black font-sans">
      
      {/* --- BACKGROUND VIDEO --- */}
      <video 
        ref={videoRef}
        autoPlay 
        muted 
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* --- OVERLAY MASK --- */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-1000 ${showForm ? 'opacity-100' : 'opacity-0'}`}></div>

      {/* --- LOGIN INTERFACE --- */}
      <div 
        className={`relative z-10 w-full max-w-[400px] flex flex-col items-center transition-all duration-1000 ease-out transform ${
          showForm ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
        }`}
      >
        
        {/* PREMIUM GLASS CARD */}
        <div className="w-full bg-black/30 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-3xl p-10 ring-1 ring-white/5">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <User className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              Welcome Back
            </h1>
            <p className="text-white/40 text-sm font-medium tracking-wide">
              Please enter your details
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input 1: Username/Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Username</label>
              <div className="relative group">
                <Mail size={18} className="absolute left-0 top-3 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" // Changed from 'email' to 'text' to allow "admin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-transparent border-b border-white/20 py-2.5 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-0 top-3 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-transparent border-b border-white/20 py-2.5 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Action Button */}
            <button 
              type="submit"
              className="w-full group mt-8 bg-white text-black font-bold py-3.5 rounded-xl shadow-lg shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
            >
              Unlock Portal
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

          </form>
        </div>

        {/* --- FOOTER CREDIT --- */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-medium">
            Developed by abusufian_ui
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;