const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const { usingDevSecret } = require('./utils/token');
const authRoutes = require('./routes/authRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'member-4-database-authentication',
    timestamp: new Date().toISOString(),
    database: global.useMemoryDb ? 'in-memory (demo fallback)' : 'mongodb',
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Catch 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    if (usingDevSecret()) {
      console.warn('[auth] JWT_SECRET is not set, using fallback dev secret. Set it in .env.');
    }
    return app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` Member 4: Database & Authentication Service Running `);
      console.log(` Local Server: http://localhost:${PORT}             `);
      console.log(` Health Check: http://localhost:${PORT}/api/health   `);
      console.log(` Auth Routes:  http://localhost:${PORT}/api/auth     `);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start authentication server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
