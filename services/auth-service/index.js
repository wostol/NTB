const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ ВАЖНО: Порядок middleware!
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // ДО всех маршрутов

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// ===== МАРШРУТЫ =====

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Registration request:', req.body);
    const { username, password, full_name, email } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password and full_name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        full_name,
        email,
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

    console.log('✅ User registered:', user.username);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Логин
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

    // Обновление last_login
    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() }
    });

    // Генерация JWT
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
        role: user.role.role_name
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Получение текущего пользователя
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
        is_active: true,
        created_at: true,
        last_login: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('❌ Get user error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ ВАЖНО: Обработчик ошибок ПОСЛЕ всех маршрутов
app.use((err, req, res, next) => {
  console.error('❌ Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});