const { User, Room, Invoice, Payment, Contract, MaintenanceRequest } = require('../models');
const logger = require('../utils/logger');

/**
 * Get Dashboard Statistics
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Count statistics
    const [
      totalUsers,
      totalOwners,
      totalTenants,
      totalRooms,
      occupiedRooms,
      vacantRooms,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      pendingMaintenanceRequests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'tenant' }),
      Room.countDocuments(),
      Room.countDocuments({ status: 'occupied' }),
      Room.countDocuments({ status: 'vacant' }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: 'paid' }),
      Invoice.countDocuments({ status: 'overdue' }),
      MaintenanceRequest.countDocuments({ status: 'pending' }),
    ]);

    // Calculate total revenue
    const paidInvoicesData = await Invoice.find({ status: 'paid' });
    const totalRevenue = paidInvoicesData.reduce((sum, inv) => sum + inv.total_amount, 0);

    // Calculate monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyInvoices = await Invoice.find({
      status: 'paid',
      issued_at: { $gte: startOfMonth },
    });
    const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOwners,
        totalTenants,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        totalRevenue,
        monthlyRevenue,
        pendingMaintenanceRequests,
      },
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    next(error);
  }
};

/**
 * Get All Users with Pagination
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-password -pin -otp -otp_expires',
    };

    const users = await User.paginate(query, options);

    res.json({
      success: true,
      data: users.docs,
      pagination: {
        page: users.page,
        limit: users.limit,
        total: users.totalDocs,
        totalPages: users.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    next(error);
  }
};

/**
 * Get User By ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -pin -otp -otp_expires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    next(error);
  }
};

/**
 * Update User Status
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, kyc_status } = req.body;

    const updateData = {};
    if (typeof is_active !== 'undefined') {
      updateData.is_active = is_active;
    }
    if (kyc_status) {
      updateData.kyc_status = kyc_status;
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -pin -otp -otp_expires');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    logger.info(`Admin updated user ${id} status:`, updateData);

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user,
    });
  } catch (error) {
    logger.error('Error updating user status:', error);
    next(error);
  }
};

/**
 * Get All Transactions with Pagination
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'from_user_id', select: 'full_name phone' },
        { path: 'to_user_id', select: 'full_name phone' },
      ],
    };

    // Note: Assuming you have a Transaction model
    // If not, you can use Payment model instead
    res.json({
      success: true,
      message: 'Transactions endpoint - to be implemented based on your Transaction model',
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    logger.error('Error getting transactions:', error);
    next(error);
  }
};

/**
 * Get All Rooms with Pagination
 */
exports.getRooms = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { created_at: -1 },
      populate: [
        { path: 'owner_id', select: 'full_name phone' },
        { path: 'tenant_id', select: 'full_name phone' },
      ],
    };

    const rooms = await Room.paginate(query, options);

    res.json({
      success: true,
      data: rooms.docs,
      pagination: {
        page: rooms.page,
        limit: rooms.limit,
        total: rooms.totalDocs,
        totalPages: rooms.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error getting rooms:', error);
    next(error);
  }
};

/**
 * Get All Invoices with Pagination
 */
exports.getInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { issued_at: -1 },
      populate: [
        { path: 'contract_id', select: 'tenant_id' },
        { path: 'room_id', select: 'code title address' },
      ],
    };

    const invoices = await Invoice.paginate(query, options);

    res.json({
      success: true,
      data: invoices.docs,
      pagination: {
        page: invoices.page,
        limit: invoices.limit,
        total: invoices.totalDocs,
        totalPages: invoices.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error getting invoices:', error);
    next(error);
  }
};

/**
 * Get All Payments with Pagination
 */
exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { payment_date: -1 },
      populate: [
        { path: 'invoice_id', select: 'total_amount period_start period_end' },
      ],
    };

    const payments = await Payment.paginate(query, options);

    res.json({
      success: true,
      data: payments.docs,
      pagination: {
        page: payments.page,
        limit: payments.limit,
        total: payments.totalDocs,
        totalPages: payments.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error getting payments:', error);
    next(error);
  }
};
