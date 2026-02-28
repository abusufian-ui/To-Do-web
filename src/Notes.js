import React, { useState } from 'react';
import NoteEditor from './NoteEditor';
import { FileText, Clock, Trash2, CheckSquare } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal'; 

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Notes = ({ courses, notes, setNotes, isAddingNew, setIsAddingNew, fetchNotes, fetchBin }) => {
  const [editingNote, setEditingNote] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Bulletproof HTML to Plain Text Converter (Preserves formatting!)
  const getPlainText = (html) => {
    if (!html) return '';
    // Swap closing block tags and <br> tags for actual newline characters
    let formattedHtml = html
      .replace(/<\/(p|div|h[1-6]|li)>/ig, '\n')
      .replace(/<br\s*\/?>/ig, '\n');
      
    const doc = new DOMParser().parseFromString(formattedHtml, 'text/html');
    return doc.body.textContent.trim() || "";
  };

  const handleSaveNote = async (noteData, isAutoSave = false) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(noteData)
      });
      if (res.ok) {
        const savedNote = await res.json();
        if (typeof fetchNotes === 'function') fetchNotes(); 
        if (!isAutoSave) {
          setIsAddingNew(false);
          setEditingNote(null);
        }
        return savedNote; 
      }
    } catch (error) { console.error("Error saving note:", error); }
    return null;
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/notes/${noteToDelete._id}/delete`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      if (typeof fetchNotes === 'function') fetchNotes(); 
      if (typeof fetchBin === 'function') fetchBin(); 
      setNoteToDelete(null);
      setEditingNote(null); // Closes the editor automatically!
    } catch (error) { console.error("Error deleting note:", error); }
  };

  const executeBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await Promise.all(selectedNotes.map(id => 
        fetch(`${API_BASE}/api/notes/${id}/delete`, { method: 'PUT', headers: { 'x-auth-token': token } })
      ));
      if (typeof fetchNotes === 'function') fetchNotes();
      if (typeof fetchBin === 'function') fetchBin();
      setSelectedNotes([]);
      setShowBulkDelete(false);
    } catch (error) { console.error("Error bulk deleting notes:", error); }
  };

  const toggleSelect = (id) => {
    setSelectedNotes(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };

  return (
    <>
      {isAddingNew || editingNote ? (
        <NoteEditor 
          courses={courses} 
          initialNote={editingNote} 
          onSave={handleSaveNote} 
          onBack={() => { setIsAddingNew(false); setEditingNote(null); }} 
          onDelete={(note) => setNoteToDelete(note)} 
        />
      ) : (
        <div className="p-6 md:p-8 animate-fadeIn h-full overflow-y-auto custom-scrollbar relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 min-h-[48px]">
            {selectedNotes.length > 0 ? (
              <div className="w-full flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-3 rounded-xl shadow-sm animate-fadeIn">
                <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <CheckSquare size={18} /> {selectedNotes.length} Notes Selected
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedNotes([])} className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
                  <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                    <Trash2 size={14} /> Delete Selected
                  </button>
                </div>
              </div>
            ) : (
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">My Notes</h2>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-32 text-gray-400">
              <FileText size={64} className="mb-4 opacity-30" />
              <p className="text-lg">No notes yet. Click "New Note" to start writing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map(note => {
                const isSelected = selectedNotes.includes(note._id);
                return (
                  <div 
                    key={note._id} 
                    className={`bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border shadow-sm transition-all flex flex-col h-64 group relative cursor-pointer
                      ${isSelected ? 'border-blue-500 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-[#2C2C2C] hover:shadow-xl hover:-translate-y-1.5'}
                    `}
                    onClick={() => {
                      if (selectedNotes.length > 0) toggleSelect(note._id);
                      else setEditingNote(note);
                    }}
                  >
                    <div className={`absolute top-4 right-4 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <input type="checkbox" checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); toggleSelect(note._id); }} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 group-hover:text-blue-500 transition-colors line-clamp-2 pr-8">{note.title || 'Untitled Note'}</h3>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-4 flex-1 whitespace-pre-wrap">
                        {getPlainText(note.content) || 'Empty note...'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-[#333]">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md">
                          {courses.find(c => (c._id || c.id) === note.courseId)?.name || 'General'}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                          <Clock size={12} /> {new Date(note.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals are now safely at the root level and will never be blocked */}
      <ConfirmationModal isOpen={!!noteToDelete} onClose={() => setNoteToDelete(null)} onConfirm={confirmDelete} title="Move Note to Bin?" message="Are you sure you want to move this note to the Recycle Bin? You can restore it later." confirmText="Move to Bin" confirmStyle="danger" />
      <ConfirmationModal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} onConfirm={executeBulkDelete} title="Move Selected to Bin?" message={`Are you sure you want to move ${selectedNotes.length} note(s) to the Recycle Bin? You can restore them later.`} confirmText="Move to Bin" confirmStyle="danger" />
    </>
  );
};

export default Notes;