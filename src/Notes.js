import React, { useState, useEffect, useCallback } from 'react';
import NoteEditor from './NoteEditor';
import { FileText, Clock, Trash2, CheckSquare, Book, Lock, Globe, Send, Inbox as InboxIcon, Search, Check, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import UCPLogo from './UCPLogo';
import EmptyState from './EmptyState';
import { ToastConfig } from './CustomToast';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';


const ShareDrawer = ({ isOpen, onClose, noteIds }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUsers([]);
      setStatusMsg('');
      setSearch('');
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/community/users`, { headers: { 'x-auth-token': token } });
      if (res.ok) setUsers(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ noteIds, targetUserIds: selectedUsers })
      });
      setStatusMsg(`Successfully sent ${noteIds.length} note(s) to ${selectedUsers.length} user(s)!`);
      setTimeout(() => { onClose(); }, 1500);
    } catch (err) {
      setStatusMsg('Error sharing notes.');
    }
    setLoading(false);
  };

  const toggleUser = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" onClick={onClose}></div>}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#1E1E1E] shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 dark:border-[#2C2C2C] flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1A]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe size={18} className="text-brand-blue" /> Share to Community
          </h2>
          <button onClick={onClose} className="p-2 bg-white dark:bg-[#2C2C2C] rounded-full hover:bg-gray-100 dark:hover:bg-[#333] transition-colors"><X size={16} className="text-gray-500" /></button>
        </div>

        <div className="p-4 border-b border-gray-100 dark:border-[#2C2C2C]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-[#333] rounded-xl text-sm outline-none focus:border-brand-blue dark:text-white transition-colors" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-10 italic">No users found.</p>
          ) : (
            filteredUsers.map(u => (
              <div key={u._id} onClick={() => toggleUser(u._id)} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-[#2C2C2C] rounded-xl cursor-pointer transition-colors">
                <input type="checkbox" checked={selectedUsers.includes(u._id)} readOnly className="w-4 h-4 rounded text-blue-600 border-gray-300" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{u.name}</span>
                  <span className="text-xs text-gray-500">{u.email}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-[#1A1A1A] border-t border-gray-100 dark:border-[#2C2C2C]">
          {statusMsg ? (
            <div className="text-center text-sm font-bold text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl animate-fadeIn">{statusMsg}</div>
          ) : (
            <button onClick={handleShare} disabled={selectedUsers.length === 0 || loading} className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors ${selectedUsers.length > 0 ? 'bg-brand-blue text-white hover:bg-blue-600' : 'bg-gray-200 dark:bg-[#333] text-gray-400 cursor-not-allowed'}`}>
              <Send size={16} /> Send to {selectedUsers.length} user(s)
            </button>
          )}
        </div>
      </div>
    </>
  );
};

const Notes = ({ courses, notes, setNotes, isAddingNew, setIsAddingNew, fetchNotes, fetchBin, user }) => {
  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [noteToReject, setNoteToReject] = useState(null);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false); 

  const [showShareDrawer, setShowShareDrawer] = useState(false);
  const [notesToShare, setNotesToShare] = useState([]);

  
  const [viewMode, setViewMode] = useState('private');
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  const getPlainText = (html) => {
    if (!html) return '';
    let formattedHtml = html.replace(/<\/(p|div|h[1-6]|li)>/ig, '\n').replace(/<br\s*\/?>/ig, '\n');
    return new DOMParser().parseFromString(formattedHtml, 'text/html').body.textContent.trim() || "";
  };

  const handleSaveNote = useCallback(async (noteData, isAutoSave = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(noteData)
      });
      if (res.ok) {
        const savedNote = await res.json();
        
        
        setNotes(prev => {
          const exists = prev.find(p => (p._id || p.id) === savedNote._id);
          if (exists) return prev.map(p => (p._id || p.id) === savedNote._id ? savedNote : p);
          return [savedNote, ...prev];
        });

        if (typeof fetchNotes === 'function') fetchNotes();
        if (!isAutoSave) {
          setIsAddingNew(false);
          setEditingNote(null);
          setIsReadOnlyMode(false);
        }
        return savedNote;
      }
    } catch (error) { console.error("Error saving note:", error); }
    return null;
  }, [fetchNotes, setIsAddingNew, setNotes]);

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/${noteToDelete._id}/delete`, { method: 'PUT', headers: { 'x-auth-token': token } });
      if (typeof fetchNotes === 'function') fetchNotes();
      if (typeof fetchBin === 'function') fetchBin();
      setNoteToDelete(null);
      setEditingNote(null); 
    } catch (error) { console.error(error); }
  };

  
  const executeBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await Promise.all(selectedNotes.map(id => fetch(`${API_BASE}/api/notes/${id}/delete`, { method: 'PUT', headers: { 'x-auth-token': token } })));
      if (typeof fetchNotes === 'function') fetchNotes();
      if (typeof fetchBin === 'function') fetchBin();
      setSelectedNotes([]);
      setShowBulkDelete(false);
      setIsSelectionMode(false);
    } catch (error) { console.error(error); }
  };

  
  const acceptBulkInbox = async () => {
    try {
      const token = localStorage.getItem('token');
      await Promise.all(selectedNotes.map(id => fetch(`${API_BASE}/api/notes/${id}/accept`, { method: 'PUT', headers: { 'x-auth-token': token } })));
      if (typeof fetchNotes === 'function') fetchNotes();
      setSelectedNotes([]);
      setIsSelectionMode(false);
    } catch (error) { console.error(error); }
  };

  
  const toggleBulkPrivacy = async (targetPrivacy) => {
    try {
      const token = localStorage.getItem('token');
      
      
      setNotes(prev => prev.map(n => selectedNotes.includes(n._id) ? { ...n, isPrivate: targetPrivacy, groupId: targetPrivacy ? null : 'optimistic_group' } : n));
      
      await Promise.all(selectedNotes.map(id =>
        fetch(`${API_BASE}/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ isPrivate: targetPrivacy })
        })
      ));
      if (typeof fetchNotes === 'function') fetchNotes();
      setSelectedNotes([]);
      setIsSelectionMode(false);
    } catch (error) { console.error(error); }
  };

  const acceptInboxNote = async (e, noteId) => {
    e.stopPropagation();
    
    setNotes(prev => prev.map(n => n._id === noteId ? { ...n, isInbox: false } : n));
    ToastConfig.show({ title: 'Accepted', message: 'Note has been added to your workspace.', type: 'success' });
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/${noteId}/accept`, { method: 'PUT', headers: { 'x-auth-token': token } });
      if (typeof fetchNotes === 'function') fetchNotes();
    } catch (error) { console.error(error); }
  };

  const discardInboxNote = (e, noteId) => {
    e.stopPropagation();
    setNoteToReject(noteId);
  };

  const confirmRejectNote = async () => {
    if (!noteToReject) return;
    const noteId = noteToReject;
    setNoteToReject(null);
    
    setNotes(prev => prev.filter(n => n._id !== noteId));
    ToastConfig.show({ title: 'Rejected', message: 'Note has been discarded.', type: 'success' });
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/${noteId}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (typeof fetchNotes === 'function') fetchNotes();
    } catch (error) { console.error(error); }
  };

  const toggleSelect = (id) => setSelectedNotes(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);

  const togglePrivacy = async (e, note) => {
    e.stopPropagation();
    const newIsPrivate = !note.isPrivate;
    setNotes(prev => prev.map(n => n._id === note._id ? { ...n, isPrivate: newIsPrivate, groupId: newIsPrivate ? null : 'optimistic_group' } : n));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/${note._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ isPrivate: newIsPrivate })
      });
      if (typeof fetchNotes === 'function') fetchNotes();
    } catch (error) { console.error(error); }
  };

  const openShareDrawer = (e, noteIds) => {
    e.stopPropagation();
    setNotesToShare(noteIds);
    setShowShareDrawer(true);
  };

  const inboxCount = notes.filter(n => n.isInbox).length;

  const displayNotes = viewMode === 'inbox' 
    ? notes.filter(n => n.isInbox)
    : viewMode === 'shared'
    ? notes.filter(n => !!n.groupId && !n.isInbox)
    : notes.filter(n => !n.groupId && !n.isInbox);

  return (
    <>
      <ShareDrawer isOpen={showShareDrawer} onClose={() => { setShowShareDrawer(false); setIsSelectionMode(false); setSelectedNotes([]); }} noteIds={notesToShare} />

      {isAddingNew || editingNote ? (
        <NoteEditor
          courses={courses}
          initialNote={editingNote}
          readOnly={isReadOnlyMode}
          defaultIsPrivate={viewMode === 'private'}
          onSave={handleSaveNote}
          onBack={() => { setIsAddingNew(false); setEditingNote(null); setIsReadOnlyMode(false); }}
          onDelete={(note) => setNoteToDelete(note)}
          onShare={editingNote && !isReadOnlyMode ? () => openShareDrawer({ stopPropagation: ()=>{} }, [editingNote._id]) : null}
        />
      ) : (
        <div className="p-4 md:p-8 animate-fadeIn h-full overflow-y-auto custom-scrollbar relative">
          
          {}
          <div className="flex overflow-x-auto custom-scrollbar bg-gray-100 dark:bg-[#2C2C2C] p-1 rounded-xl mb-6 w-full md:w-max shrink-0 border border-gray-200 dark:border-[#333]">
            <button onClick={() => { setViewMode('private'); setIsSelectionMode(false); setSelectedNotes([]); }} className={`whitespace-nowrap px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'private' ? 'bg-white shadow-sm dark:bg-[#1E1E1E] text-brand-blue' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>My Workspace</button>
            <button onClick={() => { setViewMode('shared'); setIsSelectionMode(false); setSelectedNotes([]); }} className={`whitespace-nowrap px-5 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'shared' ? 'bg-white shadow-sm dark:bg-[#1E1E1E] text-brand-blue' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Group Shared</button>
            <button onClick={() => { setViewMode('inbox'); setIsSelectionMode(false); setSelectedNotes([]); }} className={`whitespace-nowrap px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'inbox' ? 'bg-white shadow-sm dark:bg-[#1E1E1E] text-brand-blue' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              Inbox {inboxCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] shadow-sm">{inboxCount}</span>}
            </button>
          </div>

          {}
          {isSelectionMode ? (
            <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl shadow-sm animate-fadeIn gap-4 mb-6">
              <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 text-sm sm:text-base whitespace-nowrap">
                <CheckSquare size={18} /> {selectedNotes.length} Notes Selected
              </span>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
                <button onClick={() => { setIsSelectionMode(false); setSelectedNotes([]); }} className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>

                {}
                {viewMode === 'private' && (
                  <button onClick={() => toggleBulkPrivacy(false)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                    <Globe size={16} /> Make Public
                  </button>
                )}
                {viewMode === 'shared' && (
                  <button onClick={() => toggleBulkPrivacy(true)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                    <Lock size={16} /> Make Private
                  </button>
                )}
                {viewMode === 'inbox' && (
                  <button onClick={acceptBulkInbox} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                    <Check size={16} /> Accept All
                  </button>
                )}

                {}
                <button onClick={() => setShowBulkDelete(true)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm">
                  <Trash2 size={16} /> Delete All
                </button>

                {}
                {viewMode === 'private' && (
                  <button onClick={(e) => openShareDrawer(e, selectedNotes)} disabled={selectedNotes.length === 0} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all shadow-sm ${selectedNotes.length > 0 ? 'bg-brand-blue hover:bg-blue-600' : 'bg-blue-400 cursor-not-allowed opacity-70'}`}>
                    <Send size={16} /> Share All
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Notes</h2>
              {displayNotes.length > 0 && (
                <button 
                  onClick={() => setIsSelectionMode(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] hover:border-brand-blue dark:hover:border-brand-blue rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
                >
                  <CheckSquare size={16} className="text-brand-blue" /> Select
                </button>
              )}
            </div>
          )}

          {displayNotes.length === 0 ? (
            <div className="mt-16 w-full flex justify-center">
              <EmptyState icon={viewMode === 'inbox' ? InboxIcon : FileText} title={viewMode === 'inbox' ? "Inbox Zero" : "No notes in here, sorry!"} message={viewMode === 'inbox' ? "You have no pending notes from the community." : "Your notebook is empty. Tap 'New Note' to start writing your first idea or lecture!"} />
            </div>
          ) : (
            
            <div className={`grid gap-6 ${viewMode === 'inbox' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {displayNotes.map(note => {
                const isSelected = selectedNotes.includes(note._id);
                const currentUserId = String(user?.id || user?._id || '');
                const noteCreatorId = String(note.user?._id || note.user?.id || note.user || '');
                
                const isCreator = currentUserId && noteCreatorId && (currentUserId === noteCreatorId);
                const isSharedNote = !!note.groupId;
                const canEditAll = (!isSharedNote || isCreator) && !note.isInbox;

                const courseObj = courses.find(c => (c._id || c.id) === note.courseId);
                const courseName = courseObj?.name || 'General Course';
                const isUni = courseObj?.type === 'uni';

                return (
                  <div
                    key={note._id}
                    className={`bg-white dark:bg-[#1E1E1E] p-6 rounded-3xl border transition-all flex flex-col h-[280px] relative cursor-pointer
                      ${isSelected ? 'border-brand-blue ring-4 ring-brand-blue/20 shadow-lg scale-[1.02]' : 'border-gray-200 dark:border-[#2C2C2C] hover:shadow-xl hover:-translate-y-1'}
                    `}
                    onClick={() => {
                      if (isSelectionMode) toggleSelect(note._id);
                      else {
                        setIsReadOnlyMode(!canEditAll || note.isInbox);
                        setEditingNote(note);
                      }
                    }}
                  >

                    {}
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h3 className="font-black text-xl text-gray-900 dark:text-white line-clamp-2 flex-1 min-h-[56px] leading-tight">
                        {note.title || 'Untitled Note'}
                      </h3>

                      {}
                      <div className="flex items-center shrink-0 h-8">
                        {isSelectionMode ? (
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {isSelected && <Check strokeWidth={3} size={14} />}
                          </div>
                        ) : (
                          !note.isInbox && canEditAll && (
                            <div className="flex items-center gap-1.5 opacity-100 sm:opacity-50 sm:hover:opacity-100 transition-opacity">
                              <button onClick={(e) => openShareDrawer(e, [note._id])} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-brand-blue dark:bg-[#252525] dark:hover:bg-brand-blue/20 rounded-lg transition-colors" title="Share">
                                <Send size={15} />
                              </button>
                              <button onClick={(e) => togglePrivacy(e, note)} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 dark:bg-[#252525] dark:hover:bg-indigo-500/20 rounded-lg transition-colors" title={note.isPrivate ? "Make Public" : "Make Private"}>
                                {note.isPrivate ? <Lock size={15} /> : <Globe size={15} />}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {}
                    {note.isInbox && note.sender ? (
                      <div className="text-[11px] text-emerald-600 font-bold mb-2 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 w-max px-2.5 py-1 rounded-md"><Send size={10} /> Sent by {note.sender.name}</div>
                    ) : (
                      viewMode === 'shared' && note.user && <div className="text-[10px] text-brand-blue font-bold mb-3 uppercase tracking-wider">By {note.user.name}</div>
                    )}

                    {}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 flex-1 whitespace-pre-wrap leading-relaxed">
                      {getPlainText(note.content) || 'Empty note...'}
                    </p>

                    {}
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[#2C2C2C] flex items-center justify-between gap-3 h-12">
                      
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-brand-blue/10 text-brand-blue rounded-lg min-w-0 max-w-[60%]">
                        {isUni ? <UCPLogo className="w-3.5 h-3.5 shrink-0" /> : <Book size={14} className="shrink-0" />}
                        <span className="truncate text-xs font-bold">{courseName}</span>
                      </div>
                      
                      {note.isInbox ? (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={(e) => acceptInboxNote(e, note._id)} className="w-8 h-8 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm" title="Accept">
                            <Check size={16} />
                          </button>
                          <button onClick={(e) => discardInboxNote(e, note._id)} className="w-8 h-8 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-sm" title="Discard">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                          <Clock size={12} className="shrink-0" />
                          {new Date(note.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmationModal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} onConfirm={confirmDelete} title="Move Note to Bin?" message="Are you sure you want to move this note to the Recycle Bin? You can restore it later." confirmText="Move to Bin" confirmStyle="danger" />
      <ConfirmationModal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} onConfirm={executeBulkDelete} title="Move Selected to Bin?" message={`Are you sure you want to move ${selectedNotes.length} note(s) to the Recycle Bin? You can restore them later.`} confirmText="Move to Bin" confirmStyle="danger" />
      <ConfirmationModal isOpen={!!noteToReject} onClose={() => setNoteToReject(null)} onConfirm={confirmRejectNote} title="Discard Note?" message="Are you sure you want to discard this note? This action cannot be undone." confirmText="Discard" confirmStyle="danger" />
    </>
  );
};

export default Notes;