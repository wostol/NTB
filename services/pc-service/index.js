// services/pc-service/index.js
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

// ===== 🖥️ КОМПЬЮТЕРЫ =====

// Список
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

// Один ПК
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

// Создать (админ)
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
    res.status(201).json(computer);
  } catch (error) {
    console.error('❌ Create PC error:', error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'Serial number already exists' });
    res.status(500).json({ error: error.message });
  }
});

// Обновить (админ)
app.put('/api/pcs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { floor, room, status, config } = req.body;
    const computerId = parseInt(req.params.id);
    const computer = await prisma.computer.update({
      where: { computer_id: computerId },
      data: {
        floor: floor !== undefined ? parseInt(floor) : undefined, room, status
      }, include: { config: true }
    });
    if (config) {
      await prisma.pcConfiguration.upsert({
        where: { computer_id: computerId },
        update: config, create: { computer_id: computerId, ...config }
      });
    }
    const updated = await prisma.computer.findUnique({
      where: { computer_id: computerId }, include: { config: true }
    });
    res.json(updated);
  } catch (error) {
    console.error('❌ Update PC error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Computer not found' });
    res.status(500).json({ error: error.message });
  }
});

// Удалить (админ)
app.delete('/api/pcs/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.computer.delete({ where: { computer_id: parseInt(req.params.id) } });
    res.json({ message: 'Computer deleted successfully' });
  } catch (error) {
    console.error('❌ Delete PC error:', error);
    if (error.code === 'P2025') return res.status(404).json({ error: 'Computer not found' });
    res.status(500).json({ error: error.message });
  }
});

// ===== 📅 БРОНИРОВАНИЯ =====

// Список (админ — все, юзер — свои) — ✅ БЕЗ include: { user }
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { user_id, computer_id, status, date, page = 1, limit = 20 } = req.query;
    const isAdmin = req.user?.roleId === 2;
    const where = {};
    if (!isAdmin) where.user_id = req.user?.userId;
    if (user_id && isAdmin) where.user_id = parseInt(user_id);
    if (computer_id) where.computer_id = parseInt(computer_id);
    if (status && status !== 'all') where.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      where.start_time = { gte: start, lte: end };
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where, skip, take, orderBy: { start_time: 'desc' },
        include: {
          // ❌ УБРАЛИ user — модель игнорируется в этом сервисе
          computer: { select: { computer_id: true, serial_number: true, floor: true, room: true } }
        }
      }),
      prisma.booking.count({ where })
    ]);
    res.json({ bookings, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Создать бронь — ✅ БЕЗ include: { user }
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { computer_id, start_time, end_time, purpose, booking_type, user_id: bodyUserId } = req.body;
    
    // 🔐 Определяем ID пользователя
    let userId;
    if (req.user?.roleId === 2 && bodyUserId) {
      userId = parseInt(bodyUserId);
    } else {
      userId = req.user?.userId;
    }
    
    // ✅ Валидация userId
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user: cannot determine user_id' });
    }
    
    // ✅ Проверка: компьютер
    if (!computer_id) {
      return res.status(400).json({ error: 'computer_id is required' });
    }
    const computer = await prisma.computer.findUnique({ where: { computer_id: parseInt(computer_id) } });
    if (!computer) {
      return res.status(404).json({ error: 'Computer not found' });
    }
    
    // ✅ Проверка: даты
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    // ✅ Проверка: конфликты
    const conflict = await prisma.booking.findFirst({
      where: {
        computer_id: parseInt(computer_id),
        status: { in: ['active', 'confirmed', 'pending'] },
        OR: [
          { start_time: { lte: endDate, gte: startDate } },
          { end_time: { gte: startDate, lte: endDate } }
        ]
      }
    });
    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }
    
    // ✅ Создаём бронь — БЕЗ include: { user }
    const booking = await prisma.booking.create({
      data: {
        user_id: userId,
        computer_id: parseInt(computer_id),
        start_time: startDate,
        end_time: endDate,
        status: 'active',
        purpose: purpose || null,
        booking_type: booking_type || 'standard',
        booking_date: new Date()
      },
      include: {
        // ❌ УБРАЛИ user — модель игнорируется в этом сервисе
        computer: { select: { computer_id: true, serial_number: true, floor: true, room: true } }
      }
    });
    
    console.log(`✅ Booking created: ${booking.booking_id} for user ${userId}`);
    res.status(201).json(booking);
    
  } catch (error) {
    console.error('❌ Create booking error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user_id or computer_id (does not exist in database)' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict with existing booking' });
    }
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Обновить бронь — ✅ БЕЗ include: { user }
app.patch('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status, start_time, end_time, purpose, notes } = req.body;
    const isAdmin = req.user?.roleId === 2;
    const booking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!isAdmin && booking.user_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await prisma.booking.update({
      where: { booking_id: bookingId },
      data: {
        status: status || booking.status,
        start_time: start_time ? new Date(start_time) : undefined,
        end_time: end_time ? new Date(end_time) : undefined,
        purpose: purpose !== undefined ? purpose : undefined,
        notes: notes !== undefined ? notes : undefined
      },
      include: {
        // ❌ УБРАЛИ user
        computer: { select: { computer_id: true, serial_number: true, floor: true, room: true } }
      }
    });
    console.log(`✅ Booking updated: ${bookingId}`);
    res.json(updated);
  } catch (error) {
    console.error('❌ Update booking error:', error);
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Отменить/удалить бронь
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const isAdmin = req.user?.roleId === 2;
    const booking = await prisma.booking.findUnique({ where: { booking_id: bookingId } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!isAdmin && booking.user_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await prisma.session.deleteMany({ where: { booking_id: bookingId } });
    await prisma.booking.delete({ where: { booking_id: bookingId } });
    console.log(`✅ Booking deleted: ${bookingId}`);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('❌ Delete booking error:', error);
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
  console.log(`🖥️  PC Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});