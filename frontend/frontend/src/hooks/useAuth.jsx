// frontend/src/hooks/useAuth.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Проверка сессии при загрузке
  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('jwt_token');

    if (token) {
      axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (isMounted) setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem('jwt_token');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, []);

  // 🔐 Логин
  const login = useCallback(async (credentials) => {
    setError(null);
    const res = await axios.post(`${API_URL}/auth/login`, credentials);
    const { token, user } = res.data;
    
    localStorage.setItem('jwt_token', token);
    setUser(user);
    return { token, user };
  }, []);

  // 📝 Регистрация
  const register = useCallback(async (userData) => {
    setError(null);
    const res = await axios.post(`${API_URL}/auth/register`, userData);
    // Бэкенд возвращает { message, token, user }
    return res.data;
  }, []);

  // 🚪 Выход
  const logout = useCallback(() => {
    localStorage.removeItem('jwt_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  // ❌ Очистка ошибки
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      setError,      // ✅ Добавляем для прямого доступа
      login, 
      register, 
      logout, 
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};