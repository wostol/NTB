// src/pages/user/Home.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// 🔧 Моковые данные компьютеров
const MOCK_COMPUTERS = [
  { computer_id: 1, serial_number: 'PC-001', floor: 1, room: '101', status: 'available', config: { cpu: 'Intel i5', ram: '16GB', gpu: 'GTX 1650' } },
  { computer_id: 2, serial_number: 'PC-002', floor: 1, room: '101', status: 'booked', config: { cpu: 'Intel i7', ram: '32GB', gpu: 'RTX 3060' } },
  { computer_id: 3, serial_number: 'PC-003', floor: 2, room: '205', status: 'available', config: { cpu: 'AMD Ryzen 5', ram: '16GB', gpu: 'RX 6600' } },
  { computer_id: 4, serial_number: 'PC-004', floor: 2, room: '205', status: 'maintenance', config: { cpu: 'Intel i3', ram: '8GB', gpu: 'Integrated' } },
  { computer_id: 5, serial_number: 'PC-005', floor: 3, room: '310', status: 'available', config: { cpu: 'Intel i7', ram: '32GB', gpu: 'RTX 4070' } },
  { computer_id: 6, serial_number: 'PC-006', floor: 3, room: '310', status: 'available', config: { cpu: 'AMD Ryzen 7', ram: '64GB', gpu: 'RTX 4080' } },
];

export default function UserHome() {
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('available');
  const [selectedPc, setSelectedPc] = useState(null);
  const [bookingTime, setBookingTime] = useState({ start: '', end: '' });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Загрузка данных
  useEffect(() => {
    setTimeout(() => {
      setComputers(MOCK_COMPUTERS);
      setLoading(false);
    }, 300);
  }, []);

  // Фильтрация
  const filteredComputers = computers.filter(pc => {
    const floorMatch = filterFloor === 'all' || pc.floor === parseInt(filterFloor);
    const statusMatch = filterStatus === 'all' || pc.status === filterStatus;
    return floorMatch && statusMatch;
  });

  // Обработка бронирования
  const handleBook = () => {
    if (!selectedPc || !bookingTime.start || !bookingTime.end) {
      alert('Выберите компьютер и время');
      return;
    }
    
    // 🔧 Здесь будет API-запрос: api.post('/bookings', { ... })
    alert(`✅ Бронь создана!\nКомпьютер: ${selectedPc.serial_number}\nВремя: ${bookingTime.start} - ${bookingTime.end}`);
    
    // Сброс формы
    setSelectedPc(null);
    setBookingTime({ start: '', end: '' });
    
    // Переход к моим броням
    navigate('/user/bookings');
  };

  const getStatusBadge = (status) => {
    const styles = {
      available: { bg: '#dcfce7', color: '#166534', text: 'Свободен' },
      booked: { bg: '#dbeafe', color: '#1e40af', text: 'Занят' },
      maintenance: { bg: '#fee2e2', color: '#991b1b', text: 'Ремонт' },
    };
    const s = styles[status] || styles.maintenance;
    return <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600, background: s.bg, color: s.color }}>{s.text}</span>;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка компьютеров...</div>;

  return (
    <div>
      {/* 🔝 Приветствие */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>👋 Привет, {user?.full_name || user?.username}!</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b' }}>Выберите компьютер для бронирования</p>
      </div>

      {/* 🔍 Фильтры */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <option value="all">Все этажи</option>
          <option value="1">1 этаж</option>
          <option value="2">2 этаж</option>
          <option value="3">3 этаж</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <option value="available">Только свободные</option>
          <option value="all">Все статусы</option>
        </select>
      </div>

      {/* 💻 Сетка компьютеров */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {filteredComputers.map(pc => (
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
              boxShadow: selectedPc?.computer_id === pc.computer_id ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => { if(pc.status === 'available') e.currentTarget.style.borderColor = '#94a3b8'; }}
            onMouseOut={e => { if(pc.status === 'available' && selectedPc?.computer_id !== pc.computer_id) e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>{pc.serial_number}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Этаж {pc.floor}, комната {pc.room}</p>
              </div>
              {getStatusBadge(pc.status)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.85rem', color: '#475569', marginBottom: 12 }}>
              <div><strong>CPU:</strong> {pc.config?.cpu}</div>
              <div><strong>RAM:</strong> {pc.config?.ram}</div>
              <div><strong>GPU:</strong> {pc.config?.gpu}</div>
            </div>
            
            {pc.status === 'available' && (
              <button style={{
                width: '100%', padding: 8, background: '#3b82f6', color: 'white',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
              }}>
                {selectedPc?.computer_id === pc.computer_id ? '✓ Выбран' : 'Забронировать'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 📅 Форма бронирования (появляется при выборе ПК) */}
      {selectedPc && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0',
          position: 'sticky', bottom: 20, boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>📅 Бронь: <strong>{selectedPc.serial_number}</strong></h3>
            <button onClick={() => setSelectedPc(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
          </div>
          
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem', color: '#475569' }}>Начало</label>
              <input type="datetime-local" value={bookingTime.start} onChange={e => setBookingTime(prev => ({ ...prev, start: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem', color: '#475569' }}>Конец</label>
              <input type="datetime-local" value={bookingTime.end} onChange={e => setBookingTime(prev => ({ ...prev, end: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
            </div>
            <button onClick={handleBook} style={{
              padding: '10px 24px', background: '#10b981', color: 'white', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
            }}>
              ✅ Подтвердить бронь
            </button>
          </div>
        </div>
      )}
    </div>
  );
}