import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PAPER_TYPES = [
  { id: 'mid_term', label: 'Mid Term' },
  { id: 'final_term', label: 'Final Term' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'assignment', label: 'Assignment' },
  { id: 'graded_lab', label: 'Graded Lab' },
  { id: 'class_participation', label: 'Class Participation' },
  { id: 'other', label: 'Other' }
];

const VaultUploadPanel = ({ token, onUploadSuccess }) => {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [category, setCategory] = useState('past_paper');
  const [paperType, setPaperType] = useState('mid_term');
  const [teacherName, setTeacherName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await axios.get(`${API_BASE}/api/vault/courses`, {
          headers: { 'x-auth-token': token }
        });
        setCourses(res.data || []);
      } catch (err) {
        console.error('Error fetching vault courses:', err);
      }
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [token]);

  const handleCourseChange = (e) => {
    const cName = e.target.value;
    setSelectedCourseName(cName);
    const found = courses.find(c => c.courseName === cName);
    if (found) {
      setAbbreviation(found.abbreviation || '');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!displayName) {
        // Remove extension for default display name
        const defaultName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setDisplayName(defaultName);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseName || !displayName || !file) {
      setMessage({ type: 'error', text: 'Please fill in Course, Display Name, and select a file.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseName', selectedCourseName);
      formData.append('abbreviation', abbreviation);
      formData.append('category', category);
      formData.append('paperType', paperType);
      formData.append('teacherName', teacherName);
      formData.append('displayName', displayName);

      await axios.post(`${API_BASE}/api/admin/vault/upload`, formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage({ type: 'success', text: `Successfully published "${displayName}" to Course Vault!` });
      setFile(null);
      setDisplayName('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('Vault upload error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to upload document. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-slate-100 max-w-3xl mx-auto shadow-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
          <Upload size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Upload Document to Course Vault</h3>
          <p className="text-xs text-slate-400">Add past papers or lecture notes directly to the public student vault.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center gap-2 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Course selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Course *
            </label>
            {loadingCourses ? (
              <div className="p-2 text-xs text-slate-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading courses...
              </div>
            ) : (
              <input
                type="text"
                list="courses-list"
                placeholder="Type or select course..."
                value={selectedCourseName}
                onChange={handleCourseChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            )}
            <datalist id="courses-list">
              {courses.map((c, i) => (
                <option key={i} value={c.courseName}>
                  {c.abbreviation ? `[${c.abbreviation}] ` : ''}{c.courseName}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Abbreviation (e.g. OOP, AI-Lab)
            </label>
            <input
              type="text"
              placeholder="e.g. OOP"
              value={abbreviation}
              onChange={e => setAbbreviation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Category toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Document Category *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCategory('past_paper')}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${category === 'past_paper' ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              📄 Past Paper
            </button>
            <button
              type="button"
              onClick={() => setCategory('lecture_note')}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${category === 'lecture_note' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              📚 Lecture Note
            </button>
          </div>
        </div>

        {/* Sub-category selection */}
        {category === 'past_paper' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Paper Type *
            </label>
            <div className="flex flex-wrap gap-2">
              {PAPER_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPaperType(type.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${paperType === type.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Teacher Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dr. Ahmed"
              value={teacherName}
              onChange={e => setTeacherName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Display Name (Shown to students) *
          </label>
          <input
            type="text"
            placeholder={category === 'past_paper' ? 'e.g. Final Term Spring 2024' : 'e.g. Week 4 - Binary Search Trees'}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        {/* File selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Select Document File (PDF, DOCX, PPTX) *
          </label>
          <div className="relative border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-800/50">
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3 text-blue-400 font-semibold">
                <FileText size={24} />
                <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            ) : (
              <div className="text-slate-400">
                <Upload size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Click or drag & drop file to upload</p>
                <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, PPTX (Max 50MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={uploading || !selectedCourseName || !displayName || !file}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Publishing to Vault...
            </>
          ) : (
            <>
              <Upload size={18} /> Publish to Course Vault
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default VaultUploadPanel;
