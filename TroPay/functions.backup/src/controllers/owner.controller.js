const { Room, Contract, User, Payment, Invoice, MaintenanceRequest } = require('../models');
const logger = require('../utils/logger');

// @desc    Get owner dashboard statistics
// @route   GET /api/owner/dashboard
// @access  Private (Owner only)
const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Get owner's rooms
    const ownerRooms = await Room.find({ owner_id: ownerId });
    const roomIds = ownerRooms.map(room => room._id);

    // Get total houses (buildings) - assuming each room has a building identifier
    const totalHouses = 1; // Default to 1 if no building structure

    // Get total rooms
    const totalRooms = ownerRooms.length;

    // Get occupied rooms
    const occupiedRooms = await Room.countDocuments({ 
      _id: { $in: roomIds },
      status: 'occupied' 
    });

    // Get total tenants
    const totalTenants = await Contract.countDocuments({
      room_id: { $in: roomIds },
      status: 'active'
    });

    // Get unpaid invoices
    const unpaidInvoices = await Invoice.countDocuments({
      contract_id: { 
        $in: await Contract.find({ room_id: { $in: roomIds } }).distinct('_id')
      },
      status: { $in: ['issued', 'overdue'] }
    });

    // Get maintenance issues
    const maintenanceIssues = await MaintenanceRequest.countDocuments({
      room_id: { $in: roomIds },
      status: { $in: ['open', 'in_progress'] }
    });

    // Get monthly revenue data for chart (last 9 months)
    const monthlyRevenue = [];
    const currentDate = new Date();
    
    for (let i = 8; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59);
      
      const contracts = await Contract.find({ 
        room_id: { $in: roomIds } 
      }).distinct('_id');

      const revenue = await Payment.aggregate([
        {
          $lookup: {
            from: 'invoices',
            localField: 'invoice_id',
            foreignField: '_id',
            as: 'invoice'
          }
        },
        {
          $unwind: '$invoice'
        },
        {
          $match: {
            'invoice.contract_id': { $in: contracts },
            status: 'completed',
            created_at: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      monthlyRevenue.push({
        month: `T${currentDate.getMonth() - i + 1}`,
        revenue: revenue.length > 0 ? revenue[0].total / 1000000 : 0 // Convert to millions
      });
    }

    // Get recent notifications
    const notifications = [];

    // Unpaid invoice notifications
    const recentInvoices = await Invoice.find({
      contract_id: { 
        $in: await Contract.find({ room_id: { $in: roomIds } }).distinct('_id')
      },
      status: { $in: ['issued', 'overdue'] }
    })
    .populate({
      path: 'contract_id',
      populate: { path: 'room_id', select: 'code' }
    })
    .sort({ due_date: 1 })
    .limit(2)
    .lean();

    recentInvoices.forEach(invoice => {
      notifications.push({
        id: invoice._id.toString(),
        type: 'unpaid_invoice',
        title: 'Hóa đơn chưa thanh toán',
        description: `Phòng ${invoice.contract_id?.room_id?.code || 'N/A'} - Hạn thanh toán ${new Date(invoice.due_date).toLocaleDateString('vi-VN')}`,
        time: getTimeAgo(invoice.created_at),
        icon: 'document-text',
        color: '#FF3B30'
      });
    });

    // Maintenance notifications
    const maintenanceNotifications = await MaintenanceRequest.find({
      room_id: { $in: roomIds },
      status: { $in: ['open', 'in_progress'] }
    })
    .populate('room_id', 'code')
    .sort({ created_at: -1 })
    .limit(2)
    .lean();

    maintenanceNotifications.forEach(request => {
      notifications.push({
        id: request._id.toString(),
        type: 'maintenance',
        title: 'Sự cố cần xử lý',
        description: `Phòng ${request.room_id?.code || 'N/A'} - ${request.title}`,
        time: getTimeAgo(request.created_at),
        icon: 'construct',
        color: '#FF9500'
      });
    });

    // Contract expiry notifications
    const expiringContracts = await Contract.find({
      room_id: { $in: roomIds },
      status: 'active',
      end_date: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    })
    .populate('room_id', 'code')
    .sort({ end_date: 1 })
    .limit(1)
    .lean();

    expiringContracts.forEach(contract => {
      notifications.push({
        id: contract._id.toString(),
        type: 'contract_expiry',
        title: 'Hợp đồng sắp hết hạn',
        description: `Phòng ${contract.room_id?.code || 'N/A'} - Hết hạn ${new Date(contract.end_date).toLocaleDateString('vi-VN')}`,
        time: getTimeAgo(contract.created_at),
        icon: 'alert-circle',
        color: '#007AFF'
      });
    });

    const dashboardData = {
      summary: {
        totalHouses,
        totalRooms,
        occupiedRooms,
        totalTenants,
        unpaidInvoices,
        maintenanceIssues
      },
      monthlyRevenue,
      notifications: notifications.slice(0, 5)
    };

    logger.info(`Owner ${ownerId} retrieved dashboard data`);

    res.json({
      success: true,
      message: 'Dữ liệu dashboard được lấy thành công',
      data: dashboardData
    });

  } catch (error) {
    logger.error('Get owner dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu dashboard',
      error: error.message
    });
  }
};

// @desc    Get owner rooms with search and filters
// @route   GET /api/owner/rooms
// @access  Private (Owner only)
const getOwnerRoomsWithSearch = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 10, status, search } = req.query;

    // Build filter query
    const filter = { owner_id: ownerId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 }
    };

    const rooms = await Room.paginate(filter, options);

    // Get contract info and tenant for each room
    for (let room of rooms.docs) {
      const activeContract = await Contract.findOne({
        room_id: room._id,
        status: 'active'
      }).populate('tenant_id', 'full_name phone avatar');

      room.currentTenant = activeContract ? {
        name: activeContract.tenant_id.full_name,
        phone: activeContract.tenant_id.phone,
        avatar: activeContract.tenant_id.avatar,
        contract_id: activeContract._id
      } : null;
    }

    // Get summary statistics
    const totalRooms = await Room.countDocuments({ owner_id: ownerId });
    const rentedRooms = await Room.countDocuments({ 
      owner_id: ownerId, 
      status: 'occupied' 
    });
    const emptyRooms = await Room.countDocuments({ 
      owner_id: ownerId, 
      status: 'vacant' 
    });

    logger.info(`Owner ${ownerId} retrieved rooms with search`);

    res.json({
      success: true,
      message: 'Danh sách phòng được lấy thành công',
      data: {
        rooms: rooms.docs,
        summary: {
          totalRooms,
          rentedRooms,
          emptyRooms
        },
        pagination: {
          currentPage: rooms.page,
          totalPages: rooms.totalPages,
          totalDocs: rooms.totalDocs,
          limit: rooms.limit
        }
      }
    });

  } catch (error) {
    logger.error('Get owner rooms with search error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng'
    });
  }
};

// @desc    Get room details with full information
// @route   GET /api/owner/rooms/:id/details
// @access  Private (Owner only)
const getRoomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const room = await Room.findById(id).populate('owner_id', 'full_name phone email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng'
      });
    }

    // Check if room belongs to owner
    if (room.owner_id._id.toString() !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập phòng này'
      });
    }

    // Get current contract and tenant
    const activeContract = await Contract.findOne({
      room_id: id,
      status: 'active'
    }).populate('tenant_id', 'full_name phone email avatar');

    // Get payment history
    const paymentHistory = await Payment.find({
      room_id: id,
      status: 'completed'
    })
    .sort({ created_at: -1 })
    .limit(5)
    .lean();

    const roomData = {
      room: {
        id: room._id,
        code: room.code,
        title: room.title,
        address: room.address,
        capacity: room.capacity,
        monthly_rent: room.monthly_rent,
        deposit: room.deposit,
        status: room.status,
        meta: room.meta
      },
      currentContract: activeContract ? {
        id: activeContract._id,
        start_date: activeContract.start_date,
        end_date: activeContract.end_date,
        rent_amount: activeContract.rent_amount,
        deposit_amount: activeContract.deposit_amount,
        status: activeContract.status
      } : null,
      currentTenant: activeContract ? {
        id: activeContract.tenant_id._id,
        name: activeContract.tenant_id.full_name,
        phone: activeContract.tenant_id.phone,
        email: activeContract.tenant_id.email,
        avatar: activeContract.tenant_id.avatar
      } : null,
      paymentHistory: paymentHistory.map(payment => ({
        id: payment._id,
        month: new Date(payment.created_at).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }),
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at
      }))
    };

    logger.info(`Owner ${ownerId} retrieved room ${id} details`);

    res.json({
      success: true,
      message: 'Thông tin chi tiết phòng được lấy thành công',
      data: roomData
    });

  } catch (error) {
    logger.error('Get room details error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin chi tiết phòng'
    });
  }
};

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Vừa xong';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} phút trước`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} giờ trước`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ngày trước`;
  }
}

// @desc    Get available tenants list
// @route   GET /api/owner/tenants
// @access  Private (Owner only)
const getAvailableTenants = async (req, res) => {
  try {
    const ownerId = req.user.id;
    
    // Get all users with role 'tenant'
    const tenants = await User.find({ 
      role: 'tenant',
      is_active: true 
    })
    .select('_id full_name phone email avatar id_card_number')
    .sort({ full_name: 1 });

    logger.info(`Owner ${ownerId} retrieved ${tenants.length} tenants`);

    res.json({
      success: true,
      message: 'Danh sách người thuê được lấy thành công',
      data: tenants.map(tenant => ({
        _id: tenant._id,
        full_name: tenant.full_name,
        phone: tenant.phone,
        email: tenant.email,
        avatar: tenant.avatar,
        id_card_number: tenant.id_card_number
      }))
    });

  } catch (error) {
    logger.error('Get available tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người thuê'
    });
  }
};

module.exports = {
  getOwnerDashboard,
  getOwnerRoomsWithSearch,
  getRoomDetails,
  getAvailableTenants
};

