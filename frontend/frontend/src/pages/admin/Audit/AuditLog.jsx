// src/pages/admin/Audit/AuditLog.jsx
import { useState, useEffect } from 'react';

//  Моковые данные (имитация таблицы auditlog из Prisma)
const MOCK_LOGS = [
  {
    log_id: 1,
    user_id: 2,
    user_name: 'Иванов Иван',
    action: 'CREATE_BOOKING',
    entity_id: 101,
    created_at: '2026-05-30T10:15:00',
    details: { booking_id: 101, computer_id: 1, start_time: '10:00', end_time: '12:00', event: 'booking.created' }
  },
  {
    log_id: 2,
    user_id: 3,
    user_name: 'Петров Петр',
    action: 'CANCEL_BOOKING',
    entity_id: 98,
    created_at: '2026-05-30T09:45:00',
    details: { booking_id: 98, computer_id: 3, reason: 'user_cancelled', event: 'booking.cancelled' }
  },
  {
    log_id: 3,
    user_id: 1,
    user_name: 'Администратор',
    action: 'CREATE_BOOKING',
    entity_id: 102,
    created_at: '2026-05-29T18:20:00',
    details: { booking_id: 102, computer_id: 4, start_time: '09:00', end_time: '18:00', event: 'booking.created' }
  },
  {
    log_id: 4,
    user_id: 4,
    user_name: 'Сидорова Анна',
    action: 'CREATE_BOOKING',
    entity_id: 103,
    created_at: '2026-05-29T14:10:00',
    details: { booking_id: 103, computer_id: 2, start_time: '14:00', end_time: '16:00', event: 'booking.created' }
  }
];

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // Имитация загрузки
  useEffect(() => {
    setTimeout(() => {
      setLogs(MOCK_LOGS);
      setLoading(false);
    }, 500);
  }, []);

  // Фильтрация
  const filteredLogs = logs.filter(log => 
    filter === 'all' ? true : log.action === filter
  );

  const toggleDetails = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('JSON скопирован!');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка логов...</div>;

  return (
    <div>
      {/* 🔝 Шапка */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🔍 Аудит-лог системы</h2>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
        >
          <option value="all">Все действия</option>
          <option value="CREATE_BOOKING">Создание броней</option>
          <option value="CANCEL_BOOKING">Отмена броней</option>
        </select>
      </div>

      {/* 📊 Таблица */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Дата</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Пользователь</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Действие</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Объект (ID)</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>Детали</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              // ✅ Используем <> вместо <React.Fragment> — не требует импорта React
              <>
                {/* Основная строка */}
                <tr 
                  key={log.log_id}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => toggleDetails(log.log_id)}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('ru-RU', { 
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                    })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{log.user_name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                      background: log.action === 'CREATE_BOOKING' ? '#dcfce7' : '#fee2e2',
                      color: log.action === 'CREATE_BOOKING' ? '#166534' : '#991b1b'
                    }}>
                      {log.action === 'CREATE_BOOKING' ? '🟢 Создание' : '🔴 Отмена'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>
                    Booking #{log.entity_id}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
                      {expandedId === log.log_id ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>

                {/* Раскрывающаяся строка с JSON */}
                {expandedId === log.log_id && (
                  <tr>
                    <td colSpan="5" style={{ padding: '0 16px 16px', background: '#f8fafc' }}>
                      <div style={{ 
                        background: '#1e293b', 
                        color: '#e2e8f0', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem',
                        position: 'relative'
                      }}>
                        <button 
                          onClick={() => copyToClipboard(JSON.stringify(log.details, null, 2))}
                          style={{ 
                            position: 'absolute', top: 8, right: 8, 
                            background: '#334155', border: 'none', color: 'white', 
                            padding: '4px 8px', borderRadius: 4, cursor: 'pointer', 
                            fontSize: '0.75rem' 
                          }}
                        >
                          📋 Копировать
                        </button>
                        <pre style={{ margin: 0, overflowX: 'auto' }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Нет записей в журнале за выбранный период
          </div>
        )}
      </div>
    </div>
  );
}