const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pc-service' });
});

// Получить все компьютеры
app.get('/api/pcs', async (req, res) => {
  try {
    const computers = await prisma.computer.findMany({
      include: { config: true }
    });
    res.json(computers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить компьютер по ID
app.get('/api/pcs/:id', async (req, res) => {
  try {
    const computer = await prisma.computer.findUnique({
      where: { computer_id: parseInt(req.params.id) },
      include: { config: true }
    });
    if (!computer) {
      return res.status(404).json({ error: 'Computer not found' });
    }
    res.json(computer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать компьютер
app.post('/api/pcs', async (req, res) => {
  try {
    const { serial_number, floor, room, config } = req.body;
    const computer = await prisma.computer.create({
      data: {
        serial_number,
        floor,
        room,
        config: config ? { create: config } : undefined
      },
      include: { config: true }
    });
    res.status(201).json(computer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🖥️  PC Service running on http://localhost:${PORT}`);
});