const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['transaction', 'kyc', 'security', 'promotion', 'system', 'general'],
    default: 'general',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true
  },
  read_at: {
    type: Date
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For deep linking in mobile app
  action_url: {
    type: String
  },
  // For grouping related notifications
  group_id: {
    type: String,
    index: true
  },
  // Expiration date for temporary notifications
  expires_at: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
notificationSchema.plugin(mongoosePaginate);

// Indexes for better query performance
notificationSchema.index({ user_id: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, is_read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });

// Virtual for time since creation
notificationSchema.virtual('time_ago').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return 'Vừa xong';
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.is_read = true;
  this.read_at = new Date();
  return this.save();
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user_id: userId, is_read: false },
    { 
      is_read: true, 
      read_at: new Date() 
    }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    user_id: userId,
    is_read: false
  });
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  
  // Emit socket event if socket.io is available
  if (global.io) {
    global.io.to(`user-${data.user_id}`).emit('new_notification', {
      notification: notification.toJSON(),
      unread_count: await this.getUnreadCount(data.user_id)
    });
  }
  
  return notification;
};

// Static method to create transaction notification
notificationSchema.statics.createTransactionNotification = function(userId, transaction, type = 'sent') {
  const messages = {
    sent: {
      title: 'Giao dịch thành công',
      message: `Bạn đã chuyển ${transaction.formatted_amount} đến ${transaction.receiver?.full_name || 'người nhận'}`
    },
    received: {
      title: 'Nhận tiền thành công',
      message: `Bạn đã nhận ${transaction.formatted_amount} từ ${transaction.sender?.full_name || 'người gửi'}`
    },
    deposit: {
      title: 'Nạp tiền thành công',
      message: `Bạn đã nạp ${transaction.formatted_amount} vào ví`
    },
    withdraw: {
      title: 'Rút tiền thành công',
      message: `Bạn đã rút ${transaction.formatted_amount} từ ví`
    }
  };

  const notificationData = messages[type] || messages.sent;

  return this.createNotification({
    user_id: userId,
    title: notificationData.title,
    message: notificationData.message,
    type: 'transaction',
    data: {
      transaction_id: transaction._id,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount
    },
    action_url: `/transactions/${transaction._id}`
  });
};

module.exports = mongoose.model('Notification', notificationSchema);