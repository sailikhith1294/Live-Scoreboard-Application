require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { syncDatabase } = require('./models');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const commonRoutes = require('./routes/commonRoutes');
const umpireRoutes = require('./routes/umpireRoutes');

const createServer = async () => {
  await syncDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('match:join', (matchId) => socket.join(`match:${matchId}`));
    socket.on('match:leave', (matchId) => socket.leave(`match:${matchId}`));
    
    // Organizer rooms
    socket.on('organizer:join', (userId) => {
      if (userId) socket.join(`organizer:${userId}`);
      socket.join('organizer:global');
    });
    socket.on('organizer:leave', (userId) => {
      if (userId) socket.leave(`organizer:${userId}`);
      socket.leave('organizer:global');
    });

    socket.on('admin:join', () => {
      socket.join('admin:global');
    });
    socket.on('admin:leave', () => {
      socket.leave('admin:global');
    });

    socket.on('umpire:join', (userId) => {
      if (userId) socket.join(`umpire:${userId}`);
    });
    socket.on('umpire:leave', (userId) => {
      if (userId) socket.leave(`umpire:${userId}`);
    });

    socket.on('player:join', (userId) => {
      if (userId) socket.join(`player:${userId}`);
    });
    socket.on('player:leave', (userId) => {
      if (userId) socket.leave(`player:${userId}`);
    });
  });

  app.set('io', io);

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ message: 'CREASE API - Global Cricket Infrastructure', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/organizer', organizerRoutes);
  app.use('/api/umpire', umpireRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/common', commonRoutes); // Change /api to /api/common
  app.use('/api', commonRoutes); // Keep /api for root routes like /schedules

  app.use(errorHandler);

  return { app, server };
};

module.exports = { createServer };
