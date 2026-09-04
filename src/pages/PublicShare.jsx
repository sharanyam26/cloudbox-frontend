import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function PublicShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const load = async (pwd) => {
    setError('');
    try {
      const res = await api.get(`/public/${token}`, { params: pwd ? { password: pwd } : {} });
      setData(res.data);
      setNeedsPassword(false);
    } catch (err) {
      if (err.response?.status === 401) setNeedsPassword(true);
      else setError(err.response?.data?.message || 'This link is not available');
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleDownload = async () => {
    const res = await api.get(`/public/${token}/download`, {
      params: password ? { password } : {},
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.resource.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (needsPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-6 w-80">
          <p className="font-medium text-slate-900 mb-3">This link is password protected</p>
          <form onSubmit={(e) => { e.preventDefault(); load(password); }} className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Password"
            />
            <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg">Unlock</button>
          </form>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 w-96 text-center">
        <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-xl">
          {data.resourceType === 'FOLDER' ? '📁' : '📄'}
        </div>
        <h1 className="font-semibold text-slate-900 mb-1">{data.resource.name}</h1>
        {data.resourceType === 'FILE' && (
          <button onClick={handleDownload} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm">
            Download
          </button>
        )}
      </div>
    </div>
  );
}