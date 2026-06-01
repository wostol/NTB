// services/pc-service/index.js
const { publishAuditEvent } = require('../lib/audit');
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// 🔐 Проверка токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    req.user = {
      userId: decoded.userId || decoded.user_id,
      username: decoded.username,
      roleId: decoded.roleId || decoded.role_id
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 👑 Только админ
const requireAdmin = (req, res, next) => {
  if (req.user?.roleId !== 2) return res.status(403).json({ error: 'Admin access required' });
  next();
};

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'pc-service' }));

// ===== 🖥️ КОМПЬЮТЕРЫ — ЕДИНСТВЕННЫЕ МАРШРУТЫ В ЭТОМ СЕРВИСЕ =====

// Список компьютеров
app.get('/api/pcs', authenticateToken, async (req, res) => {
  try {
    const { status, floor, search } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (floor) where.floor = parseInt(floor);
    if (search) {
      where.OR = [
        { serial_number: { contains: search, mode: 'insensitive' } },
        { room: { contains: search, mode: 'insensitive' } }
      ];
    }
    const computers = await prisma.computer.findMany({
      where, include: { config: true }, orderBy: { serial_number: 'asc' }
    });
    res.json(computers);
  } catch (error) {
    console.error('❌ Get PCs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Один компьютер
app.get('/api/pcs/:id', authenticateToken, async (req, res) => {
  try {
    const computer = await prisma.computer.findUnique({
      where: { computer_id: parseInt(req.params.id) }, include: { config: true }
    });
    if (!computer) return res.status(404).json({ error: 'Computer not found' });
    res.json(computer);
  } catch (error) {
    console.error('❌ Get PC error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать компьютер (админ) — ✅ С АУДИТОМ
app.post('/api/pcs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { serial_number, floor, room, config } = req.body;
    if (!serial_number || !floor || !room) {
      return res.status(400).json({ error: 'serial_number, floor and room are required' });
    }
    const computer = await prisma.computer.create({
      data: {
        serial_number, floor: parseInt(floor), room,
        config: config ? { create: config } : undefined
      }, include: { config: true }
    });
    
    publishAuditEvent('pc.created', {
      event: 'pc.created',
      user_id: req.user?.userId,
      entity_type: 'Computer',
      entity_id: computer.computer_id,
      new_value: { serial_number, floor, room, config },
      service: 'pc-service',
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    }).catch(err => console.error('❌ Audit publish failed:', err));
    
    res.status(201).json(computer);
  } catch (error) {
    console.error('❌ Create PC error:', error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'Serial number already exists' });
    res.status(500).json({ error: error.message });
  }
});

// Обновить компьютер (админ) — ✅ С АУДИТОМ
app.put('/api/pcs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { floor, room, status, config } = req.body;
    const computerId = parseInt(req.params.id);
    
    const oldComputer = await prisma.computer.findUnique({ 
      where: { computer_id: computerId },
      include: { config: true }
    });
    
    const computer = await prisma.computer.update({
      where: { computer_id: computerId },
      data: {
        floor: floor !== undefined ? parseInt(floor) : undefined, 
        room, 
        status
      }, 
      include: { config: true }
    });
    
    if (config) {
      await prisma.pcConfiguration.upsert({
        where: { computer_id: computerId },
        update: config, 
        create: { computer_id: computerId, ...config }
      });
    }
    
    const updated = await prisma.computer.findUnique({
      where: { computer_id: computerId }, 
      include: { config: true }
    });
    
    publishAuditEvent('pc.updated', {
      event: 'pc.updated',
      user_id: req.user?.userId,
      entity_type: 'Computer',
      entity_id: computerId,
      old_value: { serial_number: oldComputer?.serial_number, floor: oldComputer?.floor, room: oldComputer?.room, status: oldComputer?.status },
      new_value: { serial_number: updated?.serial_number, floor: updated?.floor, room: updated?.room, status: updated?.status },
      service: 'pc-service',
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    }).catch(err => console.error('❌ Audit publish failed:', err));
    
    res.json(updated);
  } catch (error) {
    console.error('❌ Update PC error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Computer not found' });
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ Удалить компьютер (админ) — ✅ С КАСКАДНЫМ УДАЛЕНИЕМ ЗАВИСИМОСТЕЙ
app.delete('/api/pcs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const computerId = parseInt(req.params.id);
    
    // 1. Сначала находим компьютер для аудита
    const computer = await prisma.computer.findUnique({ 
      where: { computer_id: computerId },
      include: { config: true }
    });
    
    if (!computer) {
      return res.status(404).json({ error: 'Computer not found' });
    }
    
    // 2. ✅ Удаляем связанные записи в правильном порядке:
    
    // Сначала удаляем конфигурацию ПК (если есть)
    await prisma.pcConfiguration.deleteMany({
      where: { computer_id: computerId }
    });
    
    // Удаляем все бронирования этого ПК (из booking-service)
    await prisma.booking.deleteMany({
      where: { computer_id: computerId }
    });
    
    // Удаляем записи в избранном (из preferences-service)
    await prisma.favorite.deleteMany({
      where: { computer_id: computerId }
    });
    
    // 3. Теперь удаляем сам компьютер
    await prisma.computer.delete({ 
      where: { computer_id: computerId } 
    });
    
    console.log(`✅ PC deleted: ${computerId}`);
    
    // 📤 Публикуем событие в аудит
    publishAuditEvent('pc.deleted', {
      event: 'pc.deleted',
      user_id: req.user?.userId,
      entity_type: 'Computer',
      entity_id: computerId,
      old_value: { 
        serial_number: computer?.serial_number, 
        floor: computer?.floor, 
        room: computer?.room,
        config: computer?.config
      },
      service: 'pc-service',
      ip_address: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    }).catch(err => console.error('❌ Audit publish failed:', err));
    
    res.json({ message: 'Computer deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete PC error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Computer not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Cannot delete: related records exist. Please delete configurations/bookings first.',
        constraint: error.meta?.constraint 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== ⚠️ ВСЕ МАРШРУТЫ /api/bookings УДАЛЕНЫ — ОНИ ТЕПЕРЬ В booking-service =====

// ===== ЗАПУСК =====
app.listen(PORT, () => {
  console.log(`🖥️  PC Service running on http://localhost:${PORT} (только компьютеры)`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});