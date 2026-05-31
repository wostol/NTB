// frontend/src/services/users.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Интерсептор: добавляет токен
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const usersAPI = {
  // Получить список с фильтрами и пагинацией
  getAll: (params = {}) => 
    axios.get(`${API_URL}/admin/users`, { params }).then(res => res.data),
  
  // Заблокировать/разблокировать
  toggleStatus: (id) => 
    axios.patch(`${API_URL}/admin/users/${id}/toggle-status`).then(res => res.data),
  
  // Удалить пользователя
  delete: (id) => 
    axios.delete(`${API_URL}/admin/users/${id}`).then(res => res.data),
};

export default usersAPI;