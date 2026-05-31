// frontend/src/pages/auth/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, error: authError, setError, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    if (authError) clearError();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Имя пользователя обязательно';
    else if (formData.username.length < 3) newErrors.username = 'Минимум 3 символа';
    
    if (!formData.full_name.trim()) newErrors.full_name = 'Полное имя обязательно';
    
    if (!formData.password) newErrors.password = 'Пароль обязателен';
    else if (formData.password.length < 6) newErrors.password = 'Минимум 6 символов';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    clearError();
    
    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      
      // ✅ После регистрации — редирект на логин с сообщением
      navigate('/login', { 
        state: { message: 'Регистрация успешна! Теперь войдите.' }
      });
    } catch (err) {
      // ✅ Устанавливаем ошибку из ответа бэкенда
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-header">
          <h1>📝 Регистрация</h1>
          <p>Создайте аккаунт для доступа к системе</p>
        </div>

        {authError && (
          <div className="auth-error" role="alert">
            <span>❌</span>
            <span>{authError}</span>
            <button onClick={clearError} aria-label="Закрыть">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input id="username" name="username" type="text" value={formData.username}
                onChange={handleChange} placeholder="admin" required disabled={isSubmitting}
                className={errors.username ? 'error' : ''} />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="full_name">Full Name *</label>
              <input id="full_name" name="full_name" type="text" value={formData.full_name}
                onChange={handleChange} placeholder="Иван Иванов" required disabled={isSubmitting}
                className={errors.full_name ? 'error' : ''} />
              {errors.full_name && <span className="field-error">{errors.full_name}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={formData.email}
              onChange={handleChange} placeholder="user@example.com" disabled={isSubmitting}
              className={errors.email ? 'error' : ''} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input id="password" name="password" type="password" value={formData.password}
                onChange={handleChange} placeholder="••••••••" required minLength={6}
                disabled={isSubmitting} className={errors.password ? 'error' : ''} />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm *</label>
              <input id="confirmPassword" name="confirmPassword" type="password"
                value={formData.confirmPassword} onChange={handleChange}
                placeholder="••••••••" required disabled={isSubmitting}
                className={errors.confirmPassword ? 'error' : ''} />
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? 'Создание...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </div>

      <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; }
        .auth-card { background: white; border-radius: 16px; padding: 32px; width: 100%;
          max-width: 520px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
        .register-card { max-width: 520px; }
        .auth-header { text-align: center; margin-bottom: 24px; }
        .auth-header h1 { margin: 0 0 8px; font-size: 1.5rem; color: #1e293b; }
        .auth-header p { margin: 0; color: #64748b; font-size: 0.95rem; }
        .auth-error { display: flex; align-items: center; gap: 8px; padding: 12px 16px;
          background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
          color: #dc2626; font-size: 0.9rem; margin-bottom: 20px; }
        .auth-error button { margin-left: auto; background: none; border: none;
          font-size: 1.2rem; cursor: pointer; color: inherit; padding: 0 4px; }
        .auth-form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 500px) { .form-row { grid-template-columns: 1fr; } }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-weight: 500; color: #334155; font-size: 0.9rem; }
        .form-group input { padding: 12px 14px; border: 2px solid #e2e8f0; border-radius: 8px;
          font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .form-group input:focus { outline: none; border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
        .form-group input.error { border-color: #ef4444; }
        .form-group input.error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
        .form-group input:disabled { background: #f8fafc; cursor: not-allowed; }
        .field-error { font-size: 0.8rem; color: #ef4444; margin-top: 2px; }
        .auth-button { width: 100%; padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;
          border: none; border-radius: 8px; font-size: 1rem; font-weight: 600;
          cursor: pointer; transition: transform 0.1s, box-shadow 0.2s; margin-top: 8px; }
        .auth-button:hover:not(:disabled) { transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); }
        .auth-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .auth-footer { text-align: center; margin-top: 24px; padding-top: 16px;
          border-top: 1px solid #e2e8f0; font-size: 0.9rem; color: #64748b; }
        .auth-footer a { color: #667eea; text-decoration: none; font-weight: 500; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}