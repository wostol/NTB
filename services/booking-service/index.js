// services/booking-service/index.js
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3003;

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

// 📤 Публикация события в RabbitMQ (утилита)
const publishBookingEvent = async (event, data) => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();
    
    await channel.assertExchange('booking_events', 'topic', { durable: true });
    
    const message = {
      ...data,
      event,
      service: 'booking-service',
      timestamp: new Date()
    };

    channel.publish('booking_events', event, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`📤 Published ${event}`);
    
    setTimeout(() => connection.close(), 500);
  } catch (err) {
    console.error(`❌ RabbitMQ error for ${event}:`, err.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service' });
});

// ===== 📅 БРОНИРОВАНИЯ =====

// 📋 Список (админ — все, юзер — свои) с фильтрами и пагинацией
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { user_id, computer_id, status, date, page = 1, limit = 20 } = req.query;
    const isAdmin = req.user?.roleId === 2;
    
    const where = {};
    
    // Обычный пользователь видит только свои брони
    if (!isAdmin) {
      where.user_id = req.user?.userId;
    }
    
    // Админ может фильтровать по пользователю
    if (user_id && isAdmin) {
      where.user_id = parseInt(user_id);
    }
    
    if (computer_id) {
      where.computer_id = parseInt(computer_id);
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Фильтр по дате
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.start_time = { gte: start, lte: end };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { start_time: 'desc' },
        include: {
          computer: { 
            select: { 
              computer_id: true, 
              serial_number: true, 
              floor: true, 
              room: true 
            } 
          }
        }
      }),
      prisma.booking.count({ where })
    ]);
    
    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ✨ Создать бронь
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { computer_id, start_time, end_time, purpose, booking_type, user_id: bodyUserId } = req.body;
    
    // Определяем user_id: админ может создать бронь за другого, обычный — только за себя
    let userId;
    if (req.user?.roleId === 2 && bodyUserId) {
      userId = parseInt(bodyUserId);
    } else {
      userId = req.user?.userId;
    }
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user: cannot determine user_id' });
    }
    
    if (!computer_id) {
      return res.status(400).json({ error: 'computer_id is required' });
    }
    
    // Проверяем, что компьютер существует
    const computer = await prisma.computer.findUnique({ 
      where: { computer_id: parseInt(computer_id) } 
    });
    if (!computer) {
      return res.status(404).json({ error: 'Computer not found' });
    }
    
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    // Проверка на пересечения
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
    
    // Создаём бронь
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
        computer: { 
          select: { 
            computer_id: true, 
            serial_number: true, 
            floor: true, 
            room: true 
          } 
        }
      }
    });
    
    // Обновляем статус компьютера
    await prisma.computer.update({
      where: { computer_id: parseInt(computer_id) },
      data: { status: 'booked' }
    });
    
    console.log(`✅ Booking created: ${booking.booking_id} for user ${userId}`);
    
    // 📤 Публикуем событие в аудит
    publishBookingEvent('booking.created', {
      user_id: userId,
      entity_type: 'Booking',
      entity_id: booking.booking_id,
      new_value: { 
        computer_id: parseInt(computer_id), 
        start_time, 
        end_time, 
        purpose 
      }
    });
    
    res.status(201).json(booking);
    
  } catch (error) {
    console.error('❌ Create booking error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user_id or computer_id' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict with existing booking' });
    }
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ✏️ Обновить бронь (статус, время, заметки)
app.patch('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { status, start_time, end_time, purpose, notes } = req.body;
    const isAdmin = req.user?.roleId === 2;
    
    // Находим бронь
    const booking = await prisma.booking.findUnique({ 
      where: { booking_id: bookingId } 
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Проверка прав: только владелец или админ
    if (!isAdmin && booking.user_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Сохраняем старое состояние для аудита
    const oldBooking = { ...booking };
    
    // Обновляем
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
        computer: { 
          select: { 
            computer_id: true, 
            serial_number: true, 
            floor: true, 
            room: true 
          } 
        }
      }
    });
    
    // Если статус сменился на 'active' — блокируем ПК, если на 'available'/'cancelled' — освобождаем
    if (status && status !== oldBooking.status) {
      const newStatus = status === 'active' ? 'booked' : 'available';
      await prisma.computer.update({
        where: { computer_id: booking.computer_id },
        data: { status: newStatus }
      });
    }
    
    console.log(`✅ Booking updated: ${bookingId}`);
    
    // 📤 Публикуем событие
    publishBookingEvent('booking.updated', {
      user_id: req.user?.userId,
      entity_type: 'Booking',
      entity_id: bookingId,
      old_value: { 
        status: oldBooking.status, 
        start_time: oldBooking.start_time, 
        end_time: oldBooking.end_time 
      },
      new_value: { 
        status: updated.status, 
        start_time: updated.start_time, 
        end_time: updated.end_time, 
        purpose: updated.purpose 
      }
    });
    
    res.json(updated);
    
  } catch (error) {
    console.error('❌ Update booking error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// 🗑️ Отменить/удалить бронь
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const isAdmin = req.user?.roleId === 2;
    
    const booking = await prisma.booking.findUnique({ 
      where: { booking_id: bookingId } 
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Проверка прав
    if (!isAdmin && booking.user_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Сохраняем данные для аудита перед удалением
    const bookingData = { ...booking };
    
    // Удаляем связанные сессии
    await prisma.session.deleteMany({ where: { booking_id: bookingId } });
    
    // Удаляем бронь
    await prisma.booking.delete({ where: { booking_id: bookingId } });
    
    // Освобождаем компьютер
    await prisma.computer.update({
      where: { computer_id: booking.computer_id },
      data: { status: 'available' }
    });
    
    console.log(`✅ Booking deleted: ${bookingId}`);
    
    // 📤 Публикуем событие
    publishBookingEvent('booking.cancelled', {
      user_id: req.user?.userId,
      entity_type: 'Booking',
      entity_id: bookingId,
      old_value: { 
        status: bookingData.status, 
        start_time: bookingData.start_time, 
        end_time: bookingData.end_time 
      }
    });
    
    res.json({ message: 'Booking cancelled successfully' });
    
  } catch (error) {
    console.error('❌ Delete booking error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// 👤 Бронирования конкретного пользователя (алиас для удобства)
app.get('/api/bookings/user/:user_id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.user_id);
    const isAdmin = req.user?.roleId === 2;
    
    // Обычный пользователь может смотреть только свои брони
    if (!isAdmin && req.user?.userId !== targetUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const bookings = await prisma.booking.findMany({
      where: { user_id: targetUserId },
      include: {
        computer: { 
          select: { 
            computer_id: true, 
            serial_number: true, 
            floor: true, 
            room: true 
          } 
        }
      },
      orderBy: { start_time: 'desc' }
    });
    
    res.json(bookings);
  } catch (error) {
    console.error('❌ Get user bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
  console.log(`📅 Booking Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});