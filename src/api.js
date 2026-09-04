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
export const restoreFolder = (id) => api.post(`/folders/${id}/restore`);
export const deleteFolderForever = (id) => api.delete(`/folders/${id}`);
export const listTrashFolders = () => api.get('/folders/trash');

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
export const restoreFile = (id) => api.post(`/files/${id}/restore`);
export const deleteFileForever = (id) => api.delete(`/files/${id}`);
export const listTrashFiles = () => api.get('/files/trash');

// Shares
export const shareResource = (resourceType, resourceId, shareWithEmail, role) =>
  api.post('/shares', { resourceType, resourceId, shareWithEmail, role });
export const listSharedWithMe = () => api.get('/shares/with-me');
export const deleteShare = (id) => api.delete(`/shares/${id}`);

// Search
export const searchItems = (q) => api.get('/search', { params: { q } });

export const starFolder = (id) => api.patch(`/folders/${id}/star`);

export const listStarredFolders = () => api.get('/folders/starred');
export const listStarredFiles = () => api.get('/files/starred');
export default api;