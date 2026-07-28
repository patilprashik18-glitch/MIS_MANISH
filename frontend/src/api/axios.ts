import axios from 'axios';

const getBaseURL = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5000/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
