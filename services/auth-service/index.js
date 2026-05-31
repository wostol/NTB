// services/auth-service/index.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Проверка токена и роли админа =====
const checkAdminToken = (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: res.status(401).json({ error: 'Token required' }) };
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    if (decoded.roleId !== 2) {
      return { error: res.status(403).json({ error: 'Admin access required' }) };
    }
    return { decoded };
  } catch {
    return { error: res.status(401).json({ error: 'Invalid or expired token' }) };
  }
};

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration request:', req.body);
    const { username, password, full_name, email } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password and full_name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        full_name,
        email: email || null,
        role_id: 1
      },
      select: {
        user_id: true,
        username: true,
        full_name: true,
        email: true,
        role_id: true
      }
    });

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, roleId: user.role_id },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ User registered:', user.username);
    res.status(201).json({ 
      message: 'User registered successfully', 
      token,
      user: { ...user, role_id: user.role_id }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// ===== ЛОГИН =====
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login request:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    });

    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() }
    });

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, roleId: user.role_id },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ Login successful:', username);
    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        role: user.role?.role_name
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// ===== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ =====
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');

    const user = await prisma.user.findUnique({
      where: { user_id: decoded.userId },
      select: {
        user_id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        role_id: true,
        is_active: true,
        created_at: true,
        last_login: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ...user, role_id: user.role_id });
  } catch (error) {
    console.error('❌ Get user error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

// ===== 📋 GET /api/admin/users — Список пользователей (только админ) =====
app.get('/api/admin/users', async (req, res) => {
  // 🔐 Проверка токена и роли
  const authCheck = checkAdminToken(req, res);
  if (authCheck?.error) return;
  
  try {
    const { search, role_id, is_active, page = 1, limit = 20 } = req.query;
    const where = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role_id) where.role_id = parseInt(role_id);
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take, orderBy: { created_at: 'desc' },
        select: {
          user_id: true, username: true, full_name: true, email: true,
          role_id: true, is_active: true, created_at: true, last_login: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ 
      users, 
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total, 
        pages: Math.ceil(total / limit) 
      } 
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ===== ✏️ PATCH /api/admin/users/:id/toggle-status — Блок/разблок =====
app.patch('/api/admin/users/:id/toggle-status', async (req, res) => {
  // 🔐 Проверка токена и роли
  const authCheck = checkAdminToken(req, res);
  if (authCheck?.error) return;
  
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const updated = await prisma.user.update({
      where: { user_id: userId },
      data: { is_active: !user.is_active },
      select: { user_id: true, username: true, full_name: true, email: true, role_id: true, is_active: true }
    });
    
    console.log(`✅ User ${updated.username} status toggled: ${updated.is_active}`);
    res.json(updated);
  } catch (error) {
    console.error('❌ Toggle status error:', error);
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ===== 🗑️ DELETE /api/admin/users/:id — Удалить пользователя =====
app.delete('/api/admin/users/:id', async (req, res) => {
  // 🔐 Проверка токена и роли
  const authCheck = checkAdminToken(req, res);
  if (authCheck?.error) return;
  
  try {
    const userId = parseInt(req.params.id);
    
    // Удаляем связанные записи (чтобы не было конфликта внешних ключей)
    await prisma.booking.deleteMany({ where: { user_id: userId } });
    await prisma.session.deleteMany({ where: { user_id: userId } });
    await prisma.favorite.deleteMany({ where: { user_id: userId } });
    await prisma.waitingList.deleteMany({ where: { user_id: userId } });
    await prisma.filter.deleteMany({ where: { user_id: userId } });
    
    // Удаляем самого пользователя
    await prisma.user.delete({ where: { user_id: userId } });
    
    console.log(`✅ User deleted: ${userId}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ===== ОБРАБОТЧИК ОШИБОК =====
app.use((err, req, res, next) => {
  console.error('❌ Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});