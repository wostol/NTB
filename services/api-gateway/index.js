// services/api-gateway/index.js
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1️⃣ CORS
app.use(cors());

// 2️⃣ Health check (без bodyParser, т.к. GET)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});

// 3️⃣ ПРОКСИ (ДО express.json!)
// Используем `context` вместо app.use('/prefix', proxy), чтобы Express не обрезал путь
const createProxy = (context, target, serviceName) => createProxyMiddleware({
    context,
    target,
    changeOrigin: true,
    timeout: 0,
    proxyTimeout: 0,
    onProxyReq: (proxyReq, req) => {
        console.log(`📤 [${serviceName}] ${req.method} ${req.originalUrl} → ${target}${req.originalUrl}`);
        
        // Если bodyParser всё же отработал, перезаписываем тело в прокси-запрос
        if (req.body && Object.keys(req.body).length > 0) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
    },
    onProxyRes: (proxyRes, req) => {
        console.log(`📥 [${serviceName}] Response: ${proxyRes.statusCode} for ${req.originalUrl}`);
    },
    onError: (err, req, res) => {
        console.error(`❌ [${serviceName}] Proxy error:`, err.message);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy error: ' + err.message });
        }
    }
});

// Монтируем прокси БЕЗ префикса в app.use, путь указывается внутри `context`
app.use(createProxy('/api/auth', 'http://localhost:3001', 'Auth'));
app.use(createProxy('/api/pcs', 'http://localhost:3002', 'PC'));
app.use(createProxy('/api/bookings', 'http://localhost:3003', 'Booking'));
app.use(createProxy('/api/preferences', 'http://localhost:3005', 'Preferences'));
// 4️⃣ BodyParser ПОСЛЕ прокси (для остальных маршрутов)
app.use(express.json({ limit: '10mb' }));

// Отключаем таймауты
app.use((req, res, next) => {
    req.setTimeout(0);
    res.setTimeout(0);
    next();
});

// Запуск
const server = app.listen(PORT, () => {
    console.log(`🌐 API Gateway running on http://localhost:${PORT}`);
    console.log(`📍 Auth:    http://localhost:${PORT}/api/auth/...`);
    console.log(`📍 PC:      http://localhost:${PORT}/api/pcs/...`);
    console.log(`📍 Booking: http://localhost:${PORT}/api/bookings/...`);
});

server.setTimeout(0);