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
    }).populate({
      path: 'room_id',
      select: 'code title address capacity monthly_rent deposit meta owner_id'
    });

    if (!activeContract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng đang thuê'
      });
    }

    // Step 2: Get room details from populated data
    const room = activeContract.room_id;
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin phòng'
      });
    }
    
    // Step 3: Get owner information
    const owner = await User.findById(room.owner_id)
      .select('full_name phone email');

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin chủ trọ'
      });
    }

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

// @desc    Create new room
// @route   POST /api/rooms
// @access  Private (Owner only)
const createRoom = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { code, title, address, capacity, monthly_rent, deposit, status, meta } = req.body;

    // Check if room code already exists for this owner
    const existingRoom = await Room.findOne({ owner_id: ownerId, code });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Mã phòng đã tồn tại'
      });
    }

    // Create new room
    const room = new Room({
      owner_id: ownerId,
      code,
      title,
      address,
      capacity,
      monthly_rent,
      deposit,
      status: status || 'vacant',
      meta: meta || {}
    });

    await room.save();

    logger.info(`Owner ${ownerId} created room ${room._id}`);

    res.status(201).json({
      success: true,
      message: 'Phòng được tạo thành công',
      data: { room }
    });

  } catch (error) {
    logger.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phòng',
      error: error.message
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private (Owner only)
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const updateData = req.body;

    // Find room and verify ownership
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng'
      });
    }

    if (room.owner_id.toString() !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật phòng này'
      });
    }

    // If updating code, check for duplicates
    if (updateData.code && updateData.code !== room.code) {
      const existingRoom = await Room.findOne({ 
        owner_id: ownerId, 
        code: updateData.code,
        _id: { $ne: id }
      });
      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: 'Mã phòng đã tồn tại'
        });
      }
    }

    // Update room
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        room[key] = updateData[key];
      }
    });

    await room.save();

    logger.info(`Owner ${ownerId} updated room ${id}`);

    res.json({
      success: true,
      message: 'Phòng được cập nhật thành công',
      data: { room }
    });

  } catch (error) {
    logger.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật phòng',
      error: error.message
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private (Owner only)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    // Find room and verify ownership
    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng'
      });
    }

    if (room.owner_id.toString() !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xóa phòng này'
      });
    }

    // Check if room has active contract
    const activeContract = await Contract.findOne({
      room_id: id,
      status: 'active'
    });

    if (activeContract) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa phòng đang có hợp đồng hoạt động'
      });
    }

    // Delete room
    await Room.findByIdAndDelete(id);

    logger.info(`Owner ${ownerId} deleted room ${id}`);

    res.json({
      success: true,
      message: 'Phòng được xóa thành công'
    });

  } catch (error) {
    logger.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa phòng',
      error: error.message
    });
  }
};

module.exports = {
  getTenantRoom,
  getOwnerRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom
};