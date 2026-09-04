import { useState } from 'react';
import { shareResource } from '../api';

export default function ShareModal({ item, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await shareResource(item.type === 'folder' ? 'FOLDER' : 'FILE', item.id, email, role);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not share');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-96">
        <h2 className="font-semibold text-slate-900 mb-1">Share "{item.name}"</h2>
        <p className="text-xs text-slate-500 mb-4">Invite someone by email</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
          </select>
          {error && <p className="text-red-600 text-xs">{error}</p>}
          {success && <p className="text-green-600 text-xs">Shared successfully!</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">
              Close
            </button>
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}