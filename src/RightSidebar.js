import React, { useState, useEffect } from 'react';
import {
  X, Search, Check, Users, Plus, Award, BookOpen, Mail, AlertCircle
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { ToastConfig } from './CustomToast';

const RightSidebar = ({
  isOpen,
  onClose,
  user,
  activeGroup,
  pendingInvitations,
  fetchActiveGroup,
  fetchPendingInvitations,
  fetchTasks,
  API_BASE,
  authHeaders
}) => {
  const [communityUsers, setCommunityUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creatingGroupUserId, setCreatingGroupUserId] = useState(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', action: null });

  const fetchCommunity = async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users/community`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setCommunityUsers(data);
      }
    } catch (e) {
      console.error("Community fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunity();
  }, [isOpen, activeGroup]);

  if (!isOpen) return null;

  const filteredUsers = communityUsers.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const superAdminEmail = 'l1f23bscs1329@ucp.edu.pk';
  const superAdmins = filteredUsers.filter(u => u.email?.toLowerCase() === superAdminEmail);
  const admins = filteredUsers.filter(u => u.isAdmin && u.email?.toLowerCase() !== superAdminEmail);
  const students = filteredUsers.filter(u => !u.isAdmin && u.email?.toLowerCase() !== superAdminEmail);

  const handleAcceptInvite = async (inviteId) => {
    const confirmMessage = activeGroup
      ? "Accepting this invitation will automatically exit your current group. Are you sure you want to proceed?"
      : "Are you sure you want to join this group?";

    setConfirmModal({
      isOpen: true,
      title: 'Accept Invitation',
      message: confirmMessage,
      action: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/groups/invitations/${inviteId}`, {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ status: 'accepted' })
          });
          if (res.ok) {
            ToastConfig.show({ title: "Success", message: "Successfully joined the study group!", type: "success" });
            fetchActiveGroup();
            fetchPendingInvitations();
            fetchTasks();
          } else {
            const err = await res.json();
            ToastConfig.show({ title: "Error", message: err.message || "Failed to accept invitation", type: "error" });
          }
          } catch (e) {
            ToastConfig.show({ title: "Error", message: "Failed to accept invitation", type: "error" });
          } finally {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
        }
      });
    };

  const handleRejectInvite = async (inviteId) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/invitations/${inviteId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) fetchPendingInvitations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroupWith = async (e) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: groupNameInput.trim() })
      });
      if (res.ok) {
        const group = await res.json();
        const inviteRes = await fetch(`${API_BASE}/api/groups/invite`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ receiverId: creatingGroupUserId, groupId: group._id })
        });
        if (inviteRes.ok) {
          ToastConfig.show({ title: "Success", message: "Group created and invitation sent!", type: "success" });
          setCreatingGroupUserId(null);
          setSelectedUser(null);
          setGroupNameInput('');
          fetchActiveGroup();
          fetchCommunity();
        } else {
          const err = await inviteRes.json();
          setErrorMsg(err.message || "Failed to invite member");
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to create group");
      }
    } catch (e) {
      setErrorMsg("Failed to execute request");
    }
  };

  const handleSendInvite = async (receiverId) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ receiverId })
      });
      if (res.ok) {
        ToastConfig.show({ title: "Success", message: "Invitation sent successfully!", type: "success" });
        fetchCommunity();
        setSelectedUser(null);
      } else {
        const err = await res.json();
        ToastConfig.show({ title: "Error", message: err.message || "Failed to send invitation", type: "error" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleInviteClick = (item) => {
    if (!activeGroup) {
      setSelectedUser(item);
      setCreatingGroupUserId(item._id);
    } else {
      handleSendInvite(item._id);
    }
  };

  const renderUserAvatar = (targetUser, size = 'w-10 h-10', textClass = 'text-sm') => {
    const hasCustomPic = targetUser.customProfilePic && targetUser.customProfilePic.trim() !== "";
    if (hasCustomPic) {
      return <img src={targetUser.customProfilePic} alt="" className={`${size} rounded-full object-cover border border-gray-200 dark:border-dark-border`} />;
    }
    const initials = targetUser.name?.substring(0, 2).toUpperCase() || "ST";
    return (
      <div className={`${size} rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-bold uppercase ${textClass}`}>
        {initials}
      </div>
    );
  };

  const renderUserRow = (item, role, isSelfRow = false) => {
    return (
      <div
        key={item._id || 'self-sidebar'}
        onClick={() => setSelectedUser(item)}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${isSelfRow ? 'bg-brand-blue/5 border-brand-blue/20 shadow-sm' : 'bg-gray-50/50 dark:bg-dark-surface/30 border-gray-100/50 dark:border-dark-border/40 hover:bg-gray-100/40'}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          {renderUserAvatar(item, 'w-9 h-9', 'text-xs')}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                {item.name} {isSelfRow && <span className="text-[9px] text-brand-blue font-extrabold">(YOU)</span>}
              </p>
              {role === 'Super Admin' && <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded uppercase">Super Admin</span>}
              {role === 'Admin' && <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded uppercase">Admin</span>}
            </div>
            <p className="text-[10px] text-gray-400 truncate">{item.email}</p>
          </div>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSelfRow ? (
            <span className="text-[8px] font-extrabold px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-lg uppercase">Active</span>
          ) : item.isInGroup ? (
            <span className="text-[9px] font-bold px-2.5 py-1 bg-gray-100 dark:bg-dark-border text-gray-400 rounded-lg">In Group</span>
          ) : item.isInvited ? (
            <span className="text-[9px] font-bold px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-lg flex items-center gap-0.5"><Check size={10} /> Invited</span>
          ) : (
            <button onClick={() => handleInviteClick(item)} className="text-[9px] font-bold px-3 py-1 bg-brand-blue text-white rounded-lg hover:bg-blue-600 transition-colors">Invite</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[150] animate-fadeIn" onClick={onClose} />

      <div className="fixed right-0 top-0 h-screen w-full sm:w-[380px] bg-white dark:bg-[#1E1E1E] shadow-2xl border-l border-gray-100 dark:border-dark-border z-[160] flex flex-col transform transition-all duration-300 animate-slideInRight">
        <div className="p-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Users className="text-brand-blue" size={20} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Community & Groups</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              {/* 🚀 REQUEST 2 FIXED: TEXT HEADING (NO DIVIDER LINES BELOW) */}
              <h3 className="text-[10px] uppercase tracking-wider font-black text-orange-500 flex items-center gap-1.5"><Mail size={12} /> Received Invitations ({pendingInvitations.length})</h3>
              <div className="space-y-2.5">
                {pendingInvitations.map((inv) => (
                  <div key={inv._id} className="p-3 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Join <span className="font-extrabold text-brand-blue">"{inv.groupId?.name}"</span></p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">Invited by {inv.senderId?.name}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleAcceptInvite(inv._id)} className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-sm">Accept Join</button>
                      <button onClick={() => handleRejectInvite(inv._id)} className="py-1.5 px-3 bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center shrink-0">
              <h3 className="text-[10px] uppercase tracking-wider font-black text-gray-400 flex items-center gap-1.5"><BookOpen size={12} /> Students Directory</h3>
              <span className="text-[10px] bg-gray-50 dark:bg-dark-border text-gray-500 px-2 py-0.5 rounded-full font-bold">{filteredUsers.length} Users</span>
            </div>

            <div className="relative shrink-0">
              <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none text-gray-800 dark:text-white" />
              <Search className="absolute left-3 top-3 text-gray-400" size={14} />
            </div>

            <div className="space-y-5">
              {user && (
                <div className="space-y-2">
                  {/* 🚀 REQUEST 2 FIXED: TEXT HEADING (NO DIVIDER LINES BELOW) */}
                  <div className="text-[10px] font-black uppercase tracking-wider text-brand-blue">My Workspace Profile</div>
                  {renderUserRow({ _id: user.id || user._id, name: user.name, email: user.email, customProfilePic: user.customProfilePic || user.profilePic }, null, true)}
                </div>
              )}

              {loading ? (
                <div className="text-center py-6 text-xs text-gray-400 italic">Fetching portal users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 italic">No matching students found</div>
              ) : (
                <>
                  {(superAdmins.length > 0 || admins.length > 0) && (
                    <div className="space-y-2">
                      {/* 🚀 REQUEST 2 FIXED: TEXT HEADING (NO DIVIDER LINES BELOW) */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Management</div>
                      {superAdmins.map(u => renderUserRow(u, 'Super Admin'))}
                      {admins.map(u => renderUserRow(u, 'Admin'))}
                    </div>
                  )}

                  {students.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {/* 🚀 REQUEST 2 FIXED: TEXT HEADING (NO DIVIDER LINES BELOW) */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Students</div>
                      {students.map(u => renderUserRow(u, null))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Details View Window */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-[2rem] shadow-2xl border border-gray-100 p-6 flex flex-col items-center text-center animate-slideUp relative">
            <button onClick={() => { setSelectedUser(null); setCreatingGroupUserId(null); setErrorMsg(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18} /></button>
            <div className="mb-4">{renderUserAvatar(selectedUser, 'w-24 h-24', 'text-2xl')}</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>

            <div className="w-full bg-gray-50 dark:bg-dark-bg rounded-2xl p-4 my-5 text-left border border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs"><span className="text-gray-400 font-medium flex items-center gap-1"><Award size={12} /> Roll Number</span><span className="text-gray-700 dark:text-gray-200 font-bold">{selectedUser.portalId || "Not Linked"}</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-gray-400 font-medium flex items-center gap-1"><Plus size={12} /> Member Since</span><span className="text-gray-700 dark:text-gray-200 font-bold">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : "Recently"}</span></div>
            </div>

            {errorMsg && (
              <div className="w-full mb-4 p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[11px] font-medium flex items-center gap-1"><AlertCircle size={14} /><span>{errorMsg}</span></div>
            )}

            <div className="w-full">
              {selectedUser._id === user?.id || selectedUser._id === user?._id ? (
                <div className="p-3 bg-blue-500/10 text-brand-blue text-xs font-bold rounded-xl text-center">This is your personal workspace profile.</div>
              ) : creatingGroupUserId ? (
                <form onSubmit={handleCreateGroupWith} className="w-full space-y-3">
                  <input type="text" placeholder="Enter study group name..." value={groupNameInput} onChange={(e) => setGroupNameInput(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none text-gray-900" required />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2.5 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-lg">Create and Invite</button>
                    <button type="button" onClick={() => setCreatingGroupUserId(null)} className="py-2.5 px-4 bg-gray-100 text-gray-500 text-xs font-bold rounded-xl">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="w-full">
                  {!activeGroup ? (
                    <button onClick={() => setCreatingGroupUserId(selectedUser._id)} className="w-full py-3 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"><Plus size={14} />Create Group & Invite</button>
                  ) : (
                    <div className="w-full">
                      {selectedUser.isInvited ? (
                        <button disabled className="w-full py-3 bg-blue-50 text-blue-400 text-xs font-bold rounded-xl cursor-not-allowed">Invitation Pending</button>
                      ) : (
                        <button onClick={() => handleSendInvite(selectedUser._id)} className="w-full py-3 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-xl">
                          {selectedUser.isInGroup ? 'Send Invite (Change Group)' : 'Send Invite'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        confirmStyle="danger"
      />
    </>
  );
};

export default RightSidebar;