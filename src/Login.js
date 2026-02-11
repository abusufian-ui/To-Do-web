import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isRegister ? '/api/register' : '/api/login';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      
      // Pass token and user info back to App.js
      onLogin(data.token, data.user);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl border border-gray-200 dark:border-[#333] overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {isRegister ? 'Start organizing your academic life' : 'Sign in to access your portal'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#121212] dark:text-white outline-none focus:border-blue-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="email" 
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#121212] dark:text-white outline-none focus:border-blue-500"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="password" 
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#121212] dark:text-white outline-none focus:border-blue-500"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Sign Up' : 'Sign In')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;