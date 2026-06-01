// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ===== Базовые URL из .env или дефолты =====
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const PCS_API = import.meta.env.VITE_PCS_API_URL || 'http://localhost:3002/api';
const AUDIT_API = import.meta.env.VITE_AUDIT_API_URL || 'http://localhost:3004/api';
const BOOKINGS_API = import.meta.env.VITE_BOOKINGS_API_URL || 'http://localhost:3003/api';

// ===== Хелпер для авторизованных запросов =====
const api = (baseURL) => {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return instance;
};

const pcs = api(PCS_API);
const audit = api(AUDIT_API);
const auth = api(API_BASE);
const bookings = api(BOOKINGS_API);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPcs: 0, availablePcs: 0, activeBookings: 0, totalUsers: 0,
    todayBookings: 0, cancelledToday: 0, loading: true
  });
  const [activity, setActivity] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Загрузка всех данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        // 1. Статистика по ПК (из pc-service)
        const pcsRes = await pcs.get('/pcs');
        const allPcs = pcsRes.data;
        const availablePcs = allPcs.filter(pc => pc.status === 'available').length;

        // 2. Статистика по броням — ✅ ИСПРАВЛЕНО: считаем ВСЕ активные брони
        // Сначала получаем ВСЕ активные брони (без фильтра по дате) для счётчика
        const allActiveRes = await bookings.get('/bookings', {
          params: { status: 'active', limit: 1000 }
        });
        const allActiveBookings = allActiveRes.data.bookings || allActiveRes.data || [];
        const activeBookingsCount = allActiveBookings.length;

        // Отдельно: брони на сегодня (для графика и статистики "сегодня")
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayBookingsRes = await bookings.get('/bookings', {
          params: { date: today.toISOString().split('T')[0], limit: 100 }
        });
        const todayBookings = todayBookingsRes.data.bookings || todayBookingsRes.data || [];
        const cancelledToday = todayBookings.filter(b => b.status === 'cancelled').length;

        // 3. Количество пользователей (только админ)
        let totalUsers = 0;
        try {
          const usersRes = await auth.get('/admin/users', { params: { limit: 1 } });
          totalUsers = usersRes.data.pagination?.total || 0;
        } catch {
          totalUsers = 0;
        }

        setStats({
          totalPcs: allPcs.length,
          availablePcs,
          activeBookings: activeBookingsCount,  // ✅ Теперь показывает ВСЕ активные брони
          totalUsers,
          todayBookings: todayBookings.length,
          cancelledToday,
          loading: false
        });

        // 4. График: бронирования по часам сегодня (оставляем как было)
        const hourly = {};
        todayBookings.forEach(b => {
          const hour = new Date(b.start_time).getHours();
          const key = `${hour.toString().padStart(2, '0')}:00`;
          hourly[key] = (hourly[key] || 0) + 1;
        });
        const chart = Object.entries(hourly)
          .map(([hour, value]) => ({ hour, value }))
          .sort((a, b) => a.hour.localeCompare(b.hour));
        setChartData(chart.length ? chart : [{ hour: '08:00', value: 0 }]);

        // 5. Последние события из аудита
        const auditRes = await audit.get('/audit', { params: { limit: 5 } });
        const logs = auditRes.data.logs || [];
        setActivity(logs.map(log => ({
          id: log.log_id,
          action: log.action,
          user: log.user_name || `User #${log.user_id}`,
          computer: log.entity_type === 'Computer' ? `PC #${log.entity_id}` : 
                   log.entity_type === 'Booking' ? `Booking #${log.entity_id}` : '-',
          time: new Date(log.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          status: log.action.includes('CREATE') ? 'success' :
                  log.action.includes('CANCEL') ? 'warning' :
                  log.action.includes('LOGIN') ? 'info' : 'neutral'
        })));

      } catch (err) {
        console.error('❌ Dashboard load error:', err);
        setError('Не удалось загрузить данные');
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadData();
    // Автообновление каждые 60 секунд
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getActionIcon = (action) => {
    switch(action) {
      case 'BOOKING_CREATED': return '🟢';
      case 'BOOKING_CANCELLED': return '🔴';
      case 'USER_LOGGED_IN': return '🔵';
      case 'PC_CREATED': case 'PC_UPDATED': return '🟡';
      case 'USER_REGISTERED': return '🟣';
      default: return '⚪';
    }
  };

  const getActionText = (action) => {
    switch(action) {
      case 'BOOKING_CREATED': return 'Создал бронь';
      case 'BOOKING_CANCELLED': return 'Отменил бронь';
      case 'BOOKING_UPDATED': return 'Обновил бронь';
      case 'USER_LOGGED_IN': return 'Вошёл в систему';
      case 'USER_REGISTERED': return 'Зарегистрировался';
      case 'PC_CREATED': return 'Добавил ПК';
      case 'PC_UPDATED': return 'Обновил ПК';
      case 'PC_DELETED': return 'Удалил ПК';
      default: return action.replace(/_/g, ' ').toLowerCase();
    }
  };

  if (stats.loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Загрузка панели...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#dc2626', marginBottom: 16 }}>❌ {error}</div>
        <button onClick={() => window.location.reload()} style={{
          padding: '8px 16px', background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer'
        }}>🔄 Попробовать снова</button>
      </div>
    );
  }

  const maxValue = chartData.length ? Math.max(...chartData.map(d => d.value), 1) : 1;

  return (
    <div>
      {/* 🔝 Заголовок */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>📊 Панель управления</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* 📈 Карточки статистики */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 32 
      }}>
        <StatCard 
          title="Всего компьютеров" 
          value={stats.totalPcs} 
          icon="💻" 
          color="#3b82f6"
          onClick={() => navigate('/admin/pcs')}
        />
        <StatCard 
          title="Свободно сейчас" 
          value={stats.availablePcs} 
          icon="✅" 
          color="#10b981"
          onClick={() => navigate('/admin/pcs')}
        />
        <StatCard 
          title="Активные брони" 
          value={stats.activeBookings} 
          icon="📅" 
          color="#f59e0b"
          onClick={() => navigate('/admin/bookings')}
        />
        <StatCard 
          title="Пользователей" 
          value={stats.totalUsers} 
          icon="👥" 
          color="#8b5cf6"
          onClick={() => navigate('/admin/users')}
        />
      </div>

      {/* 📊 График загрузки + Активность */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 24,
        marginBottom: 32
      }}>
        

        {/* Последние события */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>⚡ Последние события</h3>
            <button 
              onClick={() => navigate('/admin/audit')}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
            >
              Все логи →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>Нет недавних событий</div>
            ) : activity.map(item => (
              <div 
                key={item.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{getActionIcon(item.action)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                    {item.user} <span style={{ color: '#64748b', fontWeight: 400 }}>{getActionText(item.action)}</span>
                  </div>
                  {item.computer !== '-' && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {item.action.includes('PC') ? 'Компьютер' : 'Бронь'}: <strong>{item.computer}</strong>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ⚡ Быстрые действия */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#0f172a' }}>⚡ Быстрые действия</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <ActionButton 
            label="➕ Создать бронь" 
            onClick={() => navigate('/admin/bookings')}
            primary
          />
          <ActionButton 
            label="💻 Добавить ПК" 
            onClick={() => navigate('/admin/pcs')}
          />
          <ActionButton 
            label="👥 Новый пользователь" 
            onClick={() => navigate('/admin/users')}
          />
          <ActionButton 
            label="📥 Экспорт отчёта" 
            onClick={() => alert('Функция в разработке')}
          />
        </div>
      </div>
    </div>
  );
}

// ===== Вспомогательные компоненты =====

function StatCard({ title, value, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #e2e8f0',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.1s, box-shadow 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
      onMouseOver={e => { if(onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}}
      onMouseOut={e => { if(onClick) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{title}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
      <div style={{ 
        height: '3px', 
        background: `linear-gradient(90deg, ${color}, transparent)`, 
        borderRadius: '2px', 
        marginTop: 12 
      }} />
    </div>
  );
}

function ActionButton({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        borderRadius: 8,
        border: primary ? 'none' : '1px solid #cbd5e1',
        background: primary ? '#3b82f6' : 'white',
        color: primary ? 'white' : '#1e293b',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.95rem'
      }}
      onMouseOver={e => {
        if (primary) {
          e.currentTarget.style.background = '#2563eb';
        } else {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.borderColor = '#94a3b8';
        }
      }}
      onMouseOut={e => {
        if (primary) {
          e.currentTarget.style.background = '#3b82f6';
        } else {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }
      }}
    >
      {label}
    </button>
  );
}