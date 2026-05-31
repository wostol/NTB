// src/components/Layout/UserLayout.jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function UserLayout() {
  return (
    <div className="layout user-layout">
      <Sidebar />
      <div className="layout-content">
        <Header role="user" />
        <main className="main-area">
          <Outlet /> {/* Здесь рендерятся страницы /user/... */}
        </main>
      </div>
    </div>
  );
}