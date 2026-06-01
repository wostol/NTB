// src/pages/user/MyBookings.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

// ✅ ИСПОЛЬЗУЕМ ПРАВИЛЬНУЮ ПЕРЕМЕННУЮ ДЛЯ БРОНИРОВАНИЙ!
const BOOKINGS_API_URL = import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:3003/api';

const bookingsApi = axios.create({ baseURL: BOOKINGS_API_URL });
bookingsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 MyBookings: user object:', user);
    console.log('🔍 MyBookings: userId candidates:', {
      userId: user?.userId,
      user_id: user?.user_id,
      id: user?.id
    });
    setDebugInfo({ user, hasToken: !!localStorage.getItem('jwt_token') });

    const currentUserId = user?.userId || user?.user_id || user?.id;
    
    if (!currentUserId) {
      console.warn('⚠️ MyBookings: user ID not found, waiting...');
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`📡 Fetching bookings for user ${currentUserId} from ${BOOKINGS_API_URL}...`);
        
        // ✅ Запрос на ПРАВИЛЬНЫЙ порт (3003)
        const res = await bookingsApi.get('/bookings', {
          params: { limit: 100, status: 'all' }
        });
        
        console.log('✅ Bookings response:', res.data);
        
        const data = res.data.bookings || res.data || [];
        setBookings(Array.isArray(data) ? data : []);
        
      } catch (err) {
        console.error('❌ Failed to fetch bookings:', err);
        console.error('❌ Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: { url: err.config?.url, method: err.config?.method }
        });
        setError(err.response?.data?.error || 'Не удалось загрузить бронирования');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Отменить эту бронь?')) return;
    try {
      await bookingsApi.delete(`/bookings/${bookingId}`);
      setBookings(prev => prev.map(b => 
        b.booking_id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
      alert('✅ Бронь отменена');
    } catch (err) {
      console.error('❌ Cancel error:', err);
      alert(`❌ Ошибка: ${err.response?.data?.error || 'Не удалось отменить'}`);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: '#dcfce7', color: '#166534', text: 'Активна' },
      confirmed: { bg: '#dbeafe', color: '#1e40af', text: 'Подтверждена' },
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Ожидает' },
      completed: { bg: '#f1f5f9', color: '#475569', text: 'Завершена' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'Отменена' },
    };
    const s = styles[status] || styles.completed;
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: s.bg, color: s.color }}>{s.text}</span>;
  };

  const activeBookings = bookings.filter(b => ['active', 'confirmed', 'pending'].includes(b.status));
  const pastBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

  if (debugInfo && loading) {
    return (
      <div style={{ padding: 20 }}>
        <h3>🔍 Отладка MyBookings</h3>
        <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: '0.8rem', overflow: 'auto' }}>
          {JSON.stringify({
            hasToken: debugInfo.hasToken,
            apiEndpoint: BOOKINGS_API_URL,
            user: debugInfo.user ? {
              userId: debugInfo.user.userId,
              user_id: debugInfo.user.user_id,
              username: debugInfo.user.username
            } : null
          }, null, 2)}
        </pre>
        <p style={{ color: '#64748b' }}>Загрузка...</p>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка броней...</div>;
  
  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        ❌ {error}
        <br/>
        <button onClick={() => window.location.reload()} style={{
          marginTop: 12, padding: '8px 16px', background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer'
        }}>🔄 Повторить</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>📋 Мои бронирования</h2>
        <button onClick={() => window.location.reload()} style={{
          padding: '8px 16px', background: '#64748b', color: 'white', border: 'none',
          borderRadius: 6, cursor: 'pointer'
        }}>🔄 Обновить</button>
      </div>

      {activeBookings.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', fontSize: '1.1rem' }}>⏳ Активные</h3>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {activeBookings.map(b => (
              <div key={b.booking_id} style={{ 
                padding: 16, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.computer?.serial_number || `ПК #${b.computer_id}`}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>🕐 {formatTime(b.start_time)} — {formatTime(b.end_time)}</div>
                  {b.purpose && <div style={{ color: '#475569', fontSize: '0.9rem' }}>📝 {b.purpose}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {getStatusBadge(b.status)}
                  <button onClick={() => handleCancel(b.booking_id)} style={{
                    padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none',
                    borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem'
                  }}>Отменить</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pastBookings.length > 0 && (
        <>
          <h3 style={{ margin: '24px 0 12px', fontSize: '1.1rem' }}>📚 История</h3>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {pastBookings.map(b => (
              <div key={b.booking_id} style={{ 
                padding: 16, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{b.computer?.serial_number || `ПК #${b.computer_id}`}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{formatTime(b.start_time)} — {formatTime(b.end_time)}</div>
                </div>
                {getStatusBadge(b.status)}
              </div>
            ))}
          </div>
        </>
      )}

      {bookings.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: 'white', borderRadius: 12 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>У вас пока нет бронирований</div>
          <button onClick={() => navigate('/')} style={{
            padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none',
            borderRadius: 8, cursor: 'pointer'
          }}>➕ Забронировать компьютер</button>
        </div>
      )}
    </div>
  );
}