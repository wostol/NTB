import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  
  return (
    <header className="header">
      <div className="user-info">
        <span>{user?.full_name || user?.username || 'Пользователь'}</span>
        <span className="role-badge">{user?.role_id === 2 ? 'Админ' : 'Юзер'}</span>
      </div>
      <button className="logout-btn" onClick={logout}>Выйти</button>
    </header>
  );
}