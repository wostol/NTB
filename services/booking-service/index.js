// services/booking-service/index.js
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service' });
});

// Создание бронирования
app.post('/api/bookings', async (req, res) => {
  const { user_id, computer_id, start_time, end_time, purpose } = req.body;

  try {
    // Проверка пересечений
    const conflicts = await prisma.booking.findMany({
      where: {
        computer_id,
        status: { in: ['active', 'confirmed'] },
        OR: [
          {
            start_time: { lte: new Date(end_time) },
            end_time: { gte: new Date(start_time) }
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Computer is already booked for this time slot' 
      });
    }

    // Создание бронирования
    const booking = await prisma.booking.create({
      data: {
        user_id,
        computer_id,
        booking_date: new Date(),
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        status: 'active',
        purpose
      },
      include: { computer: true }
    });

    // Обновление статуса компьютера
    await prisma.computer.update({
      where: { computer_id },
      data: { status: 'booked' }
    });

    // Публикация события в RabbitMQ
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      
      await channel.assertExchange('booking_events', 'topic', { durable: true });
      
      const message = {
        booking_id: booking.booking_id,
        user_id,
        computer_id,
        start_time,
        end_time,
        event: 'booking.created',
        timestamp: new Date()
      };

      channel.publish('booking_events', 'booking.created', 
        Buffer.from(JSON.stringify(message)), { persistent: true });
      
      console.log('📤 Published booking.created event');
      
      setTimeout(() => connection.close(), 500);
    } catch (rabbitError) {
      console.error('RabbitMQ error:', rabbitError.message);
    }

    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить все бронирования
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { computer: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить бронирования пользователя
app.get('/api/bookings/user/:user_id', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { user_id: parseInt(req.params.user_id) },
      include: { computer: true },
      orderBy: { start_time: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отмена бронирования
app.patch('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { booking_id: parseInt(req.params.id) },
      data: { 
        status: 'cancelled',
        cancelled_at: new Date()
      },
      include: { computer: true }
    });

    // Обновление статуса компьютера
    await prisma.computer.update({
      where: { computer_id: booking.computer_id },
      data: { status: 'available' }
    });

    // Публикация события
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      const channel = await connection.createChannel();
      
      await channel.assertExchange('booking_events', 'topic', { durable: true });
      
      const message = {
        booking_id: booking.booking_id,
        computer_id: booking.computer_id,
        event: 'booking.cancelled',
        timestamp: new Date()
      };

      channel.publish('booking_events', 'booking.cancelled', 
        Buffer.from(JSON.stringify(message)), { persistent: true });
      
      console.log('📤 Published booking.cancelled event');
      
      setTimeout(() => connection.close(), 500);
    } catch (rabbitError) {
      console.error('RabbitMQ error:', rabbitError.message);
    }

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`📅 Booking Service running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});