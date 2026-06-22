import React, { useState, useEffect } from 'react';
import { Folder, FileText, CheckCircle, Trash2, Upload, RefreshCw, FolderPlus, Inbox } from 'lucide-react';
import axios from 'axios';

const CourseVaultManagerApp = ({ token }) => {
  const [activeTab, setActiveTab] = useState('inbox'); 
  const [pendingFiles, setPendingFiles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [buckets, setBuckets] = useState([]);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  
  const fetchPendingFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/vault/files/pending', axiosConfig);
      setPendingFiles(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  
  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses', axiosConfig);
      setCourses(res.data);
      if (res.data.length > 0) setSelectedCourse(res.data[0].code);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPendingFiles();
    fetchCourses();
  }, []);

  
  const fetchExplorerData = async (courseCode) => {
    setLoading(true);
    try {
      const [bucketRes, vaultRes] = await Promise.all([
        axios.get(`/api/admin/vault/buckets/${courseCode}`, axiosConfig),
        axios.get(`/api/course-vault/${courseCode}`, axiosConfig)
      ]);
      setBuckets(bucketRes.data);
      setVaultFiles(vaultRes.data); 
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCourse && activeTab === 'explorer') {
      fetchExplorerData(selectedCourse);
      setSelectedBucket(null);
    }
  }, [selectedCourse, activeTab]);

  const handleCreateBucket = async () => {
    if (!newBucketName.trim() || !selectedCourse) return;
    try {
      await axios.post('/api/admin/vault/buckets', { name: newBucketName, courseCode: selectedCourse }, axiosConfig);
      setNewBucketName('');
      fetchExplorerData(selectedCourse);
    } catch (err) {
      alert('Failed to create bucket');
    }
  };

  const handleDeleteBucket = async (id) => {
    if (!window.confirm('Delete this folder? Files will be moved back to pending/unbucketed.')) return;
    try {
      await axios.delete(`/api/admin/vault/buckets/${id}`, axiosConfig);
      fetchExplorerData(selectedCourse);
    } catch (err) {
      alert('Failed to delete bucket');
    }
  };

  const handlePublishFile = async (fileId, bucketId) => {
    try {
      await axios.put(`/api/admin/vault/files/${fileId}/publish`, { bucketId }, axiosConfig);
      fetchPendingFiles();
      if (activeTab === 'explorer') fetchExplorerData(selectedCourse);
    } catch (err) {
      alert('Failed to publish file');
    }
  };

  const handleDeleteFile = async (fileId, isPending) => {
    if (!window.confirm('Delete this file from the vault permanently?')) return;
    try {
      await axios.delete(`/api/admin/vault/files/${fileId}`, axiosConfig);
      if (isPending) fetchPendingFiles();
      else fetchExplorerData(selectedCourse);
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden text-slate-200">
      <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Folder className="text-blue-400" />
          Course Vault Manager
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            <Inbox size={16} /> Pending Inbox ({pendingFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'explorer' ? 'bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            <Folder size={16} /> Vault Explorer
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && <div className="text-center p-4 text-slate-400">Loading...</div>}

        {}
        {activeTab === 'inbox' && !loading && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Files Awaiting Moderation</h3>
              <button onClick={fetchPendingFiles} className="p-2 bg-slate-700 rounded hover:bg-slate-600" title="Refresh">
                <RefreshCw size={16} />
              </button>
            </div>
            
            {pendingFiles.length === 0 ? (
              <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
                <CheckCircle className="mx-auto text-green-400 mb-2" size={32} />
                <p>No pending files. All caught up!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pendingFiles.map(file => (
                  <div key={file._id} className="p-4 bg-slate-700 rounded-lg flex items-center justify-between border border-slate-600">
                    <div>
                      <div className="font-semibold text-white">{file.fileName}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Course: {file.courseCode} | Teacher: {file.teacherName} | Size: {(file.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        className="bg-slate-800 text-sm border border-slate-600 rounded p-2 text-white"
                        onChange={(e) => {
                          if(e.target.value) handlePublishFile(file._id, e.target.value);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Publish to bucket...</option>
                        {buckets.filter(b => b.courseCode === file.courseCode).map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleDeleteFile(file._id, true)} className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40" title="Reject File">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {}
        {activeTab === 'explorer' && (
          <div className="flex flex-col h-[600px]">
            <div className="mb-4">
              <select 
                value={selectedCourse} 
                onChange={e => setSelectedCourse(e.target.value)}
                className="w-full md:w-1/3 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white"
              >
                {courses.map(c => (
                  <option key={c._id} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 h-full overflow-hidden">
              {}
              <div className="w-1/3 bg-slate-900 rounded-lg border border-slate-700 p-3 flex flex-col">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="New bucket name..." 
                    value={newBucketName}
                    onChange={e => setNewBucketName(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={handleCreateBucket} className="bg-blue-600 hover:bg-blue-500 p-1.5 rounded text-white" title="Add Bucket">
                    <FolderPlus size={16} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {buckets.map(b => (
                    <div 
                      key={b._id}
                      onClick={() => setSelectedBucket(b._id)}
                      className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${selectedBucket === b._id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder size={16} className={selectedBucket === b._id ? 'text-white' : 'text-blue-400'} />
                        <span className="text-sm font-medium truncate">{b.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBucket(b._id); }} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div 
                      onClick={() => setSelectedBucket('unbucketed')}
                      className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${selectedBucket === 'unbucketed' ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Folder size={16} />
                        <span className="text-sm italic">Unbucketed Files</span>
                      </div>
                  </div>
                </div>
              </div>

              {}
              <div className="w-2/3 bg-slate-900 rounded-lg border border-slate-700 p-4 flex flex-col">
                {selectedBucket ? (
                  <>
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Folder className="text-blue-400" size={18} />
                        {selectedBucket === 'unbucketed' ? 'Unbucketed Files' : buckets.find(b => b._id === selectedBucket)?.name}
                      </h3>
                      <button className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded flex items-center gap-1 opacity-50 cursor-not-allowed" title="Manual Upload (Coming Soon)">
                        <Upload size={14} /> Upload
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {(() => {
                        const group = vaultFiles.find(g => g.bucketId === selectedBucket);
                        const files = group ? group.files : [];
                        
                        if (files.length === 0) return <div className="text-center text-slate-500 mt-10">No files in this bucket.</div>;

                        return files.map(file => (
                          <div key={file._id} className="p-3 bg-slate-800 rounded border border-slate-700 flex justify-between items-center group hover:border-slate-600 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="text-blue-400 flex-shrink-0" size={20} />
                              <div className="truncate">
                                <div className="text-sm font-medium text-slate-200 truncate">{file.fileName}</div>
                                <div className="text-xs text-slate-500">{(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteFile(file._id, false)} className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <Folder size={48} className="mb-3 opacity-20" />
                    <p>Select a bucket to view its files</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseVaultManagerApp;
