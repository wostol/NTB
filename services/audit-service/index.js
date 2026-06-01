// services/audit-service/index.js
const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// 🔧 FIX: Сериализация BigInt для JSON (Prisma использует BigInt для log_id)
if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() { return Number(this); };
}

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3004;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service' });
});

// 📋 GET /api/audit — список логов (только админ)
app.get('/api/audit', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token required' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key');
    if (decoded.roleId !== 2) return res.status(403).json({ error: 'Admin access required' });

    const { action, entity_type, page = 1, limit = 50 } = req.query;
    const where = {};
    if (action && action !== 'all') where.action = action;
    if (entity_type && entity_type !== 'all') where.entity_type = entity_type;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take, orderBy: { created_at: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);
    
    res.json({ logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ===== 🔄 RABBITMQ CONSUMER =====
async function startConsumer() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672');
    const channel = await conn.createChannel();

    await channel.assertExchange('booking_events', 'topic', { durable: true });
    const q = await channel.assertQueue('audit_queue', { durable: true });
    await channel.bindQueue(q.queue, 'booking_events', '#');

    console.log('📥 Audit Service: Listening to all events...');

    channel.consume(q.queue, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log(`📥 Received: ${event.event}`);

          await prisma.auditLog.create({
            data: {
              user_id: event.user_id || null,
              action: event.action || event.event?.toUpperCase().replace('.', '_') || 'UNKNOWN',
              entity_type: event.entity_type || 'unknown',
              entity_id: event.entity_id || null,
              old_value: event.old_value || null,
              new_value: event.new_value || event,
              ip_address: event.ip_address || '127.0.0.1',
              created_at: event.timestamp ? new Date(event.timestamp) : new Date()
            }
          });

          console.log(`✅ Audit log saved: ${event.event}`);
          channel.ack(msg);
          
        } catch (err) {
          console.error('❌ Failed to save audit log:', err.message);
          // 🔑 КРИТИЧНО: ack вместо nack, чтобы не зацикливать очередь
          channel.ack(msg);
        }
      }
    });

    conn.on('close', () => {
      console.warn('🔌 RabbitMQ disconnected. Reconnecting in 5s...');
      setTimeout(startConsumer, 5000);
    });

  } catch (err) {
    console.error('❌ RabbitMQ connection error:', err.message);
    setTimeout(startConsumer, 5000);
  }
}

// Запуск
app.listen(PORT, () => {
  console.log(`🔍 Audit Service running on http://localhost:${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});