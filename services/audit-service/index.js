// services/audit-service/index.js
const express = require('express');
const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service' });
});

// ===== RABBITMQ CONSUMER =====
async function startConsumer() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();

    // Создаем exchange и очередь (если еще нет)
    await channel.assertExchange('booking_events', 'topic', { durable: true });
    const q = await channel.assertQueue('audit_queue', { durable: true });
    
    // Подписываемся на все события бронирования
    await channel.bindQueue(q.queue, 'booking_events', 'booking.#');

    console.log('📥 Audit Service: Listening to booking.# events...');

    channel.consume(q.queue, async (msg) => {
      if (msg) {
        const event = JSON.parse(msg.content.toString());
        console.log(` Received: ${event.event} for booking #${event.booking_id}`);

        try {
          // Сохраняем в auditlog
          await prisma.auditlog.create({
            data: {
              user_id: event.user_id || null,
              action: event.event === 'booking.created' ? 'CREATE_BOOKING' : 'CANCEL_BOOKING',
              entity_type: 'booking',
              entity_id: event.booking_id,
              new_value: event, // Сохраняем полное событие как JSON
              ip_address: '127.0.0.1', // В проде брать из req.ip
              created_at: new Date(event.timestamp || Date.now())
            }
          });

          console.log(`✅ Audit log saved for booking #${event.booking_id}`);
          channel.ack(msg); // Подтверждаем обработку
        } catch (err) {
          console.error('❌ Failed to save audit log:', err.message);
          channel.nack(msg); // Возвращаем в очередь при ошибке
        }
      }
    });

    // Обработка разрыва соединения
    conn.on('close', () => {
      console.warn('🔌 RabbitMQ connection closed. Reconnecting in 5s...');
      setTimeout(startConsumer, 5000);
    });

  } catch (err) {
    console.error('RabbitMQ connection error:', err.message);
    setTimeout(startConsumer, 5000);
  }
}

// Запускаем consumer
startConsumer();

// Запускаем Express
app.listen(PORT, () => {
  console.log(` Audit Service running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});