// src/components/Layout/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  
  // 🔍 Диагностика: показываем всё на экране
  const rawRole = user?.role_id || user?.role;
  const roleId = Number(rawRole);
  const isAdminUser = roleId === 2; // 2 = админ, 1 = пользователь

  return (
    <aside className="sidebar">
      

      <div className="sidebar-logo">
        NTB Booking {isAdminUser ? '👑' : '👤'}
      </div>
      
      <nav>
        {isAdminUser ? (
          // === АДМИН МЕНЮ ===
          <>
            <NavLink to="/admin" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>📊 Дашборд</NavLink>
            <NavLink to="/admin/pcs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>💻 Компьютеры</NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>👥 Пользователи</NavLink>
            <NavLink to="/admin/bookings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>📅 Бронирования</NavLink>
            <NavLink to="/admin/audit" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>🔍 Аудит</NavLink>
          </>
        ) : (
          // === ПОЛЬЗОВАТЕЛЬ МЕНЮ ===
          <>
            <NavLink to="/user" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>🏠 Главная</NavLink>
            <NavLink to="/user/bookings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>📋 Мои брони</NavLink>
            <NavLink to="/user/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>👤 Профиль</NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}