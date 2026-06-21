import React from 'react';
import { 
  User, Shield, Link2, Mail, Camera, Loader2, X, 
  Globe, Smartphone, Chrome, Phone, GraduationCap, ExternalLink 
} from 'lucide-react';
import { ToastConfig } from './CustomToast';

const About = ({ user, onUpdateProfilePic }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const fileInputRef = React.useRef(null);

  if (!user) return null;

  const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'l1f23bscs1329@ucp.edu.pk';
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

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

  const formatDOB = (dobString) => {
    if (!dobString) return '';
    const date = new Date(dobString);
    if (isNaN(date.getTime())) return dobString;
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${day}${suffix} ${month}, ${year}`;
  };

  const getSemesterDisplay = (sem) => {
    if (!sem) return '';
    if (sem.toLowerCase().includes('semester')) return sem;
    return `${sem} Semester`;
  };

  const renderField = (label, value, isBadge = false, badgeColor = '') => {
    const displayValue = value ? String(value).trim() : '';
    if (!displayValue || displayValue.toLowerCase() === 'not scraped') {
      return null;
    }

    if (isBadge) {
      return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor || 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
            {displayValue}
          </span>
        </div>
      );
    }

    return (
      <div className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-white/5 last:border-0 gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-right break-words max-w-[70%]">
          {displayValue}
        </span>
      </div>
    );
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
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER SECTION (GLASSMORPHIC) */}
        <div className="relative overflow-hidden bg-white/70 dark:bg-[#1E1E1E]/60 backdrop-blur-md rounded-2xl p-8 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center gap-6 text-center md:text-left transition-all">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div 
            className="relative group cursor-pointer shrink-0"
            onClick={() => setIsPreviewOpen(true)}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-300"></div>
            {(user.customProfilePic || user.portalProfilePic || user.profilePic) ? (
              <img 
                src={user.customProfilePic || user.portalProfilePic || user.profilePic} 
                alt={user.name} 
                className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-indigo-500/10 transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-lg uppercase transition-transform duration-300 group-hover:scale-105">
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
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 truncate">{user.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
              <span className={`px-3 py-1 ${isSuperAdmin ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30' : user.isAdmin ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30'} text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5`}>
                <Shield size={12} /> {isSuperAdmin ? 'Super Admin' : user.isAdmin ? 'Administrator' : 'Student'}
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Mail size={12} /> {user.email}
              </span>
              {user.currentSemester && (
                <span className="px-3 py-1 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <GraduationCap size={12} /> {getSemesterDisplay(user.currentSemester)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3.5">
              Changing your profile picture will make it visible to all community members.
            </p>
          </div>
        </div>

        {/* PLATFORM CONNECTIONS HUB */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="text-indigo-500" size={20} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Connected Platforms</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Web Portal */}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-indigo-500/30">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-500 flex items-center justify-center shrink-0">
                  <Globe size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Web Portal</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">web.myportalucp.online</p>
                </div>
              </div>
            </div>

            {/* Mobile App */}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-indigo-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/5 text-sky-500 flex items-center justify-center shrink-0">
                  <Smartphone size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Mobile App</h3>
                    {user.accessedMobile ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        Unvisited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Download for iOS / Android</p>
                </div>
              </div>
              {!user.accessedMobile && (
                <a 
                  href="https://myportalucp.online/download" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-2 text-center rounded-lg bg-gray-100 hover:bg-indigo-500 hover:text-white dark:bg-white/5 dark:hover:bg-indigo-600 text-sm font-bold text-indigo-500 transition-all flex items-center justify-center gap-1.5"
                >
                  Download App <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Chrome Extension */}
            <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-all hover:border-indigo-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 dark:bg-yellow-500/5 text-yellow-500 flex items-center justify-center shrink-0">
                  <Chrome size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Chrome Extension</h3>
                    {user.accessedExtension ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                        Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        Unvisited
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Enhance portal navigation</p>
                </div>
              </div>
              {!user.accessedExtension && (
                <a 
                  href="https://chromewebstore.google.com/detail/my-portal-ucp/gejkdlojmdfpbkpmedmfbeafcjlccbpm" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-2 text-center rounded-lg bg-gray-100 hover:bg-indigo-500 hover:text-white dark:bg-white/5 dark:hover:bg-indigo-600 text-sm font-bold text-indigo-500 transition-all flex items-center justify-center gap-1.5"
                >
                  Install Extension <ExternalLink size={14} />
                </a>
              )}
            </div>

          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* PERSONAL DETAILS */}
          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={16} className="text-indigo-500" /> Personal Details
            </h3>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {renderField("Date of Birth", formatDOB(user.dob))}
              {renderField("Gender", user.gender)}
              {renderField("Blood Group", user.bloodGroup, user.bloodGroup?.includes('+') || user.bloodGroup?.includes('-'), 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/30')}
              {renderField("Father Name", user.fatherName)}
              {renderField("Nationality", user.nationality)}
              {renderField("Religion", user.religion)}
              {renderField("Marital Status", user.maritalStatus)}
              {renderField("CNIC", user.cnic)}
              {renderField("Domicile", user.domicile)}
              {renderField("Father CNIC", user.fatherCnic)}
              {renderField("Guardian Name", user.guardianName)}
              {renderField("Guardian CNIC", user.guardianCnic)}
            </div>
          </div>

          <div className="space-y-6">
            
            {/* CONTACT INFORMATION */}
            <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Phone size={16} className="text-indigo-500" /> Contact Information
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {renderField("Phone Number", user.phone)}
                {renderField("Emergency Contact", user.emergencyContact)}
                {renderField("Secondary Email", user.secondaryEmail)}
                
                {user.presentAddress && user.presentAddress.trim().toLowerCase() !== 'not scraped' && (
                  <div className="py-2.5 flex flex-col gap-1 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Present Address</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">
                      {user.presentAddress}
                    </span>
                  </div>
                )}

                {user.permanentAddress && user.permanentAddress.trim().toLowerCase() !== 'not scraped' && (
                  <div className="py-2.5 flex flex-col gap-1 border-b border-gray-100 dark:border-white/5 last:border-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Permanent Address</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">
                      {user.permanentAddress}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ACADEMIC RECORDS */}
            <div className="bg-white dark:bg-[#1E1E1E] rounded-xl p-6 border border-gray-200 dark:border-white/10 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-indigo-500" /> Academic Records
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {renderField("Faculty", user.faculty)}
                {renderField("Program", user.program)}
                {renderField("Career Type", user.careerType)}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* FULL SCREEN PROFILE PIC PREVIEW */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
          <button 
            onClick={() => setIsPreviewOpen(false)} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all hover:rotate-90"
            title="Close Preview"
          >
            <X size={24} />
          </button>
          
          <div className="relative max-w-[90vw] max-h-[75vh] flex flex-col items-center justify-center">
            {(user.customProfilePic || user.portalProfilePic || user.profilePic) ? (
              <img 
                src={user.customProfilePic || user.portalProfilePic || user.profilePic} 
                alt={user.name} 
                className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
              />
            ) : (
              <div className="w-64 h-64 bg-gradient-to-br from-indigo-500 to-sky-600 rounded-2xl flex items-center justify-center text-8xl text-white font-bold shadow-2xl uppercase border border-white/10">
                {user.name.charAt(0)}
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => {
                  setIsPreviewOpen(false);
                  if (!isUploading && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95"
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

export default About;
