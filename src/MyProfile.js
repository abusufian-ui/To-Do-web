import React from 'react';
import { User, Calendar, Shield, Link2, CheckCircle2, XCircle, Activity, Mail } from 'lucide-react';

const MyProfile = ({ user }) => {
  if (!user) return null;

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] animate-fadeIn">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* HEADER CARD */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-8 border border-gray-200 dark:border-[#333] shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-lg uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{user.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <User size={12} /> {user.isAdmin ? 'Administrator' : 'Student'}
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full flex items-center gap-1">
                <Mail size={12} /> {user.email}
              </span>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ACCOUNT INFO */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-gray-200 dark:border-[#333] shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Shield size={16} /> Account Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#333]">
                <span className="text-sm text-gray-500 dark:text-gray-400">Member Since</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  {formatDate(user.createdAt)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-[#333]">
                <span className="text-sm text-gray-500 dark:text-gray-400">Account Status</span>
                <span className="text-sm font-bold text-green-500 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">User ID</span>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-[#252525] px-2 py-1 rounded select-all">
                  {user.id || user._id}
                </span>
              </div>
            </div>
          </div>

          {/* UNIVERSITY PORTAL INFO */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 border border-gray-200 dark:border-[#333] shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Link2 size={16} /> Portal Connection
            </h3>
            
            {user.isPortalConnected ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl p-4 flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">Connected</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Syncing enabled</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Connected Account:</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{user.portalId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Sync Status:</span>
                    <span className="flex items-center gap-1 text-blue-500 font-bold text-xs">
                      <Activity size={12} /> Live
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                <div className="p-3 bg-gray-100 dark:bg-[#252525] rounded-full text-gray-400">
                  <XCircle size={32} />
                </div>
                <p className="text-sm font-bold text-gray-500">Not Connected</p>
                <p className="text-xs text-gray-400 max-w-[200px]">
                  Link your university portal in Settings to enable grade syncing.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyProfile;