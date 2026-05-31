// frontend/src/services/bookings.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_PCS_API_URL || 'http://localhost:3002/api';

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const bookingsAPI = {
  getAll: (params = {}) => axios.get(`${API_URL}/bookings`, { params }).then(res => res.data),
  getById: (id) => axios.get(`${API_URL}/bookings/${id}`).then(res => res.data),
  create: (data) => axios.post(`${API_URL}/bookings`, data).then(res => res.data),
  update: (id, data) => axios.patch(`${API_URL}/bookings/${id}`, data).then(res => res.data),
  delete: (id) => axios.delete(`${API_URL}/bookings/${id}`).then(res => res.data),
};

export default bookingsAPI;