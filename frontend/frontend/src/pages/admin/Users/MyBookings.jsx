// frontend/src/pages/user/MyBookings.jsx
import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/bookings';
import { pcsAPI } from '../../services/pcs';
import { useAuth } from '../../hooks/useAuth';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active'); // active | upcoming | past | all
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    computer_id: '',
    start_time: '',
    end_time: '',
    purpose: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();

  // Загрузка данных
  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем брони пользователя
      const params = { user_id: user.user_id };
      if (filter === 'active') params.status = 'active';
      else if (filter === 'upcoming') {
        params.status = 'confirmed,pending';
      } else if (filter === 'past') {
        params.status = 'completed,cancelled';
      }
      
      const bookingsData = await bookingsAPI.getAll(params);
      setBookings(bookingsData.bookings || []);
      
      // Загружаем доступные компьютеры для создания брони
      const pcsData = await pcsAPI.getAll({ status: 'available' });
      setComputers(pcsData || []);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, filter]);

  // Отмена брони
  const handleCancel = async (id) => {
    if (!window.confirm('Отменить это бронирование? Это действие нельзя отменить.')) return;
    try {
      await bookingsAPI.delete(id);
      setBookings(prev => prev.filter(b => b.booking_id !== id));
    } catch (err) {
      console.error('❌ Cancel error:', err);
      alert(err.response?.data?.error || 'Ошибка отмены брони');
    }
  };

  // Создание новой брони
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.computer_id || !formData.start_time || !formData.end_time) {
      alert('Заполните все обязательные поля');
      return;
    }
    if (new Date(formData.end_time) <= new Date(formData.start_time)) {
      alert('Время окончания должно быть позже времени начала');
      return;
    }
    
    try {
      setSubmitting(true);
      await bookingsAPI.create({
        ...formData,
        computer_id: parseInt(formData.computer_id),
        booking_type: 'standard'
      });
      setShowModal(false);
      setFormData({ computer_id: '', start_time: '', end_time: '', purpose: '' });
      fetchData(); // Обновить список
    } catch (err) {
      console.error('❌ Create error:', err);
      alert(err.response?.data?.error || 'Ошибка создания брони');
    } finally {
      setSubmitting(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  // Статус брони
  const getStatusConfig = (status) => {
    const map = {
      active: { label: '🟢 Активно', bg: '#dcfce7', color: '#166534', border: '#86efac' },
      confirmed: { label: '🔵 Подтверждено', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
      pending: { label: '🟡 Ожидает', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
      completed: { label: '⚪ Завершено', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
      cancelled: { label: '🔴 Отменено', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
    };
    return map[status] || map.active;
  };

  // Скин для кнопок
  const btnBase = { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', transition: '0.2s' };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>⏳</div>
        Загрузка бронирований...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* 🔝 Шапка */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>📋 Мои бронирования</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Управляйте своими заявками на компьютеры</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          ...btnBase, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white',
          display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
        }}>
          ➕ Новая бронь
        </button>
      </div>

      {/* 🔍 Фильтры */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'active', label: '🟢 Активные' },
          { id: 'upcoming', label: '🔵 Предстоящие' },
          { id: 'past', label: '⚪ История' },
          { id: 'all', label: '📦 Все' }
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            ...btnBase,
            background: filter === f.id ? '#3b82f6' : '#f1f5f9',
            color: filter === f.id ? 'white' : '#475569',
            border: filter === f.id ? 'none' : '1px solid #cbd5e1'
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ❌ Ошибка */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>❌</span>
          <span>{error}</span>
          <button onClick={() => { setError(null); fetchData(); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🔄 Повторить</button>
        </div>
      )}

      {/* 📊 Список броней */}
      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f8fafc', borderRadius: 12, border: '2px dashed #cbd5e1' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
          <h3 style={{ margin: '0 0 8px', color: '#334155' }}>Нет бронирований</h3>
          <p style={{ margin: '0 0 16px', color: '#64748b' }}>
            {filter === 'active' ? 'У вас нет активных броней. Создайте новую!' : `В категории "${filter}" пока пусто.`}
          </p>
          <button onClick={() => setShowModal(true)} style={{ ...btnBase, background: '#3b82f6', color: 'white' }}>
            ➕ Создать бронь
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {bookings.map(b => {
            const status = getStatusConfig(b.status);
            const isCancellable = ['active', 'pending', 'confirmed'].includes(b.status);
            return (
              <div key={b.booking_id} style={{
                background: 'white', padding: '16px 20px', borderRadius: 12,
                border: `1px solid ${status.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between'
              }}>
                {/* Левая часть: инфо */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                      💻 {b.computer?.serial_number || `ПК #${b.computer_id}`}
                    </span>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                      background: status.bg, color: status.color
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.95rem', marginBottom: 4 }}>
                    📍 Этаж {b.computer?.floor}, комната {b.computer?.room}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    🕐 {formatDate(b.start_time)} — {formatDate(b.end_time)}
                  </div>
                  {b.purpose && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: '0.9rem', color: '#475569' }}>
                      📝 {b.purpose}
                    </div>
                  )}
                </div>

                {/* Правая часть: действия */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isCancellable && (
                    <button onClick={() => handleCancel(b.booking_id)} style={{
                      ...btnBase, background: '#fff1f2', color: '#be123c', border: '1px solid #fecaca'
                    }}>
                      🗑️ Отменить
                    </button>
                  )}
                  {b.status === 'completed' && (
                    <span style={{ color: '#64748b', fontSize: '0.9rem', alignSelf: 'center' }}>✓ Завершено</span>
                  )}
                  {b.status === 'cancelled' && (
                    <span style={{ color: '#991b1b', fontSize: '0.9rem', alignSelf: 'center' }}>✗ Отменено</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔧 Модалка создания брони */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>➕ Новая бронь</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Компьютер */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Компьютер *</label>
                <select value={formData.computer_id} onChange={e => setFormData(f => ({ ...f, computer_id: e.target.value }))} required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem' }}>
                  <option value="">Выберите компьютер</option>
                  {computers.map(pc => (
                    <option key={pc.computer_id} value={pc.computer_id}>
                      {pc.serial_number} — Э{pc.floor}, к{pc.room} {pc.config?.cpu ? `• ${pc.config.cpu}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Время */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Начало *</label>
                  <input type="datetime-local" value={formData.start_time} onChange={e => setFormData(f => ({ ...f, start_time: e.target.value }))} required
                    min={new Date().toISOString().slice(0, 16)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Окончание *</label>
                  <input type="datetime-local" value={formData.end_time} onChange={e => setFormData(f => ({ ...f, end_time: e.target.value }))} required
                    min={formData.start_time || new Date().toISOString().slice(0, 16)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Цель */}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '0.9rem' }}>Цель (необязательно)</label>
                <textarea value={formData.purpose} onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))} rows={3}
                  placeholder="Например: подготовка к экзамену, работа над проектом..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '1rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              {/* Кнопки */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                  style={{ ...btnBase, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                  Отмена
                </button>
                <button type="submit" disabled={submitting}
                  style={{ ...btnBase, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Создание...' : '💾 Создать бронь'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Стили для скроллбара (опционально) */}
      <style>{`
        @media (max-width: 640px) {
          [style*="flex-wrap"] { flex-direction: column; align-items: stretch !important; }
        }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          cursor: pointer; padding: 4px; margin-right: 4px;
        }
      `}</style>
    </div>
  );
}