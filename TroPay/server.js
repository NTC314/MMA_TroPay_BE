const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const adminRoutes = require('./src/routes/admin.routes');
const ownerRoutes = require('./src/routes/owner.routes');
const transactionRoutes = require('./src/routes/transaction.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const roomRoutes = require('./src/routes/room.routes');
const contractRoutes = require('./src/routes/contract.routes');
const serviceRoutes = require('./src/routes/service.routes');
const invoiceRoutes = require('./src/routes/invoice.routes');
const maintenanceRoutes = require('./src/routes/maintenance.routes');
const feedbackRoutes = require('./src/routes/feedback.routes');
const tenantRoutes = require('./src/routes/tenant.routes');
const momoRoutes = require('./src/routes/momo.routes');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const { socketAuth } = require('./src/middleware/socketAuth');
const logger = require('./src/utils/logger');
const swaggerSetup = require('./src/config/swagger');

// Import database connection
const connectDB = require('./src/config/database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL,
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:3001',
        'http://localhost:8081',
        'exp://localhost:8081',
        'exp://192.168.1.100:8081',
        'exp://10.0.2.2:8081'
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for Socket.IO during development
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:3001',
      'http://localhost:8081', // Expo development server
      'exp://localhost:8081',   // Expo development server
      'exp://192.168.1.100:8081', // Expo on local network
      'exp://10.0.2.2:8081'     // Android emulator
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (for MoMo return HTML)
app.use(express.static('public'));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Documentation
swaggerSetup(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/momo', momoRoutes);

// Socket.IO connection handling
io.use(socketAuth); // Apply authentication middleware

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} - User: ${socket.user.id} (${socket.user.role})`);
  
  // Handle manual room join (if needed)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room ${roomId}`);
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.id}:`, error);
  });
});

// Handle Socket.IO connection errors
io.on('connect_error', (error) => {
  logger.error('Socket.IO connection error:', error);
});

// Make io accessible to routes
app.set('io', io);
global.io = io; // Make io globally available for notifications

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Database connection and server start
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      logger.info(`TroPay Backend Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info('MongoDB connected successfully');
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, io };