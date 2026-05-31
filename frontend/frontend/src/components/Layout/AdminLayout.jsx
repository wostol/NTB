import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function AdminLayout() {
  return (
    <div className="layout admin-layout">
      <Sidebar />
      <main className="layout-main">
        <Header />
        <div className="layout-content">
          {/* Здесь будут рендериться вложенные страницы админки */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}