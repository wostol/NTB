// frontend/src/pages/admin/Audit/AuditLog.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../hooks/useAuth';

const AUDIT_API_URL = import.meta.env.VITE_AUDIT_API_URL || 'http://localhost:3004/api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  const { user } = useAuth();

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('jwt_token');
      
      const params = { page, limit: 50 };
      if (filter !== 'all') params.action = filter;
      
      const res = await axios.get(`${AUDIT_API_URL}/audit`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      console.error('❌ Failed to fetch audit logs:', err);
      setError(err.response?.data?.error || 'Не удалось загрузить логи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filter]);

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

  const getActionStyle = (action) => {
    const map = {
      'BOOKING_CREATED': { bg: '#dcfce7', color: '#166534', label: '🟢 Создание брони' },
      'BOOKING_UPDATED': { bg: '#fef3c7', color: '#92400e', label: '🟡 Обновление брони' },
      'BOOKING_CANCELLED': { bg: '#fee2e2', color: '#991b1b', label: '🔴 Отмена брони' },
      'USER_LOGGED_IN': { bg: '#dbeafe', color: '#1e40af', label: '🔐 Вход' },
      'USER_REGISTERED': { bg: '#e0e7ff', color: '#3730a3', label: '📝 Регистрация' },
      'USER_STATUS_CHANGED': { bg: '#f3e8ff', color: '#6b21a8', label: '⚙️ Статус пользователя' },
      'USER_DELETED': { bg: '#fee2e2', color: '#991b1b', label: '🗑️ Удаление пользователя' },
      'USER_PROFILE_UPDATED': { bg: '#f3e8ff', color: '#6b21a8', label: '✏️ Профиль обновлён' },
      'PC_CREATED': { bg: '#dcfce7', color: '#166534', label: '💻 Добавлен ПК' },
      'PC_UPDATED': { bg: '#fef3c7', color: '#92400e', label: '✏️ Обновлён ПК' },
      'PC_DELETED': { bg: '#fee2e2', color: '#991b1b', label: '🗑️ Удалён ПК' },
    };
    return map[action] || { bg: '#f1f5f9', color: '#475569', label: action };
  };

  if (loading && logs.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка логов...</div>;
  }

  return (
    <div>
      {/* 🔝 Шапка */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>🔍 Аудит-лог системы</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            value={filter} 
            onChange={e => { setFilter(e.target.value); fetchLogs(1); }} 
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white' }}
          >
            <option value="all">Все действия</option>
            <option value="BOOKING_CREATED">🟢 Создание брони</option>
            <option value="BOOKING_UPDATED">🟡 Обновление брони</option>
            <option value="BOOKING_CANCELLED">🔴 Отмена брони</option>
            <option value="USER_LOGGED_IN">🔐 Вход</option>
            <option value="USER_REGISTERED">📝 Регистрация</option>
            <option value="PC_CREATED">💻 Добавлен ПК</option>
            <option value="PC_DELETED">🗑️ Удалён ПК</option>
          </select>
          <button onClick={() => fetchLogs(pagination.page)} style={{ 
            padding: '8px 16px', background: '#3b82f6', color: 'white', 
            border: 'none', borderRadius: 6, cursor: 'pointer' 
          }}>
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* ❌ Ошибка */}
      {error && (
        <div style={{ 
          padding: '12px 16px', background: '#fee2e2', color: '#991b1b', 
          borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 
        }}>
          <span>❌</span>
          <span>{error}</span>
          <button onClick={() => fetchLogs(pagination.page)} style={{ 
            marginLeft: 'auto', background: 'none', border: 'none', 
            cursor: 'pointer', fontWeight: 'bold', color: '#991b1b' 
          }}>
            🔄 Повторить
          </button>
        </div>
      )}

      {/* 📊 Таблица */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Дата</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Действие</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569' }}>Сущность</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>Детали</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const style = getActionStyle(log.action);
              const details = log.new_value || log.old_value || {};
              const rowKey = log.log_id?.toString() || `${log.created_at}-${log.action}-${log.entity_id}`;
              
              return (
                <React.Fragment key={rowKey}>
                  {/* Основная строка */}
                  <tr 
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => toggleDetails(log.log_id)}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {new Date(log.created_at).toLocaleString('ru-RU', { 
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                        background: style.bg, color: style.color
                      }}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569' }}>
                      {log.entity_type}#{log.entity_id || '—'}
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
                      <td colSpan="4" style={{ padding: '0 16px 16px', background: '#f8fafc' }}>
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
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(details, null, 2)); }}
                            style={{ 
                              position: 'absolute', top: 8, right: 8, 
                              background: '#334155', border: 'none', color: 'white', 
                              padding: '4px 8px', borderRadius: 4, cursor: 'pointer', 
                              fontSize: '0.75rem' 
                            }}
                          >
                            📋 Копировать
                          </button>
                          <pre style={{ margin: 0, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(details, null, 2)}
                          </pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {filteredLogs.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            {error ? 'Ошибка загрузки' : 'Нет записей в журнале за выбранный период'}
          </div>
        )}
      </div>

      {/* 📄 Пагинация */}
      {pagination.pages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button 
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page === 1}
            style={{ 
              padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', 
              background: 'white', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' 
            }}
          >
            ← Назад
          </button>
          <span style={{ padding: '8px 16px', color: '#64748b' }}>
            Стр. {pagination.page} из {pagination.pages}
          </span>
          <button 
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            style={{ 
              padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', 
              background: 'white', cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer' 
            }}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}