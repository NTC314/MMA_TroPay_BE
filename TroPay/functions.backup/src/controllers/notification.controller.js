const { Notification } = require('../models');
const logger = require('../utils/logger');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, is_read, type } = req.query;
    
    // Build filter
    const filter = { user_id: userId };
    if (is_read !== undefined) {
      filter.is_read = is_read === 'true';
    }
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 }
    };
    
    const notifications = await Notification.paginate(filter, options);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user_id: userId,
      is_read: false
    });
    
    logger.info(`User ${userId} retrieved notifications`);
    
    res.json({
      success: true,
      message: 'Danh sách thông báo được lấy thành công',
      data: {
        notifications: notifications.docs,
        pagination: {
          currentPage: notifications.page,
          totalPages: notifications.totalPages,
          totalDocs: notifications.totalDocs,
          limit: notifications.limit
        },
        unreadCount
      }
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thông báo'
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Notification.countDocuments({
      user_id: userId,
      is_read: false
    });
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số thông báo chưa đọc'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const notification = await Notification.findOne({
      _id: id,
      user_id: userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }
    
    if (!notification.is_read) {
      notification.is_read = true;
      notification.read_at = new Date();
      await notification.save();
    }
    
    logger.info(`User ${userId} marked notification ${id} as read`);
    
    res.json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc',
      data: { notification }
    });
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu thông báo'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { 
        $set: { 
          is_read: true, 
          read_at: new Date() 
        } 
      }
    );
    
    logger.info(`User ${userId} marked all notifications as read`);
    
    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    logger.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu tất cả thông báo'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user_id: userId
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }
    
    logger.info(`User ${userId} deleted notification ${id}`);
    
    res.json({
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo'
    });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/all
// @access  Private
const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await Notification.deleteMany({ user_id: userId });
    
    logger.info(`User ${userId} deleted all notifications`);
    
    res.json({
      success: true,
      message: 'Đã xóa tất cả thông báo',
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    logger.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tất cả thông báo'
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
};
