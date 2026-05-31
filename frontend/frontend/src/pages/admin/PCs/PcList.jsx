// frontend/src/pages/admin/PCs/PcList.jsx
import { useState, useEffect } from 'react';
import { pcsAPI } from '../../../services/pcs';
import { useAuth } from '../../../hooks/useAuth';

export default function PcList() {
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingPc, setEditingPc] = useState(null);
  const [formData, setFormData] = useState({
    serial_number: '',
    floor: '',
    room: '',
    status: 'available',
    config: { cpu: '', ram_gb: '', storage_gb: '', gpu: '', os: '' }
  });

  const { user } = useAuth();
  const isAdmin = user?.role_id === 2 || user?.roleId === 2;

  // Загрузка компьютеров
  const fetchComputers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (floorFilter !== 'all') params.floor = floorFilter;
      if (search) params.search = search;
      
      const data = await pcsAPI.getAll(params);
      setComputers(data);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch PCs:', err);
      setError('Не удалось загрузить компьютеры');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComputers();
  }, [statusFilter, floorFilter]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchComputers();
  };

  // Открытие модалки
  const openModal = (pc = null) => {
    if (pc) {
      setEditingPc(pc);
      setFormData({
        serial_number: pc.serial_number,
        floor: pc.floor,
        room: pc.room,
        status: pc.status,
        config: pc.config || {}
      });
    } else {
      setEditingPc(null);
      setFormData({
        serial_number: '',
        floor: '',
        room: '',
        status: 'available',
        config: {}
      });
    }
    setShowModal(true);
  };

  // Сохранение
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        floor: parseInt(formData.floor),
        config: Object.fromEntries(
          Object.entries(formData.config).filter(([_, v]) => v !== '')
        )
      };
      
      if (editingPc) {
        await pcsAPI.update(editingPc.computer_id, payload);
      } else {
        await pcsAPI.create(payload);
      }
      setShowModal(false);
      fetchComputers();
    } catch (err) {
      console.error('❌ Save error:', err);
      alert(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  // Удаление
  const handleDelete = async (id, serial) => {
    if (!window.confirm(`Удалить компьютер ${serial}?`)) return;
    try {
      await pcsAPI.delete(id);
      fetchComputers();
    } catch (err) {
      console.error('❌ Delete error:', err);
      alert('Ошибка удаления');
    }
  };

  // Бейдж статуса
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

  if (loading && computers.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка компьютеров...</div>;
  }

  return (
    <div>
      {/* 🔝 Шапка */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>💻 Компьютеры</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Поиск..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', width: 180 }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="all">Все статусы</option>
            <option value="available">Свободные</option>
            <option value="booked">Занятые</option>
            <option value="maintenance">В ремонте</option>
          </select>
          <select value={floorFilter} onChange={e => setFloorFilter(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="all">Все этажи</option>
            <option value="1">1 этаж</option>
            <option value="2">2 этаж</option>
            <option value="3">3 этаж</option>
          </select>
          {isAdmin && (
            <button onClick={() => openModal()} style={{
              padding: '8px 16px', background: '#3b82f6', color: 'white',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
            }}>
              ➕ Добавить ПК
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>
          ❌ {error}
          <button onClick={() => { setError(null); fetchComputers(); }} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer' }}>🔄 Повторить</button>
        </div>
      )}

      {/* 📊 Таблица */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>ПК</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Расположение</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Статус</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Конфигурация</th>
              {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {computers.map(pc => (
              <tr key={pc.computer_id} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>#{pc.computer_id}</td>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{pc.serial_number}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div>Этаж {pc.floor}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Комната {pc.room}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>{getStatusBadge(pc.status)}</td>
                <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                  {pc.config?.cpu && <span>CPU: {pc.config.cpu}<br/></span>}
                  {pc.config?.ram_gb && <span>RAM: {pc.config.ram_gb}GB<br/></span>}
                  {pc.config?.gpu && <span>GPU: {pc.config.gpu}</span>}
                  {!pc.config?.cpu && !pc.config?.ram_gb && !pc.config?.gpu && '—'}
                </td>
                {isAdmin && (
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openModal(pc)} style={{
                      padding: '6px 10px', marginRight: 6, borderRadius: 6, border: '1px solid #cbd5e1',
                      background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(pc.computer_id, pc.serial_number)} style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca',
                      background: '#fff1f2', color: '#be123c', cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {computers.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Компьютеры не найдены
          </div>
        )}
      </div>

      {/* 🔧 Модалка */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px' }}>{editingPc ? '✏️ Редактировать' : '➕ Добавить'} компьютер</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>Серийный номер *</label>
                <input type="text" value={formData.serial_number} onChange={e => setFormData(prev => ({ ...prev, serial_number: e.target.value }))} required disabled={!!editingPc} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>Этаж *</label>
                  <input type="number" value={formData.floor} onChange={e => setFormData(prev => ({ ...prev, floor: e.target.value }))} required min="1" max="10" style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>Комната *</label>
                  <input type="text" value={formData.room} onChange={e => setFormData(prev => ({ ...prev, room: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9rem' }}>Статус</label>
                <select value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <option value="available">Свободен</option>
                  <option value="booked">Занят</option>
                  <option value="maintenance">В ремонте</option>
                </select>
              </div>
              
              {/* Конфигурация */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', fontWeight: 500 }}>⚙️ Конфигурация</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input type="text" placeholder="CPU (напр. Intel i5)" value={formData.config.cpu || ''} onChange={e => setFormData(prev => ({ ...prev, config: { ...prev.config, cpu: e.target.value } }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  <input type="number" placeholder="RAM (GB)" value={formData.config.ram_gb || ''} onChange={e => setFormData(prev => ({ ...prev, config: { ...prev.config, ram_gb: e.target.value ? parseInt(e.target.value) : '' } }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="GPU (напр. GTX 1650)" value={formData.config.gpu || ''} onChange={e => setFormData(prev => ({ ...prev, config: { ...prev.config, gpu: e.target.value } }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                  <input type="text" placeholder="OS (напр. Windows 11)" value={formData.config.os || ''} onChange={e => setFormData(prev => ({ ...prev, config: { ...prev.config, os: e.target.value } }))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>Отмена</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>💾 Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}