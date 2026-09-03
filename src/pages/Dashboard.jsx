import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listFolders, createFolder, trashFolder, restoreFolder, deleteFolderForever,
  listFiles, uploadFile, downloadFile, trashFile, restoreFile, deleteFileForever,
  listTrashFolders, listTrashFiles, listSharedWithMe, deleteShare, searchItems,
} from '../api';
import ShareModal from '../components/ShareModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState('drive'); // 'drive' | 'shared' | 'trash'

  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [trail, setTrail] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [sharedItems, setSharedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [shareTarget, setShareTarget] = useState(null); // {id, name, type}
  const fileInputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searching

  const load = async () => {
    setLoading(true);
    try {
      if (mode === 'drive') {
        const [f, fi] = await Promise.all([listFolders(currentFolderId), listFiles(currentFolderId)]);
        setFolders(f.data);
        setFiles(fi.data);
      } else if (mode === 'trash') {
        const [f, fi] = await Promise.all([listTrashFolders(), listTrashFiles()]);
        setFolders(f.data);
        setFiles(fi.data);
      } else if (mode === 'shared') {
        const res = await listSharedWithMe();
        setSharedItems(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [mode, currentFolderId]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      const res = await searchItems(query.trim());
      setSearchResults(res.data);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const switchMode = (m) => {
    setMode(m);
    setCurrentFolderId(null);
    setTrail([]);
    setQuery('');
    setSearchResults(null);
  };

  const navigateTo = (folderId) => {
    if (folderId === null) { setTrail([]); setCurrentFolderId(null); return; }
    const idx = trail.findIndex((f) => f.id === folderId);
    if (idx >= 0) setTrail(trail.slice(0, idx + 1));
    setCurrentFolderId(folderId);
  };

  const openFolder = (f) => {
    setTrail([...trail, f]);
    setCurrentFolderId(f.id);
  };

  const openFolderFromSearch = (f) => {
    setQuery('');
    setSearchResults(null);
    setMode('drive');
    setTrail([f]);
    setCurrentFolderId(f.id);
  };

  const handleNewFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), currentFolderId);
    setNewFolderName('');
    setShowNewFolder(false);
    load();
  };

  const handleDownload = async (f) => {
    const res = await downloadFile(f.id);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Trash actions ----
  const handleTrash = async (item, type) => {
    if (type === 'folder') await trashFolder(item.id);
    else await trashFile(item.id);
    load();
  };

  const handleRestore = async (item, type) => {
    if (type === 'folder') await restoreFolder(item.id);
    else await restoreFile(item.id);
    load();
  };

  const handleDeleteForever = async (item, type) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return;
    if (type === 'folder') await deleteFolderForever(item.id);
    else await deleteFileForever(item.id);
    load();
  };

  const handleRevokeShare = async (shareId) => {
    await deleteShare(shareId);
    load();
  };

  // ---- Upload ----
  const doUpload = (fileList) => {
    Array.from(fileList).forEach(async (file) => {
      const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploads((u) => [...u, { id: uploadId, name: file.name, progress: 0, error: false }]);
      try {
        await uploadFile(file, currentFolderId, (evt) => {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setUploads((u) => u.map((x) => (x.id === uploadId ? { ...x, progress: pct } : x)));
        });
        setUploads((u) => u.filter((x) => x.id !== uploadId));
        load();
      } catch {
        setUploads((u) => u.map((x) => (x.id === uploadId ? { ...x, error: true } : x)));
        setTimeout(() => setUploads((u) => u.filter((x) => x.id !== uploadId)), 4000);
      }
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) doUpload(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (mode === 'drive' && e.dataTransfer.files?.length) doUpload(e.dataTransfer.files);
  };

  const navBtn = (m, label, icon) => (
    <button
      onClick={() => switchMode(m)}
      className={`text-left text-sm rounded-lg px-3 py-2 mb-1 ${
        mode === m ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      className="flex min-h-screen bg-slate-50"
      onDragOver={(e) => { e.preventDefault(); if (mode === 'drive') setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-200 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="font-semibold text-white">Cloudbox</span>
        </div>

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={mode !== 'drive'}
          className="mb-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-40"
        >
          ⬆ Upload
        </button>
        <button
          onClick={() => setShowNewFolder(true)}
          disabled={mode !== 'drive'}
          className="mb-6 border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-medium rounded-lg py-2 disabled:opacity-40"
        >
          + New Folder
        </button>

        <div className="flex flex-col">
          {navBtn('drive', 'My Drive', '📁')}
          {navBtn('shared', 'Shared with me', '👥')}
          {navBtn('trash', 'Trash', '🗑')}
        </div>

        <div className="mt-auto text-xs text-slate-500">
          <div className="mb-2 truncate">{user?.email}</div>
          <button onClick={logout} className="text-indigo-400">Log out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and folders..."
          className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-sm mb-6"
        />

        {!searchResults && mode === 'drive' && (
          <div className="flex items-center gap-1 text-sm text-slate-500 mb-6">
            <button onClick={() => navigateTo(null)} className="hover:text-indigo-600 font-medium">My Drive</button>
            {trail.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <span>/</span>
                <button onClick={() => navigateTo(f.id)} className="hover:text-indigo-600">{f.name}</button>
              </span>
            ))}
          </div>
        )}
        {!searchResults && mode === 'shared' && <h1 className="text-lg font-semibold text-slate-900 mb-6">Shared with me</h1>}
        {!searchResults && mode === 'trash' && <h1 className="text-lg font-semibold text-slate-900 mb-6">Trash</h1>}
        {searchResults && <h1 className="text-lg font-semibold text-slate-900 mb-6">Search results for "{query}"</h1>}

        {searchResults ? (
          searchResults.folders.length === 0 && searchResults.files.length === 0 ? (
            <p className="text-slate-400 text-sm">No results.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {searchResults.folders.map((f) => (
                <div
                  key={f.id}
                  onDoubleClick={() => openFolderFromSearch(f)}
                  className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 text-indigo-600">📁</div>
                  <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                  <div className="text-xs text-slate-400 mt-1">Folder</div>
                </div>
              ))}
              {searchResults.files.map((f) => (
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
          )
        ) : loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : mode === 'shared' ? (
          sharedItems.length === 0 ? (
            <p className="text-slate-400 text-sm">Nothing has been shared with you yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sharedItems.map((s) => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 text-indigo-600">
                    {s.resourceType === 'FOLDER' ? '📁' : '📄'}
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">{s.resource?.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Shared by {s.sharedBy?.email} · {s.role}
                  </div>
                  <div className="flex gap-3 mt-3 text-xs">
                    {s.resourceType === 'FILE' && (
                      <button onClick={() => handleDownload(s.resource)} className="text-indigo-600">Download</button>
                    )}
                    <button onClick={() => handleRevokeShare(s.id)} className="text-slate-400">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : folders.length === 0 && files.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {mode === 'trash' ? 'Trash is empty.' : 'This folder is empty. Drag files here to upload.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {folders.map((f) => (
              <div
                key={f.id}
                onDoubleClick={() => mode === 'drive' && openFolder(f)}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 text-indigo-600">📁</div>
                <div className="text-sm font-medium text-slate-900 truncate cursor-pointer">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1">Folder</div>
                <div className="flex gap-3 mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {mode === 'drive' ? (
                    <>
                      <button onClick={() => setShareTarget({ id: f.id, name: f.name, type: 'folder' })} className="text-indigo-600">Share</button>
                      <button onClick={() => handleTrash(f, 'folder')} className="text-slate-400">Trash</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleRestore(f, 'folder')} className="text-indigo-600">Restore</button>
                      <button onClick={() => handleDeleteForever(f, 'folder')} className="text-red-500">Delete forever</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {files.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div
                  onDoubleClick={() => mode === 'drive' && handleDownload(f)}
                  className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3 cursor-pointer"
                >
                  📄
                </div>
                <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1">{(f.sizeBytes / 1024).toFixed(1)} KB</div>
                <div className="flex gap-3 mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {mode === 'drive' ? (
                    <>
                      <button onClick={() => handleDownload(f)} className="text-slate-500">Download</button>
                      <button onClick={() => setShareTarget({ id: f.id, name: f.name, type: 'file' })} className="text-indigo-600">Share</button>
                      <button onClick={() => handleTrash(f, 'file')} className="text-slate-400">Trash</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleRestore(f, 'file')} className="text-indigo-600">Restore</button>
                      <button onClick={() => handleDeleteForever(f, 'file')} className="text-red-500">Delete forever</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {dragActive && mode === 'drive' && (
          <div className="fixed inset-0 bg-indigo-600/10 border-4 border-dashed border-indigo-500 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl px-8 py-6">
              <p className="font-medium text-slate-900">Drop files to upload</p>
            </div>
          </div>
        )}

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

      {shareTarget && <ShareModal item={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  );
}