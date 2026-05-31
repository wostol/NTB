// src/pages/user/Profile.jsx
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function UserProfile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });

  const handleSave = () => {
    // 🔧 Здесь будет: api.patch('/auth/me', formData)
    alert('Данные обновлены!');
    setEditing(false);
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>👤 Мой профиль</h2>
      
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', maxWidth: 500 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Имя пользователя</label>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, fontWeight: 500 }}>@{user?.username}</div>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Полное имя</label>
          {editing ? (
            <input value={formData.full_name} onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          ) : (
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6 }}>{formData.full_name}</div>
          )}
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#475569', fontSize: '0.9rem' }}>Email</label>
          {editing ? (
            <input value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          ) : (
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6 }}>{formData.email || '—'}</div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          {editing ? (
            <>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>💾 Сохранить</button>
              <button onClick={() => setEditing(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>✕ Отмена</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>✏️ Редактировать</button>
          )}
        </div>
        
        <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
        
        <button onClick={logout} style={{ width: '100%', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>🚪 Выйти из аккаунта</button>
      </div>
    </div>
  );
}