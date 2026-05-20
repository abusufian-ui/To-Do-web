import React, { useState, useRef } from 'react';
import { 
  X, Camera, Trash2, LogOut, Shield, Crown, UserPlus, 
  Users, Check, AlertCircle 
} from 'lucide-react';

const GroupInfoModal = ({ 
  isOpen, 
  onClose, 
  user, 
  activeGroup, 
  fetchActiveGroup, 
  fetchTasks, 
  API_BASE, 
  authHeaders 
}) => {
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen || !activeGroup) return null;

  // Check if current user is admin (creator)
  const isGroupAdmin = activeGroup.creatorId?._id === user?.id || activeGroup.creatorId === user?.id || activeGroup.creatorId?._id === user?._id || activeGroup.creatorId === user?._id;

  // Format creation date
  const creationDate = activeGroup.createdAt 
    ? new Date(activeGroup.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : "Recently";

  // Handle image upload
  const handleImageClick = () => {
    if (isGroupAdmin && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('files', file);

      // 1. Upload the image to general upload
      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: {
          'x-auth-token': localStorage.getItem('token')
        },
        body: formData
      });

      if (!uploadRes.ok) throw new Error("Image upload failed");
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.urls[0];

      // 2. Update group profile image
      const updateRes = await fetch(`${API_BASE}/api/groups/${activeGroup._id}/profile-pic`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ profilePic: imageUrl })
      });

      if (updateRes.ok) {
        setSuccessMsg("Group profile picture updated successfully!");
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchActiveGroup();
      } else {
        const err = await updateRes.json();
        throw new Error(err.message || "Failed to update group image");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Remove member (Admin only)
  const handleRemoveMember = async (memberId, memberName) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      try {
        setErrorMsg('');
        const res = await fetch(`${API_BASE}/api/groups/remove-member`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ memberId })
        });
        if (res.ok) {
          setSuccessMsg(`${memberName} removed from the group.`);
          setTimeout(() => setSuccessMsg(''), 4000);
          fetchActiveGroup();
          fetchTasks();
        } else {
          const err = await res.json();
          setErrorMsg(err.message || "Failed to remove member");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to execute member removal");
      }
    }
  };

  // Leave / Disband group
  const handleLeaveGroup = async () => {
    const isCreator = activeGroup.creatorId?._id === user?.id || activeGroup.creatorId === user?.id || activeGroup.creatorId?._id === user?._id || activeGroup.creatorId === user?._id;
    const confirmMessage = isCreator
      ? "Disbanding the group will delete it and unshare all group tasks. Are you sure you want to proceed?"
      : "Are you sure you want to leave the study group? You will lose access to all shared tasks.";

    if (window.confirm(confirmMessage)) {
      try {
        const res = await fetch(`${API_BASE}/api/groups/leave`, {
          method: 'POST',
          headers: authHeaders
        });
        if (res.ok) {
          fetchActiveGroup();
          fetchTasks();
          onClose();
        } else {
          const err = await res.json();
          alert(err.message || "Failed to exit group");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Render group avatar dynamically
  const renderGroupAvatar = () => {
    if (activeGroup.profilePic && activeGroup.profilePic.trim() !== "") {
      return (
        <img 
          src={activeGroup.profilePic} 
          alt="" 
          className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-dark-border shadow-md"
        />
      );
    }
    // Modern default group initials avatar
    const initials = activeGroup.name?.substring(0, 2).toUpperCase() || "SG";
    return (
      <div className="w-28 h-28 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-extrabold text-3xl uppercase shadow-md border-4 border-white dark:border-dark-border">
        {initials}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-dark-border animate-slideUp overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold dark:text-white text-gray-800 flex items-center gap-2">
            <Users className="text-brand-blue" size={20} />
            Group Information
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Group Profile Header (WhatsApp style) */}
          <div className="flex flex-col items-center text-center">
            
            {/* Avatar container */}
            <div className="relative group/avatar cursor-pointer" onClick={handleImageClick}>
              {renderGroupAvatar()}
              
              {isGroupAdmin && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200">
                  <Camera className="text-white" size={24} />
                </div>
              )}
            </div>

            {isGroupAdmin && (
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            )}

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-4">{activeGroup.name}</h3>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
              Created {creationDate}
            </p>
            {isGroupAdmin && (
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full mt-2 block w-max">
                Group Admin
              </span>
            )}
          </div>

          {/* Success / Error Alerts */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn shrink-0">
              <Check size={16} />
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2 animate-fadeIn shrink-0">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-400">
              Members ({activeGroup.members?.length || 0})
            </h4>
            
            <div className="space-y-2">
              {activeGroup.members?.map((member) => {
                const isMemberCreator = member._id === activeGroup.creatorId?._id || member._id === activeGroup.creatorId || member === activeGroup.creatorId?._id || member === activeGroup.creatorId;
                const isSelf = member._id === user?.id || member._id === user?._id;

                return (
                  <div 
                    key={member._id} 
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 dark:bg-dark-surface/30 border border-gray-100/50 dark:border-dark-border/40 hover:bg-gray-100/40 dark:hover:bg-dark-surface/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      {member.customProfilePic && member.customProfilePic.trim() !== "" ? (
                        <img src={member.customProfilePic} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {member.name?.substring(0, 2).toUpperCase() || "MB"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                          {member.name} {isSelf && <span className="text-[9px] text-gray-400 font-normal">(You)</span>}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberCreator ? (
                        <span className="text-[9px] text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold">
                          <Crown size={10} /> Creator
                        </span>
                      ) : (
                        isGroupAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member._id, member.name)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-dark-border flex gap-3 shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors"
          >
            Close Details
          </button>
          
          <button 
            onClick={handleLeaveGroup}
            className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <LogOut size={14} />
            {isGroupAdmin ? "Disband Group" : "Leave Group"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
