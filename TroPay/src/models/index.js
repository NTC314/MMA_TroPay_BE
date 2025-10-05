// Import all models
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Notification = require('./Notification');
const Room = require('./Room');
const Contract = require('./Contract');
const ServiceType = require('./ServiceType');
const ServiceRate = require('./ServiceRate');
const MeterReading = require('./MeterReading');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const MaintenanceRequest = require('./MaintenanceRequest');
const AuditLog = require('./AuditLog');

// Export all models
module.exports = {
  User,
  Wallet,
  Transaction,
  Notification,
  Room,
  Contract,
  ServiceType,
  ServiceRate,
  MeterReading,
  Invoice,
  Payment,
  MaintenanceRequest,
  AuditLog
};