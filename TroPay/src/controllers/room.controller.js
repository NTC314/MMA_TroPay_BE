const { Room, Contract, User } = require('../models');
const logger = require('../utils/logger');

// @desc    Get tenant's room information
// @route   GET /api/rooms/my-room
// @access  Private (Tenant only)
const getTenantRoom = async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    // Step 1: Find active contract for this tenant
    const activeContract = await Contract.findOne({
      tenant_id: tenantId,
      status: 'active'
    }).populate('room_id', 'code title address capacity monthly_rent deposit meta');

    if (!activeContract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng đang thuê'
      });
    }

    // Step 2: Get room details from populated data
    const room = activeContract.room_id;
    
    // Step 3: Get owner information
    const owner = await User.findById(room.owner_id)
      .select('full_name phone email');

    // Step 4: Prepare response data
    const roomData = {
      room: {
        id: room._id,
        code: room.code,
        title: room.title,
        address: room.address,
        capacity: room.capacity,
        monthly_rent: room.monthly_rent,
        deposit: room.deposit,
        meta: room.meta
      },
      contract: {
        id: activeContract._id,
        start_date: activeContract.start_date,
        end_date: activeContract.end_date,
        rent_amount: activeContract.rent_amount,
        deposit_amount: activeContract.deposit_amount,
        status: activeContract.status
      },
      owner: {
        name: owner.full_name,
        phone: owner.phone,
        email: owner.email
      }
    };

    logger.info(`Tenant ${tenantId} retrieved room information`);

    res.json({
      success: true,
      message: 'Thông tin phòng được lấy thành công',
      data: roomData
    });

  } catch (error) {
    logger.error('Get tenant room error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin phòng'
    });
  }
};

// @desc    Get owner's rooms list
// @route   GET /api/rooms/my-rooms
// @access  Private (Owner only)
const getOwnerRooms = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    // Build filter query
    const filter = { owner_id: ownerId };
    if (status) filter.status = status;

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 }
    };

    const rooms = await Room.paginate(filter, options);

    // Get contract info for each room
    for (let room of rooms.docs) {
      const activeContract = await Contract.findOne({
        room_id: room._id,
        status: 'active'
      }).populate('tenant_id', 'full_name phone');

      room.currentTenant = activeContract ? {
        name: activeContract.tenant_id.full_name,
        phone: activeContract.tenant_id.phone,
        contract_id: activeContract._id
      } : null;
    }

    logger.info(`Owner ${ownerId} retrieved rooms list`);

    res.json({
      success: true,
      message: 'Danh sách phòng được lấy thành công',
      data: {
        rooms: rooms.docs,
        pagination: {
          currentPage: rooms.page,
          totalPages: rooms.totalPages,
          totalDocs: rooms.totalDocs,
          limit: rooms.limit
        }
      }
    });

  } catch (error) {
    logger.error('Get owner rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng'
    });
  }
};

// @desc    Get room details by ID
// @route   GET /api/rooms/:id
// @access  Private (Owner/Admin)
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const room = await Room.findById(id)
      .populate('owner_id', 'full_name phone email');

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng'
      });
    }

    // Check authorization: Owner can see their rooms, Admin can see all
    if (userRole !== 'admin' && room.owner_id._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập phòng này'
      });
    }

    // Get current contract if exists
    const activeContract = await Contract.findOne({
      room_id: id,
      status: 'active'
    }).populate('tenant_id', 'full_name phone email');

    const roomData = {
      room: room,
      currentContract: activeContract,
      currentTenant: activeContract ? activeContract.tenant_id : null
    };

    logger.info(`User ${userId} retrieved room ${id} details`);

    res.json({
      success: true,
      message: 'Thông tin chi tiết phòng được lấy thành công',
      data: roomData
    });

  } catch (error) {
    logger.error('Get room by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin phòng'
    });
  }
};

module.exports = {
  getTenantRoom,
  getOwnerRooms,
  getRoomById
};