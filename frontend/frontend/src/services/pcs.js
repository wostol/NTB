// frontend/src/services/pcs.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_PCS_API_URL || 'http://localhost:3002/api';

// Интерсептор: добавляет токен и логирует запрос
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  console.log('🔍 PCS Request:', { 
    url: config.url, 
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 30)}...` : null
  });
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерсептор ответа: логирует ошибки
axios.interceptors.response.use(
  res => res,
  err => {
    console.error('❌ PCS Response Error:', {
      url: err.config?.url,
      status: err.response?.status,
      data: err.response?.data
    });
    return Promise.reject(err);
  }
);

export const pcsAPI = {
  getAll: (params = {}) => 
    axios.get(`${API_URL}/pcs`, { params }).then(res => res.data),
  getById: (id) => 
    axios.get(`${API_URL}/pcs/${id}`).then(res => res.data),
  create: (data) => 
    axios.post(`${API_URL}/pcs`, data).then(res => res.data),
  update: (id, data) => 
    axios.put(`${API_URL}/pcs/${id}`, data).then(res => res.data),
  delete: (id) => 
    axios.delete(`${API_URL}/pcs/${id}`).then(res => res.data),
};

export default pcsAPI;