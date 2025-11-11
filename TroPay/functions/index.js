/**
 * TroPay Backend API - Firebase Cloud Functions
 * Express app wrapped in Firebase Functions
 */

const functions = require('firebase-functions');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

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
const logger = require('./src/utils/logger');
const swaggerSetup = require('./src/config/swagger');

// Import database connection
const connectDB = require('./src/config/database');

// Initialize Express app
const app = express();

// Connect to database once (reused across function invocations)
let dbConnected = false;
const ensureDbConnection = async () => {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
    logger.info('MongoDB connected successfully');
  }
};

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Firebase Functions automatically handles CORS
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
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
    service: 'TroPay API - Firebase Functions'
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Wrap Express app in Firebase Function
// Ensure DB connection before handling requests
const apiFunction = functions.https.onRequest(async (req, res) => {
  await ensureDbConnection();
  return app(req, res);
});

// Export the Cloud Function
exports.api = apiFunction;

// Optional: Export individual functions for better cold start performance
// exports.auth = functions.https.onRequest(async (req, res) => {
//   await ensureDbConnection();
//   return authRoutes(req, res);
// });

