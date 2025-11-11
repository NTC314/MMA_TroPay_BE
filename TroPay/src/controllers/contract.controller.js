const { Contract, Room, User } = require('../models');
const logger = require('../utils/logger');
const { notifyContractCreated } = require('../services/notificationService');

// @desc    Get contracts list for owner
// @route   GET /api/contracts
// @access  Private (Owner only)
const getContracts = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    // Get owner's rooms
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id);

    // Build filter
    const filter = { room_id: { $in: roomIds } };
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Pagination options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 },
      populate: [
        {
          path: 'room_id',
          select: 'code title address'
        },
        {
          path: 'tenant_id',
          select: 'full_name phone email avatar'
        }
      ]
    };

    const contracts = await Contract.paginate(filter, options);

    // Format contracts for response
    const formattedContracts = contracts.docs.map(contract => ({
      id: contract._id,
      room: {
        _id: contract.room_id._id,
        code: contract.room_id.code,
        title: contract.room_id.title,
        address: contract.room_id.address
      },
      tenant: {
        _id: contract.tenant_id._id,
        full_name: contract.tenant_id.full_name,
        phone: contract.tenant_id.phone,
        email: contract.tenant_id.email,
        avatar: contract.tenant_id.avatar
      },
      start_date: contract.start_date,
      end_date: contract.end_date,
      rent_amount: contract.rent_amount,
      deposit_amount: contract.deposit_amount,
      status: contract.status,
      created_at: contract.created_at
    }));

    logger.info(`Owner ${ownerId} retrieved contracts`);

    res.json({
      success: true,
      message: 'Danh sách hợp đồng được lấy thành công',
      data: {
        contracts: formattedContracts,
        pagination: {
          currentPage: contracts.page,
          totalPages: contracts.totalPages,
          totalDocs: contracts.totalDocs,
          limit: contracts.limit
        }
      }
    });

  } catch (error) {
    logger.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hợp đồng'
    });
  }
};

// @desc    Get contract details
// @route   GET /api/contracts/:id
// @access  Private (Owner only)
const getContractDetails = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    // Find contract
    const contract = await Contract.findById(id)
      .populate('room_id', 'code title address capacity monthly_rent deposit')
      .populate('tenant_id', 'full_name phone email avatar id_card_number date_of_birth');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng'
      });
    }

    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());

    if (!roomIds.includes(contract.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập hợp đồng này'
      });
    }

    logger.info(`Owner ${ownerId} retrieved contract ${id} details`);

    res.json({
      success: true,
      message: 'Chi tiết hợp đồng được lấy thành công',
      data: contract
    });

  } catch (error) {
    logger.error('Get contract details error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết hợp đồng'
    });
  }
};

// @desc    Create contract
// @route   POST /api/contracts
// @access  Private (Owner only)
const createContract = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { 
      room_id, 
      tenant_id, 
      start_date, 
      end_date, 
      rent_amount, 
      deposit_amount,
      payment_day,
      terms 
    } = req.body;

    // Validate required fields
    if (!room_id || !tenant_id || !start_date || !end_date || !rent_amount || !deposit_amount) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Validate ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(room_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID phòng không hợp lệ'
      });
    }
    if (!mongoose.Types.ObjectId.isValid(tenant_id)) {
      return res.status(400).json({
        success: false,
        message: 'ID người thuê không hợp lệ'
      });
    }

    // Validate room belongs to owner
    const room = await Room.findOne({ _id: room_id, owner_id: ownerId });

    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền tạo hợp đồng cho phòng này'
      });
    }

    // Check if room already has active contract
    const existingContract = await Contract.findOne({
      room_id,
      status: 'active'
    });

    if (existingContract) {
      return res.status(400).json({
        success: false,
        message: 'Phòng đã có hợp đồng đang hoạt động'
      });
    }

    // Validate tenant exists
    const tenant = await User.findById(tenant_id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người thuê'
      });
    }

    if (tenant.role !== 'tenant') {
      return res.status(400).json({
        success: false,
        message: 'Người dùng không phải là tenant'
      });
    }

    // Create contract
    const contract = new Contract({
      room_id,
      tenant_id,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      rent_amount,
      deposit_amount,
      payment_day: payment_day || 1,
      terms: terms || {},
      status: 'active'
    });

    await contract.save();

    // Update room status to occupied
    room.status = 'occupied';
    await room.save();

    // Populate room data for notification
    await contract.populate('room_id', 'code');

    // Send notification to tenant
    try {
      await notifyContractCreated(contract, tenant_id);
    } catch (notifError) {
      logger.error('Error sending contract notification:', notifError);
      // Don't fail the request if notification fails
    }

    logger.info(`Owner ${ownerId} created contract ${contract._id}`);

    res.status(201).json({
      success: true,
      message: 'Hợp đồng được tạo thành công',
      data: { contract }
    });

  } catch (error) {
    logger.error('Create contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hợp đồng',
      error: error.message
    });
  }
};

// @desc    Update contract
// @route   PUT /api/contracts/:id
// @access  Private (Owner only)
const updateContract = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Find contract
    const contract = await Contract.findById(id).populate('room_id');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng'
      });
    }

    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());

    if (!roomIds.includes(contract.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền cập nhật hợp đồng này'
      });
    }

    // Update contract
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        contract[key] = updateData[key];
      }
    });

    await contract.save();

    // If contract is terminated, update room status
    if (contract.status === 'terminated' || contract.status === 'expired') {
      const room = await Room.findById(contract.room_id);
      room.status = 'vacant';
      await room.save();
    }

    logger.info(`Owner ${ownerId} updated contract ${id}`);

    res.json({
      success: true,
      message: 'Hợp đồng được cập nhật thành công',
      data: { contract }
    });

  } catch (error) {
    logger.error('Update contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật hợp đồng',
      error: error.message
    });
  }
};

// @desc    Terminate contract
// @route   PUT /api/contracts/:id/terminate
// @access  Private (Owner only)
const terminateContract = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { reason, termination_date } = req.body;

    // Find contract
    const contract = await Contract.findById(id).populate('room_id');

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng'
      });
    }

    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());

    if (!roomIds.includes(contract.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền kết thúc hợp đồng này'
      });
    }

    if (contract.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Hợp đồng không ở trạng thái hoạt động'
      });
    }

    // Terminate contract
    contract.status = 'terminated';
    contract.termination_date = termination_date ? new Date(termination_date) : new Date();
    contract.termination_reason = reason;

    await contract.save();

    // Update room status
    const room = await Room.findById(contract.room_id);
    room.status = 'vacant';
    await room.save();

    logger.info(`Owner ${ownerId} terminated contract ${id}`);

    res.json({
      success: true,
      message: 'Hợp đồng đã được kết thúc',
      data: { contract }
    });

  } catch (error) {
    logger.error('Terminate contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kết thúc hợp đồng',
      error: error.message
    });
  }
};

module.exports = {
  getContracts,
  getContractDetails,
  createContract,
  updateContract,
  terminateContract
};
