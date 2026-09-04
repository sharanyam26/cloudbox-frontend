import { useState } from 'react';
import { shareResource, createLinkShare } from '../api';

export default function ShareModal({ item, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [linkPassword, setLinkPassword] = useState('');
  const [linkExpiry, setLinkExpiry] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);

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

  const generateLink = async () => {
    const { data } = await createLinkShare(
      item.type === 'folder' ? 'FOLDER' : 'FILE',
      item.id,
      'VIEWER',
      linkPassword || null,
      linkExpiry ? Number(linkExpiry) : null
    );
    setLinkUrl(`${window.location.origin}/share/${data.token}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          <div className="flex justify-end gap-2 pt-1">
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">
              Share
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 mt-4 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Public link</p>
          <div className="flex gap-2 mb-2">
            <input
              type="password"
              placeholder="Password (optional)"
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Expires (hrs)"
              value={linkExpiry}
              onChange={(e) => setLinkExpiry(e.target.value)}
              className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={generateLink}
            className="w-full border border-indigo-600 text-indigo-600 rounded-lg py-2 text-sm mb-2"
          >
            Generate link
          </button>
          {linkUrl && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-slate-600 truncate">{linkUrl}</span>
              <button onClick={copyLink} className="text-indigo-600 text-xs font-medium">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Close</button>
        </div>
      </div>
    </div>
  );
}