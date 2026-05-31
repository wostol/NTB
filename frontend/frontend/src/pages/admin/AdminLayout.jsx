// src/components/Layout/AdminLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css'; // Убедись, что файл создан (см. ниже)

export default function AdminLayout() {
  return (
    <div className="layout admin-layout">
      <Sidebar />
      <div className="layout-content">
        <Header role="admin" />
        <main className="main-area">
          <Outlet /> {/* Здесь рендерятся страницы /admin/... */}
        </main>
      </div>
    </div>
  );
}