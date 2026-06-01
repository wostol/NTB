// services/lib/audit.js
const amqp = require('amqplib');

let channel = null;
const EXCHANGE = 'booking_events';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

async function getChannel() {
  if (!channel) {
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  }
  return channel;
}

// Публикация события
async function publishAuditEvent(routingKey, payload) {
  try {
    const ch = await getChannel();
    const message = {
      ...payload,
      timestamp: new Date().toISOString(),
      service: payload.service || 'unknown'
    };
    ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(message)), { persistent: true });
    console.log(`📤 Published: ${routingKey}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to publish ${routingKey}:`, err.message);
    return false; // Не блокируем основной поток
  }
}

module.exports = { publishAuditEvent };