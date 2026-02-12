import React, { useState } from 'react';
import { 
  User, Lock, RefreshCw, Unlink, LogOut, Clock, Save, 
  AlertCircle, CheckCircle2, Book, Plus, Trash2, Link2, Info 
} from 'lucide-react';

const Settings = ({ 
  user, 
  idleTimeout, 
  setIdleTimeout, 
  onManualSync, 
  onDisconnect, 
  onLinkPortal,
  onUpdateProfile, 
  onChangePassword, 
  courses,
  addCourse,
  removeCourse
}) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form States
  const [name, setName] = useState(user?.name || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [portalCreds, setPortalCreds] = useState({ portalId: '', portalPassword: '' });
  const [newCourseName, setNewCourseName] = useState('');

  // --- ACTIONS ---

  // 1. Update Profile Name
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpdateProfile(name); 
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 2. Change Password
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: "New passwords don't match." });
      return;
    }
    setLoading(true);
    try {
      await onChangePassword(passwords.current, passwords.new); 
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Incorrect password.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 3. Link Portal
  const handleLink = async (e) => {
    e.preventDefault();
    if (!portalCreds.portalId || !portalCreds.portalPassword) {
      setMessage({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }
    setLoading(true);
    try {
      await onLinkPortal(portalCreds.portalId, portalCreds.portalPassword);
      setMessage({ type: 'success', text: 'Portal linked successfully!' });
      setPortalCreds({ portalId: '', portalPassword: '' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to link account. Check credentials.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 4. Manual Sync
  const handleSync = async () => {
    setLoading(true);
    try {
      await onManualSync();
      setMessage({ type: 'success', text: 'Sync completed successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed. Try again.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 5. Add Custom Course
  const handleAddCourse = (e) => {
    e.preventDefault();
    if (newCourseName.trim()) {
      addCourse({ name: newCourseName, type: 'manual' }); 
      setNewCourseName('');
      setMessage({ type: 'success', text: 'Course added.' });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  // --- RENDER HELPERS ---
  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
        activeSection === id 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252525]'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="flex h-full bg-gray-50 dark:bg-[#0c0c0c] animate-fadeIn overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <div className="w-64 border-r border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1E1E1E] p-6 flex flex-col gap-2">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Settings</h2>
        <SidebarItem id="profile" label="Profile Settings" icon={User} />
        <SidebarItem id="security" label="Security" icon={Lock} />
        <SidebarItem id="portal" label="Portal Connection" icon={RefreshCw} />
        <SidebarItem id="courses" label="Course Manager" icon={Book} />
        <SidebarItem id="preferences" label="Preferences" icon={Clock} />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto">
          
          {/* FEEDBACK MESSAGE */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold animate-slideDown ${
              message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          {/* --- PROFILE SECTION --- */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold dark:text-white">Personal Information</h2>
              <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={user.email} 
                      disabled 
                      className="w-full bg-gray-100 dark:bg-[#252525] border border-transparent rounded-lg p-3 text-sm text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed.</p>
                  </div>
                  <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                    {loading ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* --- SECURITY SECTION --- */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold dark:text-white">Security</h2>
              <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                    <input 
                      type="password" 
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                      <input 
                        type="password" 
                        value={passwords.new}
                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New</label>
                      <input 
                        type="password" 
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                    {loading ? 'Processing...' : <><Save size={16} /> Update Password</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* --- PORTAL SECTION --- */}
          {activeSection === 'portal' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold dark:text-white">Portal Connection</h2>
              <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                {user.isPortalConnected ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-200">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 dark:text-blue-100">Connected as {user.portalId}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Your grades and courses are syncing automatically.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={handleSync} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-white py-3 rounded-xl font-bold transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> 
                        {loading ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button onClick={() => { if(window.confirm('Disconnect portal?')) onDisconnect(); }} className="flex-1 flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 py-3 rounded-xl font-bold transition-all">
                        <Unlink size={18} /> Disconnect
                      </button>
                    </div>
                    
                    {/* RED NOTE - CONNECTED STATE */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3 rounded-xl flex gap-3 items-start mt-2">
                      <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                        <strong>Sync Status:</strong> Connecting to the university database usually takes <strong>15 to 30 seconds</strong>. 
                        If you don't see your latest data, please click the <strong>Manual Sync</strong> button above to refresh immediately.
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <div className="inline-block p-3 bg-gray-100 dark:bg-[#252525] rounded-full text-gray-400 mb-2">
                        <Link2 size={24} />
                      </div>
                      <h3 className="text-lg font-bold dark:text-white">Connect University Portal</h3>
                      <p className="text-gray-500 text-xs">Sync your grades, courses, and schedule automatically.</p>
                    </div>

                    <form onSubmit={handleLink} className="space-y-4 max-w-sm mx-auto">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Portal ID</label>
                        <input 
                          type="text" 
                          value={portalCreds.portalId}
                          onChange={(e) => setPortalCreds({ ...portalCreds, portalId: e.target.value })}
                          placeholder="e.g. L1F19BSCS0000"
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                        <input 
                          type="password" 
                          value={portalCreds.portalPassword}
                          onChange={(e) => setPortalCreds({ ...portalCreds, portalPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                        {loading ? 'Connecting...' : 'Connect Account'}
                      </button>
                    </form>
                    
                    {/* RED NOTE - DISCONNECTED STATE */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-3 rounded-xl flex gap-3 items-start mt-4 max-w-sm mx-auto">
                      <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed text-left">
                        <strong>Note:</strong> Initial data retrieval may take <strong>15-30 seconds</strong> after connection. If your dashboard remains empty, please use the <strong>Manual Sync</strong> option in settings.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- COURSE MANAGER --- */}
          {activeSection === 'courses' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold dark:text-white">Course Manager</h2>
              <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                <form onSubmit={handleAddCourse} className="flex gap-2 mb-6">
                  <input 
                    type="text" 
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Enter course name..."
                    className="flex-1 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-lg p-3 text-sm dark:text-white outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg flex items-center gap-2 font-bold text-sm">
                    <Plus size={16} /> Add
                  </button>
                </form>

                <div className="space-y-2">
                  {courses.length === 0 && <p className="text-sm text-gray-500 text-center">No courses available.</p>}
                  {courses.map((course) => (
                    <div key={course.id || course.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#252525] rounded-lg border border-gray-100 dark:border-[#333]">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{course.name}</span>
                      {course.type !== 'uni' && (
                        <button onClick={() => removeCourse(course.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                      {course.type === 'uni' && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">Portal</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- PREFERENCES SECTION --- */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold dark:text-white">System Preferences</h2>
              <div className="bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                    <LogOut size={16} /> Auto-Logout Timer
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Automatically log out after a period of inactivity.</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '5 Mins', value: 300000 },
                      { label: '15 Mins', value: 900000 },
                      { label: '30 Mins', value: 1800000 },
                      { label: '1 Hour', value: 3600000 },
                      { label: 'Never', value: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setIdleTimeout(opt.value)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          idleTimeout === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-[#252525] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#333] hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
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

export default Settings;