const { Notification } = require('../models');
const logger = require('../utils/logger');

/**
 * Notification Service
 * Centralized service for creating and sending notifications
 */

/**
 * Create and send notification to user
 * @param {Object} options - Notification options
 * @param {String} options.userId - User ID to send notification to
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.type - Notification type (contract|invoice|payment|maintenance|service|system)
 * @param {String} options.relatedId - Related resource ID (optional)
 * @param {String} options.relatedModel - Related model name (optional)
 * @param {Object} options.data - Additional data (optional)
 */
const sendNotification = async (options) => {
  try {
    const {
      userId,
      title,
      message,
      type,
      relatedId = null,
      relatedModel = null,
      data = {}
    } = options;

    // Create notification in database
    const notification = new Notification({
      user_id: userId,
      title,
      message,
      type,
      related_id: relatedId,
      related_model: relatedModel,
      data,
      is_read: false
    });

    await notification.save();

    // Send real-time notification via Socket.IO
    if (global.io) {
      global.io.to(`user-${userId}`).emit('notification', {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        related_id: notification.related_id,
        related_model: notification.related_model,
        data: notification.data,
        created_at: notification.created_at
      });

      logger.info(`Notification sent to user ${userId} via Socket.IO`);
    }

    logger.info(`Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 */
const sendBulkNotifications = async (userIds, options) => {
  try {
    const promises = userIds.map(userId => 
      sendNotification({ ...options, userId })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    logger.info(`Bulk notification sent to ${successful}/${userIds.length} users`);
    return { successful, total: userIds.length };
  } catch (error) {
    logger.error('Error sending bulk notifications:', error);
    throw error;
  }
};

/**
 * Notification templates for different events
 */
const NotificationTemplates = {
  // Contract notifications
  CONTRACT_CREATED: (contractData) => ({
    title: 'Hợp đồng mới',
    message: `Hợp đồng thuê phòng ${contractData.roomCode} đã được tạo từ ${new Date(contractData.startDate).toLocaleDateString('vi-VN')}`,
    type: 'contract'
  }),

  CONTRACT_ENDING_SOON: (contractData) => ({
    title: 'Hợp đồng sắp hết hạn',
    message: `Hợp đồng thuê phòng ${contractData.roomCode} sẽ hết hạn vào ${new Date(contractData.endDate).toLocaleDateString('vi-VN')}`,
    type: 'contract'
  }),

  CONTRACT_TERMINATED: (contractData) => ({
    title: 'Hợp đồng đã kết thúc',
    message: `Hợp đồng thuê phòng ${contractData.roomCode} đã được chủ trọ kết thúc`,
    type: 'contract'
  }),

  // Invoice notifications
  INVOICE_CREATED: (invoiceData) => ({
    title: 'Hóa đơn mới',
    message: `Hóa đơn tháng ${invoiceData.month}/${invoiceData.year} đã được phát hành. Số tiền: ${invoiceData.amount.toLocaleString('vi-VN')} ₫`,
    type: 'invoice'
  }),

  INVOICE_DUE_SOON: (invoiceData) => ({
    title: 'Hóa đơn sắp đến hạn',
    message: `Hóa đơn ${invoiceData.invoiceNumber} sẽ đến hạn vào ${new Date(invoiceData.dueDate).toLocaleDateString('vi-VN')}`,
    type: 'invoice'
  }),

  INVOICE_OVERDUE: (invoiceData) => ({
    title: 'Hóa đơn quá hạn',
    message: `Hóa đơn ${invoiceData.invoiceNumber} đã quá hạn thanh toán. Vui lòng thanh toán ngay!`,
    type: 'invoice'
  }),

  // Payment notifications
  PAYMENT_RECEIVED: (paymentData) => ({
    title: 'Thanh toán thành công',
    message: `Đã nhận thanh toán ${paymentData.amount.toLocaleString('vi-VN')} ₫ cho hóa đơn ${paymentData.invoiceNumber}`,
    type: 'transaction'
  }),

  PAYMENT_CONFIRMED: (paymentData) => ({
    title: 'Xác nhận thanh toán',
    message: `Hóa đơn ${paymentData.invoiceNumber} đã được thanh toán thành công qua MoMo`,
    type: 'transaction'
  }),

  // Maintenance notifications
  MAINTENANCE_CREATED: (maintenanceData) => ({
    title: 'Yêu cầu sửa chữa mới',
    message: `Người thuê phòng ${maintenanceData.roomCode} đã báo cáo sự cố: ${maintenanceData.title}`,
    type: 'maintenance'
  }),

  MAINTENANCE_UPDATED: (maintenanceData) => ({
    title: 'Cập nhật sự cố',
    message: `Sự cố "${maintenanceData.title}" đã được cập nhật trạng thái: ${maintenanceData.statusText}`,
    type: 'maintenance'
  }),

  MAINTENANCE_RESOLVED: (maintenanceData) => ({
    title: 'Sự cố đã giải quyết',
    message: `Sự cố "${maintenanceData.title}" đã được xử lý xong`,
    type: 'maintenance'
  }),

  // Service notifications
  METER_READING_UPDATED: (serviceData) => ({
    title: 'Cập nhật chỉ số dịch vụ',
    message: `Chỉ số ${serviceData.serviceName} tháng ${serviceData.month} đã được cập nhật. Tiêu thụ: ${serviceData.consumption} ${serviceData.unit}`,
    type: 'service'
  }),

  // System notifications
  SYSTEM_ANNOUNCEMENT: (data) => ({
    title: data.title || 'Thông báo hệ thống',
    message: data.message,
    type: 'system'
  })
};

/**
 * Helper functions for specific notification scenarios
 */

// Send notification when contract is created
const notifyContractCreated = async (contract, tenantId) => {
  return sendNotification({
    userId: tenantId,
    ...NotificationTemplates.CONTRACT_CREATED({
      roomCode: contract.room_id.code,
      startDate: contract.start_date
    }),
    relatedId: contract._id,
    relatedModel: 'Contract'
  });
};

// Send notification when invoice is created
const notifyInvoiceCreated = async (invoice, tenantId) => {
  const period = new Date(invoice.period_start);
  return sendNotification({
    userId: tenantId,
    ...NotificationTemplates.INVOICE_CREATED({
      month: period.getMonth() + 1,
      year: period.getFullYear(),
      amount: invoice.total_amount
    }),
    relatedId: invoice._id,
    relatedModel: 'Invoice'
  });
};

// Send notification when payment is received (to owner)
const notifyPaymentReceived = async (payment, invoice, ownerId) => {
  return sendNotification({
    userId: ownerId,
    ...NotificationTemplates.PAYMENT_RECEIVED({
      amount: payment.amount,
      invoiceNumber: invoice.invoice_number || `INV-${invoice._id.toString().slice(-8)}`
    }),
    relatedId: payment._id,
    relatedModel: 'Payment'
  });
};

// Send notification when payment is confirmed (to tenant)
const notifyPaymentConfirmed = async (payment, invoice, tenantId) => {
  return sendNotification({
    userId: tenantId,
    ...NotificationTemplates.PAYMENT_CONFIRMED({
      invoiceNumber: invoice.invoice_number || `INV-${invoice._id.toString().slice(-8)}`
    }),
    relatedId: payment._id,
    relatedModel: 'Payment'
  });
};

// Send notification when maintenance request is created (to owner)
const notifyMaintenanceCreated = async (request, ownerId) => {
  return sendNotification({
    userId: ownerId,
    ...NotificationTemplates.MAINTENANCE_CREATED({
      roomCode: request.room_id.code,
      title: request.title
    }),
    relatedId: request._id,
    relatedModel: 'MaintenanceRequest'
  });
};

// Send notification when maintenance is updated (to tenant)
const notifyMaintenanceUpdated = async (request, tenantId) => {
  const statusMap = {
    open: 'Đang chờ xử lý',
    in_progress: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng'
  };

  return sendNotification({
    userId: tenantId,
    ...NotificationTemplates.MAINTENANCE_UPDATED({
      title: request.title,
      statusText: statusMap[request.status] || request.status
    }),
    relatedId: request._id,
    relatedModel: 'MaintenanceRequest'
  });
};

// Send notification when meter reading is updated (to tenant)
const notifyMeterReadingUpdated = async (reading, tenantId) => {
  return sendNotification({
    userId: tenantId,
    ...NotificationTemplates.METER_READING_UPDATED({
      serviceName: reading.service_type_id.name,
      month: reading.reading_month,
      consumption: reading.consumption,
      unit: reading.service_type_id.unit
    }),
    relatedId: reading._id,
    relatedModel: 'MeterReading'
  });
};

module.exports = {
  sendNotification,
  sendBulkNotifications,
  NotificationTemplates,
  // Helper functions
  notifyContractCreated,
  notifyInvoiceCreated,
  notifyPaymentReceived,
  notifyPaymentConfirmed,
  notifyMaintenanceCreated,
  notifyMaintenanceUpdated,
  notifyMeterReadingUpdated
};
