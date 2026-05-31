// frontend/src/pages/admin/Users/UserList.jsx
import { useState, useEffect } from 'react';
import { usersAPI } from '../../../services/users';
import { useAuth } from '../../../hooks/useAuth';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const { user: currentUser } = useAuth();

  // Загрузка пользователей
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...(search && { search }),
        ...(roleFilter !== 'all' && { role_id: roleFilter }),
        ...(statusFilter !== 'all' && { is_active: statusFilter === 'active' })
      };
      
      const data = await usersAPI.getAll(params);
      setUsers(data.users);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch users:', err);
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Поиск по Enter
  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchUsers(1);
  };

  // При смене фильтров — сброс на 1 страницу
  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, statusFilter]);

  // Блок/разблок
  const handleToggleStatus = async (id, username) => {
    if (!window.confirm(`Заблокировать пользователя ${username}?`)) return;
    try {
      await usersAPI.toggleStatus(id);
      fetchUsers(pagination.page); // Обновить список
    } catch (err) {
      alert('Ошибка обновления статуса');
    }
  };

  // Удаление
  const handleDelete = async (id, username) => {
    if (!window.confirm(`Удалить пользователя ${username}? Это действие необратимо!`)) return;
    try {
      await usersAPI.delete(id);
      fetchUsers(pagination.page);
    } catch (err) {
      alert('Ошибка удаления');
    }
  };

  // Хелперы
  const getRoleLabel = (roleId) => roleId === 2 ? '👑 Админ' : '👤 Пользователь';
  const getRoleColor = (roleId) => roleId === 2 
    ? { bg: '#e0f2fe', color: '#0369a1' } 
    : { bg: '#f1f5f9', color: '#475569' };
  
  const getStatusBadge = (isActive) => isActive
    ? { bg: '#dcfce7', color: '#166534', text: 'Активен' }
    : { bg: '#fee2e2', color: '#991b1b', text: 'Заблокирован' };

  if (loading && users.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Загрузка пользователей...</div>;
  }

  return (
    <div>
      {/* 🔝 Шапка с фильтрами */}
      <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>👥 Управление пользователями</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по имени, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', width: 220 }}
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="all">Все роли</option>
            <option value="1">👤 Пользователи</option>
            <option value="2">👑 Администраторы</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>
          ❌ {error}
          <button onClick={() => { setError(null); fetchUsers(pagination.page); }} style={{ marginLeft: 12, background: 'none', border: 'none', cursor: 'pointer' }}>🔄 Повторить</button>
        </div>
      )}

      {/* 📊 Таблица */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Пользователь</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Роль</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Статус</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Последний вход</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px', color: '#64748b', fontFamily: 'monospace' }}>#{u.user_id}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>@{u.username}{u.email && ` • ${u.email}`}</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                    background: getRoleColor(u.role_id).bg,
                    color: getRoleColor(u.role_id).color
                  }}>
                    {getRoleLabel(u.role_id)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600,
                    background: getStatusBadge(u.is_active).bg,
                    color: getStatusBadge(u.is_active).color
                  }}>
                    {getStatusBadge(u.is_active).text}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem' }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString('ru-RU') : '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {/* Нельзя блокировать самого себя */}
                  {u.user_id !== currentUser?.user_id && (
                    <button onClick={() => handleToggleStatus(u.user_id, u.username)} style={{
                      padding: '6px 10px', marginRight: 6, borderRadius: 6, border: '1px solid #cbd5e1',
                      background: u.is_active ? '#fff1f2' : '#f0fdf4',
                      color: u.is_active ? '#be123c' : '#166534',
                      cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      {u.is_active ? '🚫 Блок' : '✅ Разблок'}
                    </button>
                  )}
                  {/* Нельзя удалить самого себя */}
                  {u.user_id !== currentUser?.user_id && (
                    <button onClick={() => handleDelete(u.user_id, u.username)} style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca',
                      background: '#fff1f2', color: '#be123c',
                      cursor: 'pointer', fontSize: '0.85rem'
                    }}>
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Пользователи не найдены
          </div>
        )}
      </div>

      {/* 📄 Пагинация */}
      {pagination.pages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button 
            onClick={() => fetchUsers(pagination.page - 1)}
            disabled={pagination.page === 1}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Назад
          </button>
          <span style={{ padding: '8px 16px', color: '#64748b' }}>
            Страница {pagination.page} из {pagination.pages}
          </span>
          <button 
            onClick={() => fetchUsers(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer' }}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}