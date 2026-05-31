import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function UserLayout() {
  return (
    <div className="layout user-layout">
      <Sidebar />
      <main className="layout-main">
        <Header />
        <div className="layout-content">
          {/* Здесь будут рендериться вложенные страницы пользователя */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}