import React, { useState, useEffect } from 'react';
import { 
  X, Search, User, Mail, Check, Users, Plus, 
  Calendar, Award, BookOpen, AlertCircle, ShieldCheck
} from 'lucide-react';

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
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch community students
  const fetchCommunity = async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users/community`, {
        headers: authHeaders
      });
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

  // Filter students
  const filteredUsers = communityUsers.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by roles
  const superAdminEmail = 'l1f23bscs1329@ucp.edu.pk';
  const superAdmins = filteredUsers.filter(u => u.email?.toLowerCase() === superAdminEmail);
  const admins = filteredUsers.filter(u => u.isAdmin && u.email?.toLowerCase() !== superAdminEmail);
  const students = filteredUsers.filter(u => !u.isAdmin && u.email?.toLowerCase() !== superAdminEmail);

  // Check if current user is group admin
  const isGroupAdmin = activeGroup && (activeGroup.creatorId?._id === user?.id || activeGroup.creatorId === user?.id || activeGroup.creatorId?._id === user?._id || activeGroup.creatorId === user?._id);

  // Accept Invite with confirmation
  const handleAcceptInvite = async (inviteId) => {
    const confirmMessage = activeGroup
      ? "Accepting this invitation will automatically exit your current group. Are you sure you want to proceed?"
      : "Are you sure you want to accept this invitation and join the group?";

    if (window.confirm(confirmMessage)) {
      try {
        const res = await fetch(`${API_BASE}/api/groups/invitations/${inviteId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ status: 'accepted' })
        });
        if (res.ok) {
          setActionSuccess("Successfully joined the study group!");
          setTimeout(() => setActionSuccess(''), 4000);
          fetchActiveGroup();
          fetchPendingInvitations();
          fetchTasks();
        } else {
          const err = await res.json();
          alert(err.message || "Failed to accept invitation");
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Reject Invite
  const handleRejectInvite = async (inviteId) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/invitations/${inviteId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        fetchPendingInvitations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Group and automatically invite member
  const handleCreateGroupWith = async (e) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;
    try {
      // 1. Create group
      const res = await fetch(`${API_BASE}/api/groups`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: groupNameInput.trim() })
      });
      if (res.ok) {
        const group = await res.json();
        // 2. Invite the selected user directly to the new group
        const inviteRes = await fetch(`${API_BASE}/api/groups/invite`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ receiverId: creatingGroupUserId, groupId: group._id })
        });
        if (inviteRes.ok) {
          setActionSuccess("Group created and invitation sent successfully!");
          setTimeout(() => setActionSuccess(''), 4000);
          setCreatingGroupUserId(null);
          setSelectedUser(null);
          setGroupNameInput('');
          fetchActiveGroup();
          fetchCommunity();
        } else {
          const err = await inviteRes.json();
          setErrorMsg(err.message || "Failed to send invitation to the student");
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to create group");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to execute request");
    }
  };

  // Invite user to group
  const handleSendInvite = async (receiverId) => {
    try {
      const res = await fetch(`${API_BASE}/api/groups/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ receiverId })
      });
      if (res.ok) {
        setActionSuccess("Invitation sent successfully!");
        setTimeout(() => setActionSuccess(''), 4000);
        fetchCommunity();
        setSelectedUser(null);
      } else {
        const err = await res.json();
        alert(err.message || "Failed to send invitation");
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
      if (isGroupAdmin) {
        handleSendInvite(item._id);
      } else {
        alert("Only group creators (admins) can invite members.");
      }
    }
  };

  // Render profile image dynamically following custom constraints:
  // Never show default portal image if custom profile image has not been set yet.
  const renderUserAvatar = (targetUser, size = 'w-10 h-10', textClass = 'text-sm') => {
    const hasCustomPic = targetUser.customProfilePic && targetUser.customProfilePic.trim() !== "";
    if (hasCustomPic) {
      return (
        <img 
          src={targetUser.customProfilePic} 
          alt="" 
          className={`${size} rounded-full object-cover border border-gray-200 dark:border-dark-border shadow-sm`} 
        />
      );
    }
    // Stylish letter initials
    const initials = targetUser.name?.substring(0, 2).toUpperCase() || "ST";
    return (
      <div className={`${size} rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center font-bold uppercase shadow-sm ${textClass}`}>
        {initials}
      </div>
    );
  };

  // Render a partitioned user row
  const renderUserRow = (item, role) => {
    return (
      <div 
        key={item._id}
        onClick={() => setSelectedUser(item)}
        className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-dark-surface/30 border border-gray-100/50 dark:border-dark-border/40 hover:bg-gray-100/40 dark:hover:bg-dark-surface/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          {renderUserAvatar(item, 'w-9 h-9', 'text-xs')}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-gray-800 dark:text-white truncate group-hover:text-brand-blue transition-colors">{item.name}</p>
              {role === 'Super Admin' && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 shrink-0 uppercase tracking-wider">
                  Super Admin
                </span>
              )}
              {role === 'Admin' && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/20 shrink-0 uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 truncate">{item.email}</p>
          </div>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {item.isInGroup ? (
            <span className="text-[9px] font-bold px-2.5 py-1 bg-gray-100 dark:bg-dark-border text-gray-400 rounded-lg">In Group</span>
          ) : item.isInvited ? (
            <span className="text-[9px] font-bold px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-lg flex items-center gap-0.5">
              <Check size={10} /> Invited
            </span>
          ) : (
            <button
              onClick={() => handleInviteClick(item)}
              className="text-[9px] font-bold px-3 py-1 bg-brand-blue text-white hover:bg-blue-600 rounded-lg transition-colors active:scale-95 shadow-sm"
            >
              Invite
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Dim/Blur Backdrop Fading the rest of the portal (including Header) */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[150] transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Slideable Drawer above the Backdrop */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[380px] bg-white dark:bg-[#1E1E1E] shadow-2xl border-l border-gray-100 dark:border-dark-border z-[160] transform transition-all duration-300 animate-slideInRight flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-dark-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Users className="text-brand-blue" size={20} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Community & Groups</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn shrink-0">
            <Check size={16} />
            {actionSuccess}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          
          {/* 1. Received Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-orange-500 flex items-center gap-1.5">
                <Mail size={12} /> Received Invitations ({pendingInvitations.length})
              </h3>
              <div className="space-y-2.5">
                {pendingInvitations.map((inv) => (
                  <div key={inv._id} className="p-3 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 rounded-xl">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Join <span className="font-extrabold text-brand-blue">"{inv.groupId?.name}"</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">Invited by {inv.senderId?.name} ({inv.senderId?.email})</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAcceptInvite(inv._id)}
                        className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95"
                      >
                        Accept Join
                      </button>
                      <button
                        onClick={() => handleRejectInvite(inv._id)}
                        className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-dark-border dark:hover:bg-[#333] text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Directory */}
          <div className="space-y-4">
            <div className="flex justify-between items-center shrink-0">
              <h3 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-400 flex items-center gap-1.5">
                <BookOpen size={12} /> Students Directory
              </h3>
              <span className="text-[10px] bg-gray-50 dark:bg-dark-border text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-bold">
                {filteredUsers.length} Users
              </span>
            </div>

            {/* Search */}
            <div className="relative shrink-0">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border focus:border-brand-blue rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none text-gray-800 dark:text-white transition-colors"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={14} />
            </div>

            {/* Partitioned Listing */}
            <div className="space-y-5">
              {loading ? (
                <div className="text-center py-6 text-xs text-gray-400 italic">Fetching portal users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 italic">No matching students found</div>
              ) : (
                <>
                  {/* Management Partition */}
                  {(superAdmins.length > 0 || admins.length > 0) && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-dark-border/40 pb-1 mb-2">
                        Management
                      </div>
                      {superAdmins.map(u => renderUserRow(u, 'Super Admin'))}
                      {admins.map(u => renderUserRow(u, 'Admin'))}
                    </div>
                  )}

                  {/* Students Partition */}
                  {students.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-dark-border/40 pb-1 mb-2">
                        Students
                      </div>
                      {students.map(u => renderUserRow(u, null))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal Window */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-sm rounded-[2rem] shadow-2xl border border-gray-100 dark:border-dark-border p-6 flex flex-col items-center text-center animate-slideUp relative">
            
            {/* Close Button */}
            <button 
              onClick={() => { setSelectedUser(null); setCreatingGroupUserId(null); setErrorMsg(''); }}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-dark-border text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-colors"
            >
              <X size={18} />
            </button>

            {/* Profile Avatar */}
            <div className="mb-4">
              {renderUserAvatar(selectedUser, 'w-24 h-24', 'text-2xl')}
            </div>

            {/* User Details */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>

            <div className="w-full bg-gray-50 dark:bg-dark-bg rounded-2xl p-4 my-5 text-left border border-gray-100 dark:border-dark-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium flex items-center gap-1"><Award size={12} /> Roll Number</span>
                <span className="text-gray-700 dark:text-gray-200 font-bold">
                  {selectedUser.portalId || "Not Linked"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium flex items-center gap-1"><Calendar size={12} /> Member Since</span>
                <span className="text-gray-700 dark:text-gray-200 font-bold">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "Recently"}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="w-full mb-4 p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-500 text-[11px] font-medium flex items-center gap-1 text-left">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Area */}
            {creatingGroupUserId ? (
              <form onSubmit={handleCreateGroupWith} className="w-full space-y-3 animate-fadeIn">
                <input 
                  type="text" 
                  placeholder="Enter study group name..."
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border focus:border-brand-blue rounded-xl px-4 py-2.5 text-xs outline-none text-gray-900 dark:text-white"
                  required
                />
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    Create and Invite
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCreatingGroupUserId(null)}
                    className="py-2.5 px-4 bg-gray-100 dark:bg-dark-border text-gray-500 hover:text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="w-full">
                {!activeGroup ? (
                  <button 
                    onClick={() => setCreatingGroupUserId(selectedUser._id)}
                    className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Plus size={14} />
                    Create Group & Invite {selectedUser.name?.split(' ')[0]}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.isInGroup ? (
                      <button disabled className="w-full py-3 bg-gray-100 dark:bg-dark-border text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed">
                        Already in a Study Group
                      </button>
                    ) : selectedUser.isInvited ? (
                      <button disabled className="w-full py-3 bg-blue-50 dark:bg-blue-900/10 text-blue-400 text-xs font-bold rounded-xl cursor-not-allowed">
                        Invitation Pending
                      </button>
                    ) : isGroupAdmin ? (
                      <button 
                        onClick={() => handleSendInvite(selectedUser._id)}
                        className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                      >
                        Invite Member
                      </button>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-600 dark:text-amber-500 text-[11px] font-medium flex items-center gap-1.5">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>Only group creators (admins) can invite members.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RightSidebar;
