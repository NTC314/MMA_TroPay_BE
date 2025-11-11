const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from socket handshake
 */
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      role: user.role,
      full_name: user.full_name,
      email: user.email
    };

    // Join user's personal room
    socket.join(`user-${socket.user.id}`);

    logger.info(`Socket authenticated: User ${socket.user.id} (${socket.user.role})`);
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    return next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = { socketAuth };
