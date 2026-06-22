import React from 'react';
import { User, Calendar, Shield, Link2, CheckCircle2, XCircle, Activity, Mail, Camera, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { ToastConfig } from './CustomToast';

const MyProfile = ({ user, onUpdateProfilePic, onUpdatePrivacy }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false); 
  const fileInputRef = React.useRef(null);
  if (!user) return null;

  const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    
    if (!file.type.startsWith('image/')) {
      ToastConfig.show({ title: "Invalid File", message: "Please select an image file.", type: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      ToastConfig.show({ title: "File Too Large", message: "Image must be less than 5MB.", type: "error" });
      return;
    }

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      setIsUploading(true);
      await onUpdateProfilePic(formData);
      ToastConfig.show({ title: "Success", message: "Profile picture updated!", type: "success" });
    } catch (error) {
      console.error("Upload failed:", error);
      ToastConfig.show({ title: "Upload Failed", message: error.message || "Could not upload image.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 w-full h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#0c0c0c] animate-fadeIn">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange}
      />
      <div className="max-w-3xl mx-auto space-y-6">
        
        {}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-8 border border-gray-200 dark:border-[#333] shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setIsPreviewOpen(true)}
          >
            {(user.customProfilePic || user.portalProfilePic || user.profilePic) ? (
              <img 
                src={user.customProfilePic || user.portalProfilePic || user.profilePic} 
                alt={user.name} 
                className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-blue-500/10 transition-opacity group-hover:opacity-75" 
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-lg uppercase transition-opacity group-hover:opacity-75">
                {user.name.charAt(0)}
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploading ? (
                <Loader2 className="text-white animate-spin" size={24} />
              ) : (
                <Camera className="text-white" size={24} />
              )}
            </div>
            
            {isUploading && (
              <div className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full shadow-lg border-2 border-white dark:border-[#1E1E1E]">
                <Loader2 className="text-white animate-spin" size={12} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{user.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className={`px-3 py-1 ${isSuperAdmin ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : user.isAdmin ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'} text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1`}>
                <Shield size={12} /> {isSuperAdmin ? 'Super Admin' : user.isAdmin ? 'Administrator' : 'Student'}
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-[#2C2C2C] text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full flex items-center gap-1">
                <Mail size={12} /> {user.email}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                {(user.showProfilePicToCommunity ?? false) ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-amber-500" />}
                Profile Pic:
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const currentVal = user.showProfilePicToCommunity ?? false;
                    await onUpdatePrivacy(!currentVal);
                    ToastConfig.show({ title: "Success", message: `Profile picture is now ${!currentVal ? 'public' : 'private'}.`, type: "success" });
                  } catch (err) {
                    ToastConfig.show({ title: "Error", message: err.message || "Failed to update visibility.", type: "error" });
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  (user.showProfilePicToCommunity ?? false) ? 'bg-blue-500' : 'bg-gray-300 dark:bg-[#333]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    (user.showProfilePicToCommunity ?? false) ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                (user.showProfilePicToCommunity ?? false) 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30' 
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
              }`}>
                {(user.showProfilePicToCommunity ?? false) ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {}
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
                <span className="text-sm text-gray-500 dark:text-gray-400">Portal ID</span>
                <span className="text-xs font-mono text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#252525] px-2 py-1 rounded select-all font-semibold uppercase">
                  {user.portalId || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {}
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
                    <span className="font-mono font-medium text-gray-900 dark:text-white uppercase">{user.rollNumber || user.portalId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Sync Status:</span>
                    <span className={`flex items-center gap-1 ${user.ucpCookie ? 'text-blue-500' : 'text-yellow-500'} font-bold text-xs`}>
                      <Activity size={12} className={user.ucpCookie ? "animate-pulse" : ""} /> {user.ucpCookie ? 'Active' : 'Cookie Expired'}
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

      {}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
          {}
          <button 
            onClick={() => setIsPreviewOpen(false)} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:rotate-90 animate-slide-up-fade"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          
          {}
          <div className="relative max-w-[90vw] max-h-[75vh] flex flex-col items-center justify-center">
            {(user.customProfilePic || user.portalProfilePic || user.profilePic) ? (
              <img 
                src={user.customProfilePic || user.portalProfilePic || user.profilePic} 
                alt={user.name} 
                className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
              />
            ) : (
              <div className="w-64 h-64 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-8xl text-white font-bold shadow-2xl uppercase border border-white/10">
                {user.name.charAt(0)}
              </div>
            )}
            
            {}
            <div className="mt-6 flex gap-3">
              <button 
                onClick={(e) => {
                  setIsPreviewOpen(false);
                  if (!isUploading && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95"
              >
                {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                <span>Change Picture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;