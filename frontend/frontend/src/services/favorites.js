// frontend/src/services/favorites.js
import axios from 'axios';

const FAVORITES_API = import.meta.env.VITE_FAVORITES_API_URL || 'http://localhost:3005/api';

const api = axios.create({ baseURL: FAVORITES_API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const favoritesAPI = {
  // Получить все избранные ПК текущего пользователя
  getAll: () => api.get('/favorites').then(res => res.data),
  
  // Добавить ПК в избранное
  add: (computer_id) => api.post('/favorites', { computer_id }).then(res => res.data),
  
  // Удалить ПК из избранного
  remove: (computer_id) => api.delete(`/favorites/${computer_id}`).then(res => res.data),
  
  // Проверить, в избранном ли ПК
  isFavorite: (computer_id) => 
    api.get(`/favorites/check/${computer_id}`).then(res => res.data.is_favorite),
};

export default favoritesAPI;