// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { UserHome, MyBookings, UserProfile } from './pages/user';
import Favorites from './pages/user/Favorites'; // ✅ ИМПОРТ НОВОЙ СТРАНИЦЫ

// Layouts
import AdminLayout from './components/Layout/AdminLayout';
import UserLayout from './components/Layout/UserLayout';

// Pages — Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages — Admin
import Dashboard from './pages/admin/Dashboard';
import { PcList } from './pages/admin/PCs';
import { UserList } from './pages/admin/Users';
import { BookingList } from './pages/admin/Bookings';
import { AuditLog } from './pages/admin/Audit';

// 404 и 403
const NotFound = () => (
  <div style={{padding:40,textAlign:'center'}}>
    <h1>404</h1><p>Страница не найдена</p>
    <button onClick={()=>window.history.back()}>← Назад</button>
  </div>
);
const Unauthorized = () => (
  <div style={{padding:40,textAlign:'center'}}>
    <h1>🔒 403</h1><p>Доступ запрещён</p>
    <button onClick={()=>window.history.back()}>← Назад</button>
  </div>
);

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: нормализация роли =====
// Преобразует любой формат роли из бэкенда в число: 1 = юзер, 2 = админ
const getRoleNumber = (user) => {
  if (!user) return null;
  
  // 1. Прямое число (role_id или roleId)
  if (user.role_id === 1 || user.role_id === 2) return user.role_id;
  if (user.roleId === 1 || user.roleId === 2) return user.roleId;
  
  // 2. Объект role { role_name: 'admin' / 'user' }
  if (user.role?.role_name) {
    const name = user.role.role_name.toLowerCase();
    if (name === 'admin') return 2;
    if (name === 'user') return 1;
  }
  
  // 3. Строка role: 'admin' / 'user'
  if (typeof user.role === 'string') {
    const name = user.role.toLowerCase();
    if (name === 'admin') return 2;
    if (name === 'user') return 1;
  }
  
  // 4. Fallback: пробуем привести к числу
  const fallback = Number(user.role_id || user.roleId || user.role);
  return [1, 2].includes(fallback) ? fallback : null;
};

// ===== Protected Route =====
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{padding:40}}>Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles.length > 0) {
    const userRole = getRoleNumber(user);
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.warn('🚫 Access denied:', { userRole, allowedRoles });
      return <Navigate to="/unauthorized" replace />;
    }
  }
  return children;
}

// ===== Redirect by role =====
function RedirectByRole() {
  const { user, loading } = useAuth();
  
  if (loading) return <div style={{padding:40}}>Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  const role = getRoleNumber(user);
  
  if (role === 2) return <Navigate to="/admin" replace />;
  if (role === 1) return <Navigate to="/user" replace />;
  
  return <Navigate to="/login" replace />;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5*60*1000 } }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Admin — ТОЛЬКО role = 2 (админ) */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={[2]}><AdminLayout /></ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="pcs" element={<PcList />} />
              <Route path="users" element={<UserList />} />
              <Route path="bookings" element={<BookingList />} />
              <Route path="audit" element={<AuditLog />} />
            </Route>
            
            {/* User — role = 1 (юзер) + админам тоже можно для тестов */}
            <Route path="/user" element={
              <ProtectedRoute allowedRoles={[1, 2]}><UserLayout /></ProtectedRoute>
            }>
              <Route index element={<UserHome />} />
              <Route path="favorites" element={<Favorites />} /> {/* ✅ НОВЫЙ МАРШРУТ! */}
              <Route path="bookings" element={<MyBookings />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>
            
            {/* Root redirect */}
            <Route path="/" element={<RedirectByRole />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}