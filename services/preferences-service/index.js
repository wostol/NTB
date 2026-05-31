const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

app.use(express.json());

//Middleware проверки JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Получить список избранного
app.get('/api/preferences/favorites', authMiddleware, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { user_id: req.user.userId },
      include: { computer: { include: { config: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(favorites.map(f => f.computer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Добавить в избранное
app.post('/api/preferences/favorites', authMiddleware, async (req, res) => {
  const { computer_id } = req.body;
  if (!computer_id) return res.status(400).json({ error: 'computer_id required' });

  try {
    const fav = await prisma.favorite.create({
      data: { user_id: req.user.userId, computer_id }
    });
    res.status(201).json({ message: 'Added to favorites', favorite: fav });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already in favorites' });
    res.status(500).json({ error: err.message });
  }
});

// Удалить из избранного
app.delete('/api/preferences/favorites/:computerId', authMiddleware, async (req, res) => {
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
    res.status(404).json({ error: 'Favorite not found' });
  }
});
// Сохранить фильтр
app.post('/api/preferences/filters', authMiddleware, async (req, res) => {
  const { config_requirements, software_requirements } = req.body;
  try {
    const filter = await prisma.filter.create({
      data: {
        user_id: req.user.userId,
        config_requirements,
        software_requirements
      }
    });
    res.status(201).json(filter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить сохраненные фильтры
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

// Удалить фильтр
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

//  Умный поиск (Discovery)
app.post('/api/preferences/discover', authMiddleware, async (req, res) => {
  const { minRam, storageType, maxPrice, status = 'available' } = req.body;
  
  try {
    const where = { status };
    if (minRam) where.config = { ram_gb: { gte: minRam } };
    if (storageType) where.config = { ...where.config, storage_type: storageType };

    const computers = await prisma.computer.findMany({
      where,
      include: { config: true, favorites: { where: { user_id: req.user.userId } } },
      orderBy: { computer_id: 'asc' },
      take: 50
    });

    // Добавляем флаг isFavorite для удобства фронтенда
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'preferences-service' }));

app.listen(PORT, () => {
  console.log(`🔍 Preferences Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});