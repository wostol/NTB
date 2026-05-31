// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

//  Моковые данные (заменишь на API позже)
const MOCK_STATS = {
  totalPcs: 24,
  availablePcs: 8,
  activeBookings: 12,
  totalUsers: 156,
  todayBookings: 18,
  cancelledToday: 2,
};

const MOCK_RECENT_ACTIVITY = [
  { id: 1, action: 'CREATE_BOOKING', user: 'Иванов Иван', computer: 'PC-005', time: '10:45', status: 'success' },
  { id: 2, action: 'CANCEL_BOOKING', user: 'Петров Петр', computer: 'PC-012', time: '10:30', status: 'warning' },
  { id: 3, action: 'USER_LOGIN', user: 'Сидорова Анна', computer: '-', time: '10:15', status: 'info' },
  { id: 4, action: 'PC_MAINTENANCE', user: 'Администратор', computer: 'PC-003', time: '09:50', status: 'neutral' },
  { id: 5, action: 'CREATE_BOOKING', user: 'Козлов Дмитрий', computer: 'PC-008', time: '09:30', status: 'success' },
];

const MOCK_CHART_DATA = [
  { hour: '08:00', value: 4 },
  { hour: '10:00', value: 12 },
  { hour: '12:00', value: 18 },
  { hour: '14:00', value: 22 },
  { hour: '16:00', value: 15 },
  { hour: '18:00', value: 6 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(MOCK_STATS);
  const [activity, setActivity] = useState(MOCK_RECENT_ACTIVITY);
  const [chartData] = useState(MOCK_CHART_DATA);
  const navigate = useNavigate();

  // Имитация загрузки
  useEffect(() => {
    // Здесь будет: api.get('/admin/stats').then(setStats)
  }, []);

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE_BOOKING': return '🟢';
      case 'CANCEL_BOOKING': return '🔴';
      case 'USER_LOGIN': return '🔵';
      case 'PC_MAINTENANCE': return '🟡';
      default: return '⚪';
    }
  };

  const getActionText = (action) => {
    switch(action) {
      case 'CREATE_BOOKING': return 'Создал бронь';
      case 'CANCEL_BOOKING': return 'Отменил бронь';
      case 'USER_LOGIN': return 'Вошёл в систему';
      case 'PC_MAINTENANCE': return 'Обслуживание ПК';
      default: return action;
    }
  };

  // Простой расчет высоты для "графика"
  const maxValue = Math.max(...chartData.map(d => d.value));

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
        {/* Мини-график */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#0f172a' }}>📈 Загрузка сегодня</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {chartData.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div 
                  style={{
                    width: '100%',
                    height: `${(item.value / maxValue) * 100}%`,
                    background: 'linear-gradient(180deg, #3b82f6, #60a5fa)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s'
                  }}
                  title={`${item.value} броней`}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

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
            {activity.map(item => (
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
                      Компьютер: <strong>{item.computer}</strong>
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

//  Вспомогательный компонент: карточка статистики
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

//  Вспомогательный компонент: кнопка действия
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