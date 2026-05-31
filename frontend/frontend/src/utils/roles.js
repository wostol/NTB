// frontend/src/utils/roles.js

export function getRoleFromToken() {
  const token = localStorage.getItem('jwt_token');
  if (!token) return null;
  
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Поддерживаем: roleId (число), role_id (число), role (строка 'admin'/'user')
    return decoded.roleId || decoded.role_id || decoded.role || null;
  } catch {
    return null;
  }
}

// ✅ Проверяем и числа, и строки
export function isAdmin() {
  const role = getRoleFromToken();
  return role === 2 || role === 'admin' || role === 'Admin';
}

export function isUser() {
  const role = getRoleFromToken();
  return role === 1 || role === 'user' || role === 'User';
}

// Универсальная проверка
export function hasRole(allowedRoles) {
  const userRole = getRoleFromToken();
  if (!userRole) return false;
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(userRole) || 
         roles.map(String).includes(String(userRole)); // сравнение "2" === 2
}

// Хелпер: нормализует роль к числу (для роутинга)
export function getRoleId(user) {
  if (!user) return null;
  
  // Прямое число
  if (typeof user.role_id === 'number') return user.role_id;
  if (typeof user.roleId === 'number') return user.roleId;
  
  // Строка role_name → число
  if (user.role?.role_name) {
    const name = user.role.role_name.toLowerCase();
    if (name === 'admin') return 2;
    if (name === 'user') return 1;
  }
  
  // Строка role
  if (typeof user.role === 'string') {
    const name = user.role.toLowerCase();
    if (name === 'admin') return 2;
    if (name === 'user') return 1;
  }
  
  return null;
}