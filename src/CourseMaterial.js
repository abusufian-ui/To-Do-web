import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, Download, Eye, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';

const CourseMaterial = ({ courseId, onViewFile }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`/api/course-material/${courseId}`, {
        headers: { 'x-auth-token': token }
      });
      setMaterials(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching materials:", err);
      setError("Failed to load materials.");
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);


  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.post('/api/course-material/upload', formData, {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess(`${file.name} uploaded and processed successfully!`);
      fetchMaterials();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload file. Make sure it is a PDF or Word/PPT document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      await axios.delete(`/api/course-material/${id}`, {
        headers: { 'x-auth-token': token }
      });
      setMaterials(prev => prev.filter(m => m._id !== id));
      setSuccess("Material deleted successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete material.");
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-400" />;
    if (['doc', 'docx'].includes(ext)) return <FileText className="w-8 h-8 text-blue-400" />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText className="w-8 h-8 text-orange-400" />;
    return <FileText className="w-8 h-8 text-slate-400" />;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-700/50 hover:border-emerald-500/40 rounded-2xl p-8 text-center cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-all flex flex-col items-center justify-center space-y-3 ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.doc,.docx,.ppt,.pptx"
        />
        {uploading ? (
          <>
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-300 font-medium">Uploading and converting file to PDF...</p>
            <p className="text-xs text-slate-500 font-mono">This may take a few moments for large presentations or docx files</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-200 font-medium">Click or drag files to upload</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Supports PDF, DOCX, PPTX (converted automatically to secure PDF)</p>
            </div>
          </>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start space-x-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start space-x-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Materials List */}
      <div className="bg-slate-900/20 rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/30">
          <h4 className="font-semibold text-slate-200 text-base">Personal Course Materials</h4>
          <p className="text-xs text-slate-400 font-mono">View and download your personal course documents</p>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="font-medium text-slate-300">No files uploaded yet</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">Upload slides, notes or syllabus files to access them anytime</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {materials.map((file) => (
              <div key={file._id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-900/10 transition">
                <div className="flex items-center space-x-4 min-w-0">
                  {getFileIcon(file.fileName)}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-200 text-sm truncate" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      Uploaded on {formatDate(file.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button 
                    onClick={() => onViewFile(file.fileUrl, file.fileName)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
                    title="View Document"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a 
                    href={file.fileUrl} 
                    download={file.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => handleDelete(file._id, file.fileName)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseMaterial;
