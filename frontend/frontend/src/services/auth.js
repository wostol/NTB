// frontend/src/services/auth.js
import api from './api';

export const authAPI = {
  /**
   * Логин пользователя
   * @param {Object} credentials - { username, password }
   * @returns {Promise<{ token: string, user: Object }>}
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Регистрация нового пользователя
   * @param {Object} data - { username, password, full_name, email? }
   * @returns {Promise<{ message: string, user: Object }>}
   */
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Получить данные текущего пользователя
   * @returns {Promise<Object>}
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};