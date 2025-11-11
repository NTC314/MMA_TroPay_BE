const { Invoice, Room, Contract, Payment, User } = require('../models');
const logger = require('../utils/logger');
const { notifyInvoiceCreated } = require('../services/notificationService');

// @desc    Get invoices for owner with filters
// @route   GET /api/invoices
// @access  Private (Owner)
const getInvoices = async (req, res) => {
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
      sort: { issued_at: -1 },
      populate: [
        {
          path: 'room_id',
          select: 'code title'
        },
        {
          path: 'contract_id',
          select: 'start_date end_date',
          populate: {
            path: 'tenant_id',
            select: 'full_name phone avatar'
          }
        }
      ]
    };
    
    const invoices = await Invoice.paginate(filter, options);
    
    // Calculate totals
    const totalInvoices = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$total_amount' }
        }
      }
    ]);
    
    let totalCollected = 0;
    let totalUncollected = 0;
    
    totalInvoices.forEach(item => {
      if (item._id === 'paid') {
        totalCollected += item.total;
      } else {
        totalUncollected += item.total;
      }
    });
    
    // Format invoices for response
    const formattedInvoices = invoices.docs.map(invoice => ({
      id: invoice._id,
      tenant: {
        name: invoice.contract_id?.tenant_id?.full_name || 'N/A',
        phone: invoice.contract_id?.tenant_id?.phone || 'N/A',
        avatar: invoice.contract_id?.tenant_id?.avatar
      },
      room: {
        code: invoice.room_id?.code || 'N/A'
      },
      period: `${new Date(invoice.period_start).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`,
      amount: invoice.total_amount,
      status: invoice.status,
      due_date: invoice.due_date,
      issued_at: invoice.issued_at
    }));
    
    logger.info(`Owner ${ownerId} retrieved invoices`);
    
    res.json({
      success: true,
      message: 'Danh sách hóa đơn được lấy thành công',
      data: {
        invoices: formattedInvoices,
        summary: {
          totalCollected,
          totalUncollected
        },
        pagination: {
          currentPage: invoices.page,
          totalPages: invoices.totalPages,
          totalDocs: invoices.totalDocs,
          limit: invoices.limit
        }
      }
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hóa đơn'
    });
  }
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private (Owner)
const getInvoiceStats = async (req, res) => {
  try {
    const ownerId = req.user.id;
    
    // Get owner's rooms
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id);
    
    // Get invoice statistics
    const stats = await Invoice.aggregate([
      {
        $match: { room_id: { $in: roomIds } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total_amount' }
        }
      }
    ]);
    
    let totalCollected = 0;
    let totalUncollected = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    
    stats.forEach(stat => {
      if (stat._id === 'paid') {
        totalCollected = stat.totalAmount;
        paidCount = stat.count;
      } else if (stat._id === 'issued') {
        totalUncollected += stat.totalAmount;
        unpaidCount += stat.count;
      } else if (stat._id === 'overdue') {
        totalUncollected += stat.totalAmount;
        unpaidCount += stat.count;
      }
    });
    
    logger.info(`Owner ${ownerId} retrieved invoice stats`);
    
    res.json({
      success: true,
      message: 'Thống kê hóa đơn được lấy thành công',
      data: {
        totalCollected,
        totalUncollected,
        paidCount,
        unpaidCount
      }
    });
  } catch (error) {
    logger.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê hóa đơn'
    });
  }
};

// @desc    Get invoice details
// @route   GET /api/invoices/:id
// @access  Private (Owner)
const getInvoiceDetails = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    
    // Find invoice
    const invoice = await Invoice.findById(id)
      .populate('room_id', 'code title address')
      .populate({
        path: 'contract_id',
        populate: {
          path: 'tenant_id',
          select: 'full_name phone email avatar'
        }
      })
      .populate('items.service_type_id', 'name unit');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }
    
    // Check if room belongs to owner
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());
    
    if (!roomIds.includes(invoice.room_id._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập hóa đơn này'
      });
    }
    
    // Format response
    const invoiceDetails = {
      id: invoice._id,
      invoiceNumber: invoice.invoice_number || `INV-${invoice._id.toString().slice(-8).toUpperCase()}`,
      room: {
        _id: invoice.room_id._id,
        code: invoice.room_id.code,
        title: invoice.room_id.title,
        address: invoice.room_id.address
      },
      tenant: invoice.contract_id?.tenant_id ? {
        _id: invoice.contract_id.tenant_id._id,
        full_name: invoice.contract_id.tenant_id.full_name,
        phone: invoice.contract_id.tenant_id.phone,
        email: invoice.contract_id.tenant_id.email,
        avatar: invoice.contract_id.tenant_id.avatar
      } : null,
      period: {
        start: invoice.period_start,
        end: invoice.period_end
      },
      status: invoice.status,
      items: invoice.items.map(item => ({
        _id: item._id,
        item_type: item.item_type,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity,
        unit_price: item.unit_price,
        service_type: item.service_type_id ? {
          name: item.service_type_id.name,
          unit: item.service_type_id.unit
        } : null
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount || 0,
      tax: invoice.tax || 0,
      total_amount: invoice.total_amount,
      issued_at: invoice.issued_at,
      due_date: invoice.due_date,
      paid_at: invoice.paid_at,
      notes: invoice.notes
    };
    
    logger.info(`Owner ${ownerId} retrieved invoice ${id} details`);
    
    res.json({
      success: true,
      message: 'Chi tiết hóa đơn được lấy thành công',
      data: invoiceDetails
    });
  } catch (error) {
    logger.error('Get invoice details error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết hóa đơn'
    });
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private (Owner)
const createInvoice = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { contract_id, room_id, period_start, period_end, items, due_date, notes } = req.body;
    
    // Validate room belongs to owner
    const room = await Room.findOne({ _id: room_id, owner_id: ownerId });
    
    if (!room) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền tạo hóa đơn cho phòng này'
      });
    }
    
    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.amount;
    });
    
    const tax = 0; // Can be calculated if needed
    const discount = 0;
    const total_amount = subtotal + tax - discount;
    
    // Create invoice
    const invoice = new Invoice({
      contract_id,
      room_id,
      period_start: new Date(period_start),
      period_end: new Date(period_end),
      items,
      subtotal,
      tax,
      discount,
      total_amount,
      status: 'issued',
      issued_at: new Date(),
      due_date: new Date(due_date),
      notes
    });
    
    await invoice.save();
    
    // Get contract to find tenant ID
    const contract = await Contract.findById(contract_id);
    if (contract && contract.tenant_id) {
      // Send notification to tenant
      try {
        await notifyInvoiceCreated(invoice, contract.tenant_id);
      } catch (notifError) {
        logger.error('Error sending invoice notification:', notifError);
        // Don't fail the request if notification fails
      }
    }
    
    logger.info(`Owner ${ownerId} created invoice ${invoice._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Hóa đơn được tạo thành công',
      data: { invoiceId: invoice._id }
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hóa đơn',
      error: error.message
    });
  }
};

module.exports = {
  getInvoices,
  getInvoiceStats,
  getInvoiceDetails,
  createInvoice
};





