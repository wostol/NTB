// src/pages/user/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

// ===== Базовые URL из .env =====
const PCS_API_URL = import.meta.env.VITE_PCS_API_URL || 'http://localhost:3002/api';
const BOOKINGS_API_URL = import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:3003/api'; // ✅ НОВОЕ!
const PREFS_API_URL = import.meta.env.VITE_PREFS_API_URL || 'http://localhost:3005/api';

// ===== Хелпер для запросов к PC-service (только чтение компьютеров) =====
const pcsApi = axios.create({ baseURL: PCS_API_URL });
pcsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Хелпер для запросов к Booking-service (бронирования)
const bookingsApi = axios.create({ baseURL: BOOKINGS_API_URL });
bookingsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Хелпер для запросов к Preferences-service (избранное) =====
const prefsApi = axios.create({ baseURL: PREFS_API_URL });
prefsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Компонент кнопки-сердечка =====
function HeartButton({ computer_id, onToggle }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await prefsApi.get('/preferences/favorites');
        const found = res.data.some(pc => pc.computer_id === computer_id);
        setIsFavorite(found);
      } catch {
        setIsFavorite(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [computer_id]);

  const toggle = async (e) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await prefsApi.delete(`/preferences/favorites/${computer_id}`);
      } else {
        await prefsApi.post('/preferences/favorites', { computer_id });
      }
      setIsFavorite(!isFavorite);
      if (onToggle) onToggle(computer_id, !isFavorite);
    } catch (err) {
      console.error('❌ Favorite toggle error:', err);
      alert('Не удалось обновить избранное');
    }
  };

  if (loading) return <span style={{ cursor: 'wait', fontSize: '1.2rem' }}>⏳</span>;

  return (
    <button
      onClick={toggle}
      title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.3rem',
        padding: '4px 8px',
        transition: 'transform 0.1s',
        color: isFavorite ? '#ef4444' : '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}

export default function UserHome() {
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('available');
  const [selectedPc, setSelectedPc] = useState(null);
  const [bookingTime, setBookingTime] = useState({ start: '', end: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Загрузка компьютеров с бэкенда (через pc-service, порт 3002)
  useEffect(() => {
    const fetchComputers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await pcsApi.get('/pcs', {
          params: { status: filterStatus === 'all' ? undefined : filterStatus }
        });
        setComputers(res.data);
      } catch (err) {
        console.error('❌ Failed to fetch computers:', err);
        setError('Не удалось загрузить список компьютеров');
      } finally {
        setLoading(false);
      }
    };

    fetchComputers();
  }, [filterStatus]);

  // Фильтрация на фронтенде (по этажу)
  const filteredComputers = computers.filter(pc => {
    const floorMatch = filterFloor === 'all' || pc.floor === parseInt(filterFloor);
    return floorMatch;
  });

  // ✅ Обработка бронирования (через booking-service, порт 3003)
  const handleBook = async () => {
    if (!selectedPc || !bookingTime.start || !bookingTime.end) {
      alert('Выберите компьютер и время');
      return;
    }

    const startDate = new Date(bookingTime.start);
    const endDate = new Date(bookingTime.end);
    
    if (endDate <= startDate) {
      alert('Время окончания должно быть позже времени начала');
      return;
    }

    try {
      setBookingLoading(true);
      
      // ✅ Запрос на ПРАВИЛЬНЫЙ порт (3003) через bookingsApi
      const response = await bookingsApi.post('/bookings', {
        computer_id: selectedPc.computer_id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        purpose: 'Бронь через пользовательский интерфейс',
        booking_type: 'standard'
      });

      alert(`✅ Бронь создана!\nID: ${response.data.booking_id}\nКомпьютер: ${selectedPc.serial_number}`);
      
      setSelectedPc(null);
      setBookingTime({ start: '', end: '' });
      
      // Обновляем статус компьютера в списке
      setComputers(prev => prev.map(pc => 
        pc.computer_id === selectedPc.computer_id 
          ? { ...pc, status: 'booked' } 
          : pc
      ));
      
      navigate('/user/bookings');
      
    } catch (err) {
      console.error('❌ Booking error:', err);
      const msg = err.response?.data?.error || 'Не удалось создать бронь';
      alert(`❌ Ошибка: ${msg}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      available: { bg: '#dcfce7', color: '#166534', text: 'Свободен' },
      booked: { bg: '#dbeafe', color: '#1e40af', text: 'Занят' },
      maintenance: { bg: '#fee2e2', color: '#991b1b', text: 'Ремонт' },
    };
    const s = styles[status] || styles.maintenance;
    return (
      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: s.bg, color: s.color }}>
        {s.text}
      </span>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка компьютеров...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>❌ {error}<br/><button onClick={() => window.location.reload()} style={{marginTop: 12, padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer'}}>🔄 Повторить</button></div>;

  return (
    <div>
      {/* 🔝 Приветствие */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>👋 Привет, {user?.full_name || user?.username}!</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>Выберите компьютер для бронирования</p>
      </div>

      {/* 🔍 Фильтры */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white' }}>
          <option value="all">Все этажи</option>
          <option value="1">1 этаж</option>
          <option value="2">2 этаж</option>
          <option value="3">3 этаж</option>
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setFilterFloor('all'); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white' }}>
          <option value="available">Только свободные</option>
          <option value="all">Все статусы</option>
        </select>
        <button onClick={() => { setFilterFloor('all'); setFilterStatus('available'); }} style={{ padding: '8px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          🔄 Сбросить
        </button>
      </div>

      {/* 💻 Сетка компьютеров */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {filteredComputers.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#64748b' }}>
            Нет компьютеров по выбранным фильтрам
          </div>
        ) : filteredComputers.map(pc => (
          <div 
            key={pc.computer_id}
            onClick={() => pc.status === 'available' && setSelectedPc(pc)}
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              border: `2px solid ${selectedPc?.computer_id === pc.computer_id ? '#3b82f6' : '#e2e8f0'}`,
              cursor: pc.status === 'available' ? 'pointer' : 'not-allowed',
              opacity: pc.status !== 'available' ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: selectedPc?.computer_id === pc.computer_id ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}
            onMouseOver={e => { if(pc.status === 'available') e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseOut={e => { if(pc.status === 'available' && selectedPc?.computer_id !== pc.computer_id) e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            {/* ❤️ Кнопка избранного */}
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <HeartButton computer_id={pc.computer_id} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12, paddingRight: 24 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{pc.serial_number}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Этаж {pc.floor}, комната {pc.room}</p>
              </div>
              {getStatusBadge(pc.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.85rem', color: '#475569', marginBottom: 12 }}>
              <div><strong>CPU:</strong> {pc.config?.cpu || '—'}</div>
              <div><strong>RAM:</strong> {pc.config?.ram_gb ? `${pc.config.ram_gb}GB` : '—'}</div>
              <div><strong>GPU:</strong> {pc.config?.gpu || '—'}</div>
              <div><strong>OS:</strong> {pc.config?.os || '—'}</div>
            </div>
            
            {pc.status === 'available' && (
              <button style={{
                width: '100%', padding: 8, background: selectedPc?.computer_id === pc.computer_id ? '#2563eb' : '#3b82f6', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
              }}>
                {selectedPc?.computer_id === pc.computer_id ? '✓ Выбран' : 'Забронировать'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 📅 Форма бронирования */}
      {selectedPc && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0',
          position: 'sticky', bottom: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 10
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📅 Бронь: <strong>{selectedPc.serial_number}</strong></h3>
            <button onClick={() => setSelectedPc(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
          </div>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem', color: '#475569' }}>Начало</label>
              <input 
                type="datetime-local" 
                value={bookingTime.start} 
                onChange={e => setBookingTime(prev => ({ ...prev, start: e.target.value }))} 
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem', color: '#475569' }}>Конец</label>
              <input 
                type="datetime-local" 
                value={bookingTime.end} 
                onChange={e => setBookingTime(prev => ({ ...prev, end: e.target.value }))} 
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                min={bookingTime.start || new Date().toISOString().slice(0, 16)}
              />
            </div>
            <button 
              onClick={handleBook} 
              disabled={bookingLoading}
              style={{
                padding: '10px 24px', background: bookingLoading ? '#94a3b8' : '#10b981', color: 'white', border: 'none',
                borderRadius: 8, cursor: bookingLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '1rem',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {bookingLoading ? '⏳ Создаём...' : '✅ Подтвердить бронь'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}