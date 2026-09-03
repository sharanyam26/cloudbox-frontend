import { useState } from 'react';
import { createShare } from '../api';

export default function ShareModal({ item, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createShare(item.type === 'file' ? 'FILE' : 'FOLDER', item.id, email.trim(), role);
      setDone(true);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not share');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={handleShare} className="bg-white rounded-xl p-6 w-96">
        <h2 className="font-semibold text-slate-900 mb-1">Share "{item.name}"</h2>
        <p className="text-xs text-slate-400 mb-4">They need an existing Cloudbox account.</p>

        <input
          autoFocus
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="person@example.com"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        >
          <option value="VIEWER">Viewer (can view/download)</option>
          <option value="EDITOR">Editor (can view/download)</option>
        </select>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        {done && <p className="text-xs text-emerald-600 mb-3">Shared successfully.</p>}

        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
            Close
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            {busy ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  );
}