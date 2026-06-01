// frontend/src/services/bookings.js
import axios from 'axios';

// ✅ Правильный URL: booking-service на порту 3003
const API_URL = import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:3003/api';

// Создаём экземпляр axios с интерцептором для токена
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const bookingsAPI = {
  // Получить все брони (с пагинацией и фильтрами)
  getAll: (params = {}) => 
    api.get('/bookings', { params }).then(res => res.data),
  
  // Получить одну бронь по ID
  getById: (id) => 
    api.get(`/bookings/${id}`).then(res => res.data),
  
  // Создать новую бронь
  create: (data) => 
    api.post('/bookings', data).then(res => res.data),
  
  // Обновить бронь (статус, время, заметки)
  update: (id, data) => 
    api.patch(`/bookings/${id}`, data).then(res => res.data),
  
  // Отменить/удалить бронь
  delete: (id) => 
    api.delete(`/bookings/${id}`).then(res => res.data),
  
  // Получить брони конкретного пользователя
  getByUser: (userId, params = {}) => 
    api.get(`/bookings/user/${userId}`, { params }).then(res => res.data),
};

export default bookingsAPI;