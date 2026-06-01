// services/preferences-service/index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// ✅ CORS ДОЛЖЕН БЫТЬ ПЕРВЫМ (до express.json)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 🔐 Middleware проверки токена
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = {
      userId: decoded.userId || decoded.user_id,
      username: decoded.username,
      roleId: decoded.roleId || decoded.role_id
    };
    next();
  } catch (err) {
    console.error('❌ Token verify error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ❤️ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'preferences-service', port: PORT });
});

// ❤️ Получить список избранного
app.get('/api/preferences/favorites', authMiddleware, async (req, res) => {
  console.log(`✅ GET /favorites for user ${req.user.userId}`);
  try {
    const favorites = await prisma.favorite.findMany({
      where: { user_id: req.user.userId },
      include: { computer: { include: { config: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(favorites.map(f => f.computer));
  } catch (err) {
    console.error('❌ Get favorites error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ❤️ Добавить в избранное
app.post('/api/preferences/favorites', authMiddleware, async (req, res) => {
  console.log(`✅ POST /favorites for user ${req.user.userId}`, req.body);
  const { computer_id } = req.body;
  
  if (!computer_id) {
    return res.status(400).json({ error: 'computer_id required' });
  }

  try {
    // Проверка: существует ли пользователь?
    const userExists = await prisma.user.findUnique({
      where: { user_id: req.user.userId }
    });
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Проверка: существует ли компьютер?
    const computerExists = await prisma.computer.findUnique({
      where: { computer_id: parseInt(computer_id) }
    });
    if (!computerExists) {
      return res.status(404).json({ error: 'Computer not found' });
    }

    const fav = await prisma.favorite.create({
      data: { 
        user_id: req.user.userId, 
        computer_id: parseInt(computer_id) 
      }
    });
    
    console.log(`✅ Favorite created: ${fav.user_id} -> ${fav.computer_id}`);
    res.status(201).json({ message: 'Added to favorites', favorite: fav });
    
  } catch (err) {
    console.error('❌ Create favorite error:', err);
    
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already in favorites' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Foreign key constraint failed' });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ❤️ Удалить из избранного
app.delete('/api/preferences/favorites/:computerId', authMiddleware, async (req, res) => {
  console.log(`✅ DELETE /favorites/${req.params.computerId} for user ${req.user.userId}`);
  try {
    await prisma.favorite.delete({
      where: {
        user_id_computer_id: {
          user_id: req.user.userId,
          computer_id: parseInt(req.params.computerId)
        }
      }
    });
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    console.error('❌ Delete favorite error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 💾 Сохранить фильтр
app.post('/api/preferences/filters', authMiddleware, async (req, res) => {
  try {
    const filter = await prisma.filter.create({
      data: {
        user_id: req.user.userId,
        config_requirements: req.body.config_requirements,
        software_requirements: req.body.software_requirements
      }
    });
    res.status(201).json(filter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💾 Получить фильтры
app.get('/api/preferences/filters', authMiddleware, async (req, res) => {
  try {
    const filters = await prisma.filter.findMany({
      where: { user_id: req.user.userId },
      orderBy: { created_at: 'desc' }
    });
    res.json(filters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ Удалить фильтр
app.delete('/api/preferences/filters/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.filter.delete({
      where: { filter_id: parseInt(req.params.id), user_id: req.user.userId }
    });
    res.json({ message: 'Filter deleted' });
  } catch (err) {
    res.status(404).json({ error: 'Filter not found' });
  }
});

// 🔍 Умный поиск
app.post('/api/preferences/discover', authMiddleware, async (req, res) => {
  try {
    const { minRam, storageType, status = 'available' } = req.body;
    const where = { status };
    
    if (minRam) where.config = { ram_gb: { gte: parseInt(minRam) } };
    if (storageType) where.config = { ...where.config, storage_type: storageType };

    const computers = await prisma.computer.findMany({
      where,
      include: { config: true, favorites: { where: { user_id: req.user.userId } } },
      orderBy: { computer_id: 'asc' },
      take: 50
    });

    const result = computers.map(c => ({
      ...c,
      isFavorite: c.favorites.length > 0,
      favorites: undefined
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Catch-all 404 handler (для отладки)
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.path, 
    method: req.method,
    availableRoutes: [
      'GET /health',
      'GET /api/preferences/favorites',
      'POST /api/preferences/favorites',
      'DELETE /api/preferences/favorites/:computerId',
      'GET/POST/DELETE /api/preferences/filters',
      'POST /api/preferences/discover'
    ]
  });
});

// ✅ Запуск
app.listen(PORT, () => {
  console.log(`❤️  Preferences Service running on http://localhost:${PORT}`);
  console.log(`   Available routes: /api/preferences/*`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('🔌 Preferences Service disconnected');
  process.exit();
});