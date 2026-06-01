// src/pages/user/Profile.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

// Базовые URL из .env или дефолты
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Хелпер для авторизованных запросов
const authApi = axios.create({ baseURL: API_BASE });
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function UserProfile() {
  const { user, logout, refreshUser } = useAuth(); // ✅ refreshUser обновит данные в контексте
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);

  // Инициализация формы при загрузке пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
      setOriginalData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Валидация: есть ли изменения?
  const hasChanges = formData.full_name !== originalData.full_name || formData.email !== originalData.email;

  // Сохранение изменений
  const handleSave = async () => {
    // Простая валидация email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Неверный формат email');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Отправляем только изменённые поля
      const payload = {};
      if (formData.full_name !== originalData.full_name) payload.full_name = formData.full_name;
      if (formData.email !== originalData.email) payload.email = formData.email;

      if (Object.keys(payload).length === 0) {
        setSuccess('Нет изменений для сохранения');
        setEditing(false);
        return;
      }

      // PATCH /api/auth/me — обновление текущего пользователя
      const res = await authApi.patch('/auth/me', payload);
      
      // ✅ Обновляем данные в контексте авторизации (если есть такая функция)
      if (refreshUser) {
        await refreshUser();
      }
      
      // Обновляем локальный стейт
      setOriginalData(formData);
      setSuccess('✅ Данные успешно обновлены');
      setEditing(false);
      
    } catch (err) {
      console.error('❌ Profile update error:', err);
      const msg = err.response?.data?.error || 'Не удалось сохранить изменения';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Отмена редактирования
  const handleCancel = () => {
    setFormData(originalData);
    setEditing(false);
    setError(null);
    setSuccess(null);
  };

  // Выход из аккаунта
  const handleLogout = () => {
    if (window.confirm('Вы действительно хотите выйти?')) {
      logout();
      navigate('/login');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ marginBottom: 16 }}>Загрузка профиля...</div>
        <button onClick={() => navigate('/login')} style={{
          padding: '10px 20px', background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer'
        }}>
          🔐 Войти
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>👤 Мой профиль</h2>
      
      {/* Сообщения об ошибках/успехе */}
      {error && (
        <div style={{
          padding: '12px 16px', background: '#fee2e2', color: '#991b1b',
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>❌</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', fontWeight: 'bold', color: '#991b1b'
          }}>×</button>
        </div>
      )}
      
      {success && (
        <div style={{
          padding: '12px 16px', background: '#dcfce7', color: '#166534',
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span>✅</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', fontWeight: 'bold', color: '#166534'
          }}>×</button>
        </div>
      )}
      
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', maxWidth: 500 }}>
        {/* Имя пользователя (не редактируется) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Имя пользователя</label>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, fontWeight: 500, color: '#64748b' }}>
            @{user.username}
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
            Имя пользователя нельзя изменить
          </p>
        </div>
        
        {/* Полное имя */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Полное имя</label>
          {editing ? (
            <input 
              value={formData.full_name} 
              onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              placeholder="Введите ваше полное имя"
            />
          ) : (
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6 }}>
              {formData.full_name || <span style={{ color: '#94a3b8' }}>Не указано</span>}
            </div>
          )}
        </div>
        
        {/* Email */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Email</label>
          {editing ? (
            <input 
              value={formData.email} 
              onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              placeholder="example@email.com"
              type="email"
            />
          ) : (
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6 }}>
              {formData.email || <span style={{ color: '#94a3b8' }}>Не указан</span>}
            </div>
          )}
        </div>
        
        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {editing ? (
            <>
              <button 
                onClick={handleSave} 
                disabled={loading || !hasChanges}
                style={{ 
                  padding: '10px 20px', 
                  background: loading || !hasChanges ? '#94a3b8' : '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6, 
                  cursor: loading || !hasChanges ? 'not-allowed' : 'pointer', 
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {loading ? '⏳ Сохранение...' : '💾 Сохранить'}
              </button>
              <button 
                onClick={handleCancel} 
                disabled={loading}
                style={{ 
                  padding: '10px 20px', 
                  background: '#f1f5f9', 
                  color: '#1e293b', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: 6, 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }}
              >
                ✕ Отмена
              </button>
            </>
          ) : (
            <button 
              onClick={() => { setEditing(true); setError(null); setSuccess(null); }} 
              style={{ 
                padding: '10px 20px', 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: 6, 
                cursor: 'pointer', 
                fontWeight: 500 
              }}
            >
              ✏️ Редактировать
            </button>
          )}
        </div>
        
        <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
        
        {/* Кнопка выхода */}
        <button 
          onClick={handleLogout} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#ef4444', 
            color: 'white', 
            border: 'none', 
            borderRadius: 6, 
            cursor: 'pointer', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          🚪 Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}