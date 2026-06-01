// src/pages/user/Favorites.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PREFS_API = import.meta.env.VITE_PREFS_API_URL || 'http://localhost:3005/api';

// Хелпер для авторизованных запросов
const api = (baseURL) => {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return instance;
};

const prefsApi = api(PREFS_API);

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 🔍 Хелпер для нормализации статуса (универсальный)
  const getStatusInfo = (status) => {
    if (!status) return { text: 'Неизвестно', bg: '#f1f5f9', color: '#64748b' };
    
    const s = status.toLowerCase().trim();
    
    switch(s) {
      case 'available':
      case 'свободен':
      case 'free':
        return { text: 'Свободен', bg: '#dcfce7', color: '#166534' };
      case 'booked':
      case 'occupied':
      case 'занят':
      case 'busy':
        return { text: 'Занят', bg: '#dbeafe', color: '#1e40af' };
      case 'maintenance':
      case 'ремонт':
      case 'repair':
        return { text: 'Ремонт', bg: '#fee2e2', color: '#991b1b' };
      default:
        return { text: status, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  // 🔍 Хелпер для безопасного доступа к конфигам
  const getConfig = (pc) => {
    return pc.config || pc.PcConfiguration || pc.pcConfiguration || {};
  };

  // Загрузка избранных компьютеров
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        const res = await prefsApi.get('/preferences/favorites');
        
        // 🔍 ОТЛАДКА: смотрим, что реально пришло
        console.log('✅ Favorites response:', res.data);
        
        setFavorites(res.data || []);
      } catch (err) {
        console.error('❌ Load favorites error:', err);
        setError('Не удалось загрузить избранное');
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, []);

  // Удаление из избранного
  const handleRemove = async (computer_id) => {
    try {
      await prefsApi.delete(`/preferences/favorites/${computer_id}`);
      setFavorites(prev => prev.filter(pc => pc.computer_id !== computer_id));
    } catch (err) {
      console.error('❌ Remove favorite error:', err);
      alert('Не удалось удалить из избранного');
    }
  };

  // Бронирование напрямую из избранного
  const handleBook = (pc) => {
    navigate('/user', { state: { preselectedPc: pc } });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка избранного...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>❌ {error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>❤️ Избранные компьютеры</h1>
      
      {favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <p>У вас пока нет избранных компьютеров</p>
          <button 
            onClick={() => navigate('/user')}
            style={{ 
              marginTop: 16, 
              padding: '10px 24px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: 8, 
              cursor: 'pointer' 
            }}
          >
            🖥️ Выбрать компьютер
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {favorites.map(pc => {
            const config = getConfig(pc);
            const statusInfo = getStatusInfo(pc.status); // ✅ Нормализуем статус
            const isAvailable = pc.status?.toLowerCase() === 'available'; // ✅ Проверка доступности

            return (
              <div 
                key={pc.computer_id}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{pc.serial_number || `PC #${pc.computer_id}`}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                      Этаж {pc.floor ?? '—'}, комната {pc.room ?? '—'}
                    </p>
                  </div>
                  
                  {/* ✅ СТАТУС С ХЕЛПЕРОМ */}
                  
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.85rem', color: '#475569', marginBottom: 16 }}>
                  <div><strong>CPU:</strong> {config.cpu || '—'}</div>
                  <div><strong>RAM:</strong> {config.ram_gb ? `${config.ram_gb}GB` : '—'}</div>
                  <div><strong>GPU:</strong> {config.gpu || '—'}</div>
                  <div><strong>OS:</strong> {config.os || '—'}</div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  
                  <button 
                    onClick={() => handleRemove(pc.computer_id)}
                    style={{
                      padding: '8px 12px',
                      background: 'white',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    ❤️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}