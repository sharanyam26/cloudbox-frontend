import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { listFolders, listFiles, createFolder, downloadFile, uploadFile } from '../api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [trail, setTrail] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState([]); // [{id, name, progress, error}]
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, files_] = await Promise.all([
      listFolders(currentFolderId),
      listFiles(currentFolderId),
    ]);
    setFolders(f.data);
    setFiles(files_.data);
    setLoading(false);
  }, [currentFolderId]);

  useEffect(() => { load(); }, [load]);

  const openFolder = (folder) => {
    setTrail((t) => [...t, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateTo = (folderId) => {
    if (folderId === null) { setTrail([]); setCurrentFolderId(null); return; }
    const idx = trail.findIndex((f) => f.id === folderId);
    setTrail(trail.slice(0, idx + 1));
    setCurrentFolderId(folderId);
  };

  const handleNewFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), currentFolderId);
    setNewFolderName('');
    setShowNewFolder(false);
    load();
  };

  const handleDownload = async (file) => {
    const res = await downloadFile(file.id);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doUpload = async (fileList) => {
    for (const file of Array.from(fileList)) {
      const id = `${file.name}-${Date.now()}`;
      setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);
      try {
        await uploadFile(file, currentFolderId, (evt) => {
          const progress = Math.round((evt.loaded * 100) / evt.total);
          setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
        });
        setUploads((prev) => prev.filter((u) => u.id !== id));
        load();
      } catch (err) {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, error: true } : u)));
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) doUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) doUpload(e.dataTransfer.files);
  };

  return (
    <div
      className="flex min-h-screen bg-slate-50"
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="font-semibold text-white">Cloudbox</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mb-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2"
        >
          ⬆ Upload
        </button>
        <button
          onClick={() => setShowNewFolder(true)}
          className="mb-6 border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-medium rounded-lg py-2"
        >
          + New Folder
        </button>

        <div className="text-sm text-slate-400 mb-2">My Drive</div>
        <div className="mt-auto text-xs text-slate-500">
          <div className="mb-2 truncate">{user?.email}</div>
          <button onClick={logout} className="text-indigo-400">Log out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 relative">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-slate-500 mb-6">
          <button onClick={() => navigateTo(null)} className="hover:text-indigo-600 font-medium">My Drive</button>
          {trail.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <span>/</span>
              <button onClick={() => navigateTo(f.id)} className="hover:text-indigo-600">{f.name}</button>
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : folders.length === 0 && files.length === 0 ? (
          <p className="text-slate-400 text-sm">This folder is empty. Drag files here to upload.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {folders.map((f) => (
              <div
                key={f.id}
                onDoubleClick={() => openFolder(f)}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 text-indigo-600">📁</div>
                <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1">Folder</div>
              </div>
            ))}
            {files.map((f) => (
              <div
                key={f.id}
                onDoubleClick={() => handleDownload(f)}
                className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">📄</div>
                <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1">{(f.sizeBytes / 1024).toFixed(1)} KB</div>
              </div>
            ))}
          </div>
        )}

        {/* Drag overlay */}
        {dragActive && (
          <div className="fixed inset-0 bg-indigo-600/10 border-4 border-dashed border-indigo-500 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-6">
              <p className="font-medium text-slate-900">Drop files to upload</p>
            </div>
          </div>
        )}

        {/* Upload progress panel */}
        {uploads.length > 0 && (
          <div className="fixed bottom-6 right-6 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-30 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">Uploading</p>
            {uploads.map((u) => (
              <div key={u.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate max-w-[160px] text-slate-700">{u.name}</span>
                  <span className="text-slate-400">{u.error ? 'Failed' : `${u.progress}%`}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${u.error ? 'bg-red-500' : 'bg-indigo-600'} transition-all`}
                    style={{ width: `${u.error ? 100 : u.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleNewFolder} className="bg-white rounded-xl p-6 w-80">
            <h2 className="font-semibold text-slate-900 mb-3">New folder</h2>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Folder name"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewFolder(false)} className="px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}