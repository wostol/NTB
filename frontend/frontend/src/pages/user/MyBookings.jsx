// src/pages/user/MyBookings.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

// 🔧 Моковые данные
const MOCK_MY_BOOKINGS = [
  { booking_id: 201, computer: 'PC-001', start_time: '2026-06-01T10:00', end_time: '2026-06-01T12:00', status: 'active', purpose: 'Дипломная работа' },
  { booking_id: 202, computer: 'PC-005', start_time: '2026-06-03T14:00', end_time: '2026-06-03T16:00', status: 'confirmed', purpose: 'Курсовая по базам данных' },
  { booking_id: 203, computer: 'PC-003', start_time: '2026-05-28T09:00', end_time: '2026-05-28T11:00', status: 'completed', purpose: 'Лабораторная №3' },
];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setTimeout(() => { setBookings(MOCK_MY_BOOKINGS); setLoading(false); }, 300);
  }, []);

  const handleCancel = (id) => {
    if (!window.confirm('Отменить эту бронь?')) return;
    setBookings(prev => prev.map(b => b.booking_id === id ? { ...b, status: 'cancelled' } : b));
    alert('Бронь отменена');
  };

  const formatTime = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: '#dcfce7', color: '#166534', text: 'Активна' },
      confirmed: { bg: '#dbeafe', color: '#1e40af', text: 'Подтверждена' },
      completed: { bg: '#f1f5f9', color: '#475569', text: 'Завершена' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'Отменена' },
    };
    const s = styles[status] || styles.completed;
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: s.bg, color: s.color }}>{s.text}</span>;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка броней...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>📋 Мои бронирования</h2>
      
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {bookings.map(b => (
          <div key={b.booking_id} style={{ 
            padding: 16, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{b.computer} • {formatTime(b.start_time)} - {formatTime(b.end_time)}</div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{b.purpose}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {getStatusBadge(b.status)}
              {(b.status === 'active' || b.status === 'confirmed') && (
                <button onClick={() => handleCancel(b.booking_id)} style={{
                  padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none',
                  borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem'
                }}>
                  Отменить
                </button>
              )}
            </div>
          </div>
        ))}
        {bookings.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>У вас пока нет бронирований</div>}
      </div>
    </div>
  );
}