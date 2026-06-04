import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Eye, Lock, Loader2, ChevronDown, ChevronUp, Users, AlertCircle } from 'lucide-react';
import axios from 'axios';

const CourseVault = ({ courseCode, courseName, onViewFile }) => {
  const [vaultData, setVaultData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTeacher, setExpandedTeacher] = useState(null);

  const fetchVault = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const courseQuery = courseCode || courseName;
      if (!courseQuery) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(`/api/course-vault/${encodeURIComponent(courseQuery)}`, {
        headers: { 'x-auth-token': token }
      });
      
      setVaultData(response.data);
      
      if (response.data.length > 0) {
        setExpandedTeacher(response.data[0].teacherName);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching vault:", err);
      setError("Failed to load Course Vault files.");
      setLoading(false);
    }
  }, [courseCode, courseName]);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  const toggleTeacher = (teacherName) => {
    if (expandedTeacher === teacherName) {
      setExpandedTeacher(null);
    } else {
      setExpandedTeacher(teacherName);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Premium Vault Header Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute right-4 top-4 text-indigo-500/10 pointer-events-none">
          <Shield className="w-32 h-32" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono tracking-wider uppercase">
              Premium Feature
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono tracking-wider uppercase">
              Anti-Theft Active
            </span>
          </div>
          <h4 className="font-bold text-slate-100 text-lg">Smart Course Vault</h4>
          <p className="text-sm text-slate-300 max-w-xl">
            Access curated lecture notes and materials crowdsourced from top students across all sections. 
            Files are strictly view-only to prevent leakage and unauthorized downloads.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grouped Buckets */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : vaultData.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/80 text-slate-400">
          <Lock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="font-semibold text-slate-300">Vault is empty</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">No student notes or slides uploaded for this course yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vaultData.map((bucket) => {
            const isExpanded = expandedTeacher === bucket.teacherName;
            return (
              <div 
                key={bucket.teacherName} 
                className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300"
              >
                {/* Header Section */}
                <button
                  onClick={() => toggleTeacher(bucket.teacherName)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900/60 transition text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-200 text-sm md:text-base">
                        {bucket.teacherName}
                      </h5>
                      <p className="text-xs text-slate-400 font-mono">
                        {bucket.files.length} document{bucket.files.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {/* Document List */}
                {isExpanded && (
                  <div className="divide-y divide-slate-800/50 bg-slate-950/20 border-t border-slate-800/50">
                    {bucket.files.map((file) => (
                      <div key={file._id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-900/10 transition">
                        <div className="min-w-0 pr-4">
                          <p className="font-medium text-slate-200 text-sm truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500 font-mono">
                            <span>Sec: {file.section || 'N/A'}</span>
                            <span>•</span>
                            <span>{formatDate(file.createdAt)}</span>
                          </div>
                        </div>

                        {/* View Only Action */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50 font-mono uppercase">
                            View Only
                          </span>
                          <button
                            onClick={() => onViewFile(file.fileUrl, file.fileName)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-medium transition shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseVault;
