// frontend/src/pages/admin/Bookings/BookingList.jsx
import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../../services/bookings';
import { useAuth } from '../../../hooks/useAuth';

export default function BookingList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: 'all', date: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ computer_id: '', start_time: '', end_time: '', purpose: '' });

  const { user } = useAuth();
  const isAdmin = user?.role_id === 2;

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15, ...filters };
      if (!isAdmin) params.user_id = user?.user_id;
      const data = await bookingsAPI.getAll(params);
      setBookings(data.bookings);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch bookings:', err);
      setError('Не удалось загрузить бронирования');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(1); }, [filters.status, filters.date]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await bookingsAPI.create({ ...formData, user_id: formData.user_id || user?.user_id });
      setShowModal(false);
      fetchBookings(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка создания');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await bookingsAPI.update(id, { status: newStatus });
      fetchBookings(pagination.page);
    } catch { alert('Ошибка обновления статуса'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Отменить это бронирование?')) return;
    try {
      await bookingsAPI.delete(id);
      fetchBookings(pagination.page);
    } catch { alert('Ошибка отмены'); }
  };

  const getStatusBadge = (s) => {
    const map = {
      active: { bg: '#dcfce7', color: '#166534', text: 'Активно' },
      confirmed: { bg: '#dbeafe', color: '#1e40af', text: 'Подтверждено' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', text: 'Отменено' },
      completed: { bg: '#f1f5f9', color: '#475569', text: 'Завершено' },
    };
    const st = map[s] || map.active;
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.text}</span>;
  };

  if (loading && bookings.length === 0) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>📅 Бронирования</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="confirmed">Подтверждённые</option>
            <option value="cancelled">Отменённые</option>
            <option value="completed">Завершённые</option>
          </select>
          <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          {isAdmin && <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>➕ Создать</button>}
        </div>
      </div>

      {error && <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>❌ {error} <button onClick={() => { setError(null); fetchBookings(pagination.page); }} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer' }}>🔄</button></div>}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Пользователь</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Компьютер</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Время</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Статус</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.booking_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b' }}>#{b.booking_id}</td>
                <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 500 }}>{b.user?.full_name || '—'}</div><div style={{ fontSize: '0.85rem', color: '#64748b' }}>@{b.user?.username}</div></td>
                <td style={{ padding: '12px 16px' }}><div>{b.computer?.serial_number}</div><div style={{ fontSize: '0.85rem', color: '#64748b' }}>Этаж {b.computer?.floor}, комн. {b.computer?.room}</div></td>
                <td style={{ padding: '12px 16px', fontSize: '0.9rem' }}>{new Date(b.start_time).toLocaleString('ru-RU')} — {new Date(b.end_time).toLocaleString('ru-RU')}</td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(b.status)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {b.status === 'active' && <button onClick={() => handleStatusChange(b.booking_id, 'completed')} style={{ padding: '6px 10px', marginRight: 6, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>✅ Завершить</button>}
                  {b.status !== 'cancelled' && <button onClick={() => handleCancel(b.booking_id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fff1f2', color: '#be123c', cursor: 'pointer' }}>🗑️ Отменить</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && !loading && <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Бронирования не найдены</div>}
      </div>

      {pagination.pages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => fetchBookings(pagination.page - 1)} disabled={pagination.page === 1} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}>← Назад</button>
          <span style={{ padding: '8px 16px', color: '#64748b' }}>Стр. {pagination.page} из {pagination.pages}</span>
          <button onClick={() => fetchBookings(pagination.page + 1)} disabled={pagination.page === pagination.pages} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer' }}>Вперёд →</button>
        </div>
      )}

      {/* Модалка создания */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px' }}>➕ Новая бронь</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isAdmin && (
                <input type="number" placeholder="ID пользователя (опционально)" value={formData.user_id || ''} onChange={e => setFormData(f => ({ ...f, user_id: e.target.value }))} style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              )}
              <input type="number" placeholder="ID компьютера *" value={formData.computer_id} onChange={e => setFormData(f => ({ ...f, computer_id: e.target.value }))} required style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="datetime-local" value={formData.start_time} onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))} required style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                <input type="datetime-local" value={formData.end_time} onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))} required style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              </div>
              <textarea placeholder="Цель бронирования" value={formData.purpose} onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))} rows={3} style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>Отмена</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>💾 Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}