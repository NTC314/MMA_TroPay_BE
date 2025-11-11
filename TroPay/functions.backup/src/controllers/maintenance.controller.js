const { MaintenanceRequest, Room, User } = require('../models');
const logger = require('../utils/logger');
const { notifyMaintenanceUpdated } = require('../services/notificationService');

// @desc    Get maintenance requests for owner with filters
// @route   GET /api/maintenance
// @access  Private (Owner)
const getMaintenanceRequests = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Get owner's rooms
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id);
    
    // Build filter
    const filter = { room_id: { $in: roomIds } };
    if (status && status !== 'all') {
      if (status === 'pending') {
        filter.status = 'open';
      } else if (status === 'resolved') {
        filter.status = 'resolved';
      }
    }
    
    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 },
      populate: [
        {
          path: 'room_id',
          select: 'code'
        },
        {
          path: 'tenant_id',
          select: 'full_name phone'
        }
      ]
    };
    
    const requests = await MaintenanceRequest.paginate(filter, options);
    
    // Format requests for response
    const formattedRequests = requests.docs.map(request => ({
      id: request._id,
      title: request.title,
      description: request.description,
      room: {
        code: request.room_id?.code || 'N/A'
      },
      reportedDate: request.created_at,
      status: request.status,
      priority: request.priority
    }));
    
    logger.info(`Owner ${ownerId} retrieved maintenance requests`);
    
    res.json({
      success: true,
      message: 'Danh sách sự cố được lấy thành công',
      data: {
        requests: formattedRequests,
        pagination: {
          currentPage: requests.page,
          totalPages: requests.totalPages,
          totalDocs: requests.totalDocs,
          limit: requests.limit
        }
      }
    });
  } catch (error) {
    logger.error('Get maintenance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sự cố'
    });
  }
};

// @desc    Update maintenance request status
// @route   PUT /api/maintenance/:id/status
// @access  Private (Owner)
const updateMaintenanceStatus = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { status, assigned_to } = req.body;
    
    // Find request and verify it belongs to owner
    const request = await MaintenanceRequest.findById(id)
      .populate('room_id');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự cố'
      });
    }
    
    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());
    
    if (!roomIds.includes(request.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập sự cố này'
      });
    }
    
    // Update status
    request.status = status;
    if (status === 'resolved') {
      request.resolved_at = new Date();
    }
    if (assigned_to) {
      request.assigned_to = assigned_to;
    }
    
    await request.save();
    
    // Send notification to tenant about status update
    if (request.tenant_id) {
      try {
        await notifyMaintenanceUpdated(request, request.tenant_id);
      } catch (notifError) {
        logger.error('Error sending maintenance notification:', notifError);
        // Don't fail the request if notification fails
      }
    }
    
    logger.info(`Owner ${ownerId} updated maintenance request ${id}`);
    
    res.json({
      success: true,
      message: 'Trạng thái sự cố được cập nhật thành công',
      data: request
    });
  } catch (error) {
    logger.error('Update maintenance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái sự cố'
    });
  }
};

// @desc    Get maintenance request details
// @route   GET /api/maintenance/:id
// @access  Private (Owner)
const getMaintenanceRequestDetails = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    
    // Find request
    const request = await MaintenanceRequest.findById(id)
      .populate('room_id', 'code title address')
      .populate('tenant_id', 'full_name phone email avatar')
      .populate('assigned_to', 'full_name phone');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sự cố'
      });
    }
    
    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());
    
    if (!roomIds.includes(request.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập sự cố này'
      });
    }
    
    // Format response
    const requestDetails = {
      id: request._id,
      title: request.title,
      description: request.description,
      status: request.status,
      priority: request.priority,
      room: {
        _id: request.room_id._id,
        code: request.room_id.code,
        title: request.room_id.title,
        address: request.room_id.address
      },
      tenant: request.tenant_id ? {
        _id: request.tenant_id._id,
        full_name: request.tenant_id.full_name,
        phone: request.tenant_id.phone,
        email: request.tenant_id.email,
        avatar: request.tenant_id.avatar
      } : null,
      assignedTo: request.assigned_to ? {
        _id: request.assigned_to._id,
        full_name: request.assigned_to.full_name,
        phone: request.assigned_to.phone
      } : null,
      attachments: request.attachments || [],
      createdAt: request.created_at,
      resolvedAt: request.resolved_at
    };
    
    logger.info(`Owner ${ownerId} retrieved maintenance request ${id} details`);
    
    res.json({
      success: true,
      message: 'Chi tiết sự cố được lấy thành công',
      data: requestDetails
    });
  } catch (error) {
    logger.error('Get maintenance request details error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết sự cố'
    });
  }
};

module.exports = {
  getMaintenanceRequests,
  updateMaintenanceStatus,
  getMaintenanceRequestDetails
};





