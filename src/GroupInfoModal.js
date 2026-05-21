import React, { useState, useRef } from 'react';
import {
  X, Camera, Trash2, LogOut, ShieldAlert, Users, Check, AlertCircle, Edit
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { ToastConfig } from './CustomToast';

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState(activeGroup?.name || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // 🚀 NEW: Preview State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null, confirmText: 'Confirm' });
  const fileInputRef = useRef(null);

  if (!isOpen || !activeGroup) return null;

  const isCreator = activeGroup.creatorId?._id === user?.id || activeGroup.creatorId === user?.id || activeGroup.creatorId?._id === user?._id || activeGroup.creatorId === user?._id;
  const isGroupAdmin = isCreator || activeGroup.admins?.some(adminId => adminId === user?.id || adminId?._id === user?.id || adminId === user?._id || adminId?._id === user?._id);

  const creationDate = activeGroup.createdAt
    ? new Date(activeGroup.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : "Recently";

  // 🚀 OPEN FULLSCREEN PREVIEW INSTEAD OF FILE UPLOADER
  const handleAvatarClick = () => {
    setIsPreviewOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('profilePic', file);

      const updateRes = await fetch(`${API_BASE}/api/groups/${activeGroup._id}/profile-pic`, {
        method: 'PUT',
        headers: { 'x-auth-token': localStorage.getItem('token') },
        body: formData
      });

      if (updateRes.ok) {
        setSuccessMsg("Group avatar updated successfully!");
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchActiveGroup();
      } else {
        const err = await updateRes.json();
        throw new Error(err.message || "Failed to update group image");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveGroupName = async () => {
    if (!groupNameInput.trim() || groupNameInput.trim() === activeGroup.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/groups/update-name`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: groupNameInput.trim() })
      });
      if (res.ok) {
        setSuccessMsg("Group renamed successfully!");
        setIsEditingName(false);
        fetchActiveGroup();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to rename group");
      }
    } catch (err) {
      setErrorMsg("Error saving group name.");
    }
  };

  const handleToggleAdminRole = async (memberId, memberName) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/toggle-admin`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ memberId })
      });
      if (res.ok) {
        setSuccessMsg(`Altered roles successfully for ${memberName}`);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActiveGroup();
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to re-assign role.");
      }
    } catch (err) {
      setErrorMsg("Failed to switch administrative roles.");
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from the group?`,
      confirmText: 'Remove',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/groups/remove-member`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ memberId })
          });
          if (res.ok) {
            ToastConfig.show({ title: "Success", message: `${memberName} removed from the group.`, type: "success" });
            fetchActiveGroup();
            fetchTasks();
          } else {
            const err = await res.json();
            ToastConfig.show({ title: "Error", message: err.message || "Failed to remove member", type: "error" });
          }
        } catch (err) {
          ToastConfig.show({ title: "Error", message: "Failed to execute member removal", type: "error" });
        }
      }
    });
  };

  const handleLeaveGroup = async () => {
    const confirmMessage = isCreator
      ? "Disbanding the group will delete it and unshare all group tasks. Are you sure you want to proceed?"
      : "Are you sure you want to leave the study group? You will lose access to all shared tasks.";

    setConfirmModal({
      isOpen: true,
      title: isCreator ? 'Disband Group' : 'Leave Group',
      message: confirmMessage,
      confirmText: isCreator ? 'Disband Group' : 'Leave Group',
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/groups/leave`, {
            method: 'POST',
            headers: authHeaders
          });
          if (res.ok) {
            fetchActiveGroup();
            fetchTasks();
            onClose();
            ToastConfig.show({ title: "Success", message: isCreator ? "Group disbanded" : "You have left the group", type: "success" });
          } else {
            const err = await res.json();
            ToastConfig.show({ title: "Error", message: err.message || "Failed to exit group", type: "error" });
          }
        } catch (err) {
          ToastConfig.show({ title: "Error", message: "Failed to exit group", type: "error" });
        }
      }
    });
  };

  const renderGroupAvatar = () => {
    if (activeGroup.profilePic && activeGroup.profilePic.trim() !== "") {
      return (
        <img
          src={activeGroup.profilePic}
          alt=""
          className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#2c2c2c] shadow-md"
        />
      );
    }
    const initials = activeGroup.name?.substring(0, 2).toUpperCase() || "SG";
    return (
      <div className="w-24 h-24 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-extrabold text-2xl uppercase shadow-md border-4 border-white dark:border-[#2c2c2c]">
        {initials}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-start justify-center animate-fadeIn">
        <style>{`
          @keyframes slideInFromTop {
            0% { transform: translateY(-100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-topDrawer { animation: slideInFromTop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>

        <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-b-[2.25rem] rounded-t-none shadow-2xl border-b border-x border-gray-100 dark:border-[#2C2C2C] animate-topDrawer overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center shrink-0">
            <h2 className="text-lg font-bold dark:text-white text-gray-800 flex items-center gap-2">
              <Users className="text-brand-blue" size={18} />
              Study Group Settings
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            <div className="flex flex-col items-center text-center">
              
              {/* 🚀 FIXED: AVATAR PREVIEW TRIGGER & SEPARATE CAMERA BUTTON */}
              <div className="relative group/avatar animate-fadeIn">
                <div className="cursor-pointer transition-transform hover:scale-105" onClick={handleAvatarClick} title="View Image">
                  {renderGroupAvatar()}
                </div>
                {isGroupAdmin && (
                  <div 
                    className="absolute bottom-0 right-0 bg-brand-blue p-2 rounded-full border-[3px] border-white dark:border-[#1E1E1E] shadow-md hover:bg-blue-600 transition-colors cursor-pointer z-10"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                    title="Change Image"
                  >
                    <Camera className="text-white" size={16} />
                  </div>
                )}
              </div>

              {isGroupAdmin && (
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              )}

              {/* Editable Group Title Text Row */}
              <div className="mt-4 w-full flex items-center justify-center gap-2 px-4 max-w-sm">
                {isEditingName ? (
                  <div className="flex items-center gap-2 w-full animate-fadeIn">
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-[#333] rounded-xl px-3 py-1.5 text-center text-base font-bold text-gray-900 dark:text-white outline-none focus:border-brand-blue"
                    />
                    <button onClick={handleSaveGroupName} className="p-2 bg-brand-blue text-white rounded-xl text-xs font-bold px-3 shadow-md">Save</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white truncate">{activeGroup.name}</h3>
                    {isGroupAdmin && (
                      <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-brand-blue p-1.5 hover:bg-gray-50 dark:hover:bg-[#252525] rounded-lg transition-colors">
                        <Edit size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">Workspace initialized {creationDate}</p>
            </div>

            {/* Toast Notification Responses */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn"><Check size={16} />{successMsg}</div>
            )}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2 animate-fadeIn"><AlertCircle size={16} />{errorMsg}</div>
            )}

            {/* Members Mapping Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">Enrolled Members ({activeGroup.members?.length || 0})</h4>
              <div className="space-y-2">
                {activeGroup.members?.map((member) => {
                  const isMemberCreator = member._id === activeGroup.creatorId?._id || member._id === activeGroup.creatorId;
                  const isMemberAdmin = activeGroup.admins?.some(id => id === member._id || id?._id === member._id);
                  const isSelf = member._id === user?.id || member._id === user?._id;

                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/60 dark:bg-dark-surface/20 border border-gray-100 dark:border-[#252525]">
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        {member.customProfilePic && member.customProfilePic.trim() !== "" ? (
                          <img src={member.customProfilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-bold text-xs uppercase">{member.name?.substring(0, 2).toUpperCase()}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                            {member.name} {isSelf && <span className="text-[9px] text-brand-blue font-normal">(You)</span>}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-gray-400 truncate">{member.email}</p>
                            {isMemberCreator ? (
                              <span className="text-[8px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 rounded">Owner</span>
                            ) : isMemberAdmin ? (
                              <span className="text-[8px] font-bold uppercase text-blue-500 bg-blue-500/10 px-1.5 rounded">Admin</span>
                            ) : (
                              <span className="text-[8px] font-bold uppercase text-gray-400 bg-gray-400/10 px-1.5 rounded">Student</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isCreator && !isMemberCreator && (
                          <button
                            onClick={() => handleToggleAdminRole(member._id, member.name)}
                            className={`p-1.5 rounded-lg transition-all border ${isMemberAdmin ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' : 'text-gray-400 hover:text-brand-blue bg-transparent border-transparent'}`}
                            title={isMemberAdmin ? "Demote to Student" : "Promote to Admin"}
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                        {!isMemberCreator && isGroupAdmin && !isSelf && (
                          <button onClick={() => handleRemoveMember(member._id, member.name)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-500 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Panel Controls */}
          <div className="p-5 bg-gray-50 dark:bg-[#181818] border-t border-gray-100 dark:border-[#2C2C2C] flex gap-3 shrink-0">
            <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2C2C2C] rounded-xl transition-colors">Dismiss</button>
            <button onClick={handleLeaveGroup} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5">
              <LogOut size={13} />
              {isCreator ? "Disband Workspace" : "Leave Group"}
            </button>
          </div>
        </div>
      </div>

      {/* 🚀 FULLSCREEN IMAGE PREVIEW OVERLAY */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn">
          <button onClick={() => setIsPreviewOpen(false)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all">
            <X size={24} />
          </button>
          
          {isGroupAdmin && (
            <button onClick={() => { setIsPreviewOpen(false); fileInputRef.current.click(); }} className="absolute top-6 left-6 flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all">
              <Camera size={18} /> Change Image
            </button>
          )}

          {activeGroup.profilePic ? (
            <img src={activeGroup.profilePic} alt="Group Avatar" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          ) : (
            <div className="w-64 h-64 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center font-extrabold text-6xl uppercase shadow-2xl">
              {activeGroup.name?.substring(0, 2).toUpperCase() || "SG"}
            </div>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmStyle="danger"
      />
    </>
  );
};

export default GroupInfoModal;