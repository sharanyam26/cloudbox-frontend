import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (name, email, password) => api.post('/auth/register', { name, email, password });

// Folders
export const listFolders = (parentId) => api.get('/folders', { params: { parentId } });
export const createFolder = (name, parentId) => api.post('/folders', { name, parentId });
export const renameFolder = (id, name) => api.patch(`/folders/${id}/rename`, { name });
export const trashFolder = (id) => api.post(`/folders/${id}/trash`);

// Files
export const listFiles = (folderId) => api.get('/files', { params: { folderId } });
export const uploadFile = (file, folderId, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/files', form, {
    params: folderId ? { folderId } : {},
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};
export const downloadFile = (id) => api.get(`/files/${id}/download`, { responseType: 'blob' });
export const renameFile = (id, name) => api.patch(`/files/${id}/rename`, { name });
export const starFile = (id) => api.patch(`/files/${id}/star`);
export const trashFile = (id) => api.post(`/files/${id}/trash`);

export default api;