// src/pages/auth/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleRealLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();
    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔧 Кнопка: Войти как АДМИН (role_id: 2)
  const handleAdminDevLogin = () => {
    const fakeUser = {
      user_id: 99,
      username: 'dev_admin',
      full_name: 'Dev Admin',
      email: 'dev@localhost',
      role_id: 2,  // ✅ 2 = АДМИН
      is_active: true
    };
    localStorage.setItem('jwt_token', 'fake_admin_token');
    localStorage.setItem('dev_user', JSON.stringify(fakeUser));
    console.log('🚀 Dev ADMIN login:', fakeUser);
    window.location.href = '/admin';
  };

  // 🔧 Кнопка: Войти как ПОЛЬЗОВАТЕЛЬ (role_id: 1)
  const handleUserDevLogin = () => {
    const fakeUser = {
      user_id: 100,
      username: 'dev_user',
      full_name: 'Test User',
      email: 'test@localhost',
      role_id: 1,  // ✅ 1 = ПОЛЬЗОВАТЕЛЬ
      is_active: true
    };
    localStorage.setItem('jwt_token', 'fake_user_token');
    localStorage.setItem('dev_user', JSON.stringify(fakeUser));
    console.log('🚀 Dev USER login:', fakeUser);
    window.location.href = '/user';
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>🔐 NTB Booking</h1>
          <p>Вход в систему</p>
        </div>

        {error && (
          <div className="auth-error">
            <span>❌ {error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}

        <form onSubmit={handleRealLogin} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Введите логин"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Введите пароль"
            />
          </div>
          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="divider">или</div>

        {/* 🔧 Кнопка АДМИН */}
        <button onClick={handleAdminDevLogin} className="dev-button">
           Войти как Админ (Dev Mode) 👑
        </button>
        
        {/* 🔧 Кнопка ПОЛЬЗОВАТЕЛЬ */}
        <button onClick={handleUserDevLogin} className="dev-button" style={{marginTop: 8}}>
          Войти как Пользователь (Dev Mode) 👤
        </button>

        <div className="auth-footer">
          <Link to="/register">Нет аккаунта? Зарегистрироваться</Link>
        </div>
      </div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
        .auth-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 400px; }
        .auth-header { text-align: center; margin-bottom: 24px; }
        .auth-header h1 { margin: 0; font-size: 1.5rem; color: #0f172a; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.875rem; font-weight: 500; color: #475569; }
        .form-group input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem; }
        .form-group input:focus { outline: 2px solid #3b82f6; border-color: transparent; }
        .auth-button { background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .auth-button:hover { background: #2563eb; }
        .auth-error { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .auth-error button { background: none; border: none; cursor: pointer; font-weight: bold; }
        .auth-footer { margin-top: 24px; text-align: center; font-size: 0.875rem; }
        .auth-footer a { color: #3b82f6; text-decoration: none; }
        .divider { text-align: center; margin: 16px 0; color: #94a3b8; font-size: 0.8rem; position: relative; }
        .divider::before, .divider::after { content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: #e2e8f0; }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .dev-button { width: 100%; padding: 10px; background: #f8fafc; border: 1px dashed #94a3b8; color: #64748b; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
        .dev-button:hover { background: #f1f5f9; color: #334155; border-color: #64748b; }
      `}</style>
    </div>
  );
}