const { Invoice, Room, Contract, Payment, User, MaintenanceRequest, MeterReading, ServiceType, ServiceRate } = require('../models');
const logger = require('../utils/logger');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { notifyMaintenanceCreated, notifyPaymentConfirmed, notifyPaymentReceived } = require('../services/notificationService');

// @desc    Get tenant dashboard data
// @route   GET /api/tenant/dashboard
// @access  Private (Tenant)
const getTenantDashboard = async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    // Get tenant's active contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    }).populate('room_id');
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    // Get current unpaid invoice (prioritize overdue, then issued/pending)
    const currentInvoice = await Invoice.findOne({
      contract_id: contract._id,
      status: { $in: ['issued', 'overdue'] } // 'issued' = chưa thanh toán
    })
    .sort({ due_date: 1 }) // Sort by due date ascending (oldest first)
    .populate('items.service_type_id');
    
    // Get service usage for current month
    const currentMonth = moment().format('YYYY-MM');
    const serviceUsage = await getServiceUsageForMonth(contract.room_id._id, currentMonth);
    
    // Get recent maintenance requests
    const recentRequests = await MaintenanceRequest.find({
      tenant_id: tenantId
    })
    .sort({ created_at: -1 })
    .limit(5)
    .populate('room_id', 'code');
    
    // Get recent payments
    const recentPayments = await Payment.find({
      invoice_id: { $in: await Invoice.find({ contract_id: contract._id }).distinct('_id') }
    })
    .sort({ created_at: -1 })
    .limit(5)
    .populate('invoice_id');
    
    logger.info(`Tenant ${tenantId} retrieved dashboard data`);
    
    res.json({
      success: true,
      message: 'Dữ liệu dashboard được lấy thành công',
      data: {
        tenant: {
          id: req.user.id,
          full_name: req.user.full_name,
          name: req.user.full_name,
          email: req.user.email,
          phone: req.user.phone
        },
        contract: {
          id: contract._id,
          room: {
            code: contract.room_id.code,
            title: contract.room_id.title
          },
          startDate: contract.start_date,
          endDate: contract.end_date,
          monthlyRent: contract.monthly_rent
        },
        currentInvoice: currentInvoice ? {
          id: currentInvoice._id,
          totalAmount: currentInvoice.total_amount,
          status: currentInvoice.status,
          dueDate: currentInvoice.due_date,
          items: currentInvoice.items.map(item => ({
            type: item.item_type,
            description: item.description,
            amount: item.amount,
            serviceType: item.service_type_id?.name || null
          }))
        } : null,
        serviceUsage,
        recentRequests: recentRequests.map(req => ({
          id: req._id,
          title: req.title,
          status: req.status,
          priority: req.priority,
          createdAt: req.created_at,
          room: req.room_id.code
        })),
        recentPayments: recentPayments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.created_at,
          invoiceId: payment.invoice_id._id
        }))
      }
    });
  } catch (error) {
    logger.error('Get tenant dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu dashboard'
    });
  }
};

// @desc    Get invoices for tenant
// @route   GET /api/tenant/invoices
// @access  Private (Tenant)
const getTenantInvoices = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { status, search, page = 1, limit = 20 } = req.query;
    
    // Get tenant's contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    // Build filter
    const filter = { contract_id: contract._id };
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Search functionality
    if (search) {
      filter.$or = [
        { 'items.description': { $regex: search, $options: 'i' } }
      ];
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
          path: 'items.service_type_id',
          select: 'name'
        }
      ]
    };
    
    const invoices = await Invoice.paginate(filter, options);
    
    // Format invoices for response
    const formattedInvoices = invoices.docs.map(invoice => {
      const period = moment(invoice.period_start).format('MMMM YYYY');
      const invoiceNumber = `INV-${moment(invoice.period_start).format('YYYY-MM')}`;
      
      return {
        id: invoice._id,
        period,
        invoiceNumber,
        totalAmount: invoice.total_amount,
        status: invoice.status,
        dueDate: invoice.due_date,
        issuedAt: invoice.issued_at,
        items: invoice.items.map(item => ({
          type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          amount: item.amount,
          serviceType: item.service_type_id?.name || null
        }))
      };
    });
    
    logger.info(`Tenant ${tenantId} retrieved invoices`);
    
    res.json({
      success: true,
      message: 'Danh sách hóa đơn được lấy thành công',
      data: {
        invoices: formattedInvoices,
        pagination: {
          currentPage: invoices.page,
          totalPages: invoices.totalPages,
          totalDocs: invoices.totalDocs,
          limit: invoices.limit
        }
      }
    });
  } catch (error) {
    logger.error('Get tenant invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách hóa đơn'
    });
  }
};

// @desc    Get invoice by ID for tenant
// @route   GET /api/tenant/invoices/:id
// @access  Private (Tenant)
const getTenantInvoiceById = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const invoiceId = req.params.id;
    
    // Get tenant's contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    // Get invoice
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      contract_id: contract._id
    })
    .populate('room_id', 'code title')
    .populate('items.service_type_id', 'name')
    .populate('payments');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }
    
    const period = moment(invoice.period_start).format('MMMM YYYY');
    const invoiceNumber = `INV-${moment(invoice.period_start).format('YYYY-MM')}`;
    
    logger.info(`Tenant ${tenantId} retrieved invoice ${invoiceId}`);
    
    res.json({
      success: true,
      message: 'Chi tiết hóa đơn được lấy thành công',
      data: {
        id: invoice._id,
        period,
        invoiceNumber,
        room: {
          code: invoice.room_id.code,
          title: invoice.room_id.title
        },
        totalAmount: invoice.total_amount,
        status: invoice.status,
        dueDate: invoice.due_date,
        issuedAt: invoice.issued_at,
        items: invoice.items.map(item => ({
          type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          amount: item.amount,
          serviceType: item.service_type_id?.name || null
        })),
        payments: invoice.payments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          createdAt: payment.created_at
        }))
      }
    });
  } catch (error) {
    logger.error('Get tenant invoice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết hóa đơn'
    });
  }
};

// @desc    Get service usage for tenant
// @route   GET /api/tenant/services/usage
// @access  Private (Tenant)
const getTenantServiceUsage = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { months = 6 } = req.query;
    
    // Get tenant's contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    // Get service usage for last N months
    const serviceUsage = await getServiceUsageForMonths(contract.room_id, parseInt(months));
    
    // Get current month usage
    const currentMonth = moment().format('YYYY-MM');
    const currentUsage = await getServiceUsageForMonth(contract.room_id, currentMonth);
    
    // Get AI prediction (simplified version)
    const prediction = await getServiceUsagePrediction(contract.room_id, serviceUsage);
    
    logger.info(`Tenant ${tenantId} retrieved service usage`);
    
    res.json({
      success: true,
      message: 'Dữ liệu sử dụng dịch vụ được lấy thành công',
      data: {
        currentUsage,
        historicalData: serviceUsage,
        prediction
      }
    });
  } catch (error) {
    logger.error('Get tenant service usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy dữ liệu sử dụng dịch vụ'
    });
  }
};

// @desc    Get service history for tenant
// @route   GET /api/tenant/services/history
// @access  Private (Tenant)
const getTenantServiceHistory = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { limit = 6 } = req.query;
    
    // Get tenant's contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    logger.info(`Getting service history for room ${contract.room_id}, limit: ${limit} months`);
    
    // Get service usage for last N months
    const months = parseInt(limit);
    const history = [];
    let totalElectricity = 0;
    let totalWater = 0;
    let totalInternet = 0;
    let totalCost = 0;
    let monthsWithData = 0;
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStr = moment().subtract(i, 'months').format('YYYY-MM');
      const usage = await getServiceUsageForMonth(contract.room_id, monthStr);
      
      const monthData = {
        month: moment(monthStr).format('MM/YYYY'), // Format as MM/YYYY for display
        monthValue: monthStr, // Keep YYYY-MM format for sorting/filtering
        totalCost: 0,
        electricity: {
          value: usage.electricity?.value || 0,
          cost: usage.electricity?.cost || 0,
          unit: 'kWh'
        },
        water: {
          value: usage.water?.value || 0,
          cost: usage.water?.cost || 0,
          unit: 'm³'
        },
        internet: {
          value: usage.internet?.value || 0,
          cost: usage.internet?.cost || 0,
          unit: 'tháng'
        }
      };
      
      monthData.totalCost = monthData.electricity.cost + monthData.water.cost + monthData.internet.cost;
      
      if (monthData.totalCost > 0) {
        monthsWithData++;
        totalElectricity += monthData.electricity.value;
        totalWater += monthData.water.value;
        totalInternet += monthData.internet.value;
        totalCost += monthData.totalCost;
      }
      
      history.push(monthData);
    }
    
    // Calculate summary
    const summary = {
      totalMonths: monthsWithData,
      averageElectricity: monthsWithData > 0 ? Math.round(totalElectricity / monthsWithData) : 0,
      averageWater: monthsWithData > 0 ? Math.round(totalWater / monthsWithData) : 0,
      averageInternet: monthsWithData > 0 ? Math.round(totalInternet / monthsWithData) : 0,
      totalCost: Math.round(totalCost),
      averageCost: monthsWithData > 0 ? Math.round(totalCost / monthsWithData) : 0
    };
    
    logger.info(`Service history retrieved: ${history.length} months, ${monthsWithData} with data`);
    
    res.json({
      success: true,
      message: 'Lịch sử sử dụng dịch vụ được lấy thành công',
      data: {
        history,
        summary
      }
    });
  } catch (error) {
    logger.error('Get tenant service history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử sử dụng dịch vụ'
    });
  }
};

// @desc    Get maintenance requests for tenant
// @route   GET /api/tenant/maintenance-requests
// @access  Private (Tenant)
const getTenantMaintenanceRequests = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Build filter
    const filter = { tenant_id: tenantId };
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
          select: 'code'
        },
        {
          path: 'assigned_to',
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
      status: request.status,
      priority: request.priority,
      room: request.room_id.code,
      createdAt: request.created_at,
      assignedTo: request.assigned_to ? {
        name: request.assigned_to.full_name,
        phone: request.assigned_to.phone
      } : null,
      resolvedAt: request.resolved_at
    }));
    
    logger.info(`Tenant ${tenantId} retrieved maintenance requests`);
    
    res.json({
      success: true,
      message: 'Danh sách yêu cầu bảo trì được lấy thành công',
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
    logger.error('Get tenant maintenance requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách yêu cầu bảo trì'
    });
  }
};

// @desc    Create maintenance request
// @route   POST /api/tenant/maintenance-requests
// @access  Private (Tenant)
const createMaintenanceRequest = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { title, description, priority = 'normal', incidentType } = req.body;
    
    // Get tenant's contract
    const contract = await Contract.findOne({ 
      tenant_id: tenantId, 
      status: 'active' 
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hợp đồng thuê phòng'
      });
    }
    
    // Get uploaded image URLs
    const images = req.files ? req.files.map(file => file.path) : [];
    
    // Create maintenance request
    const maintenanceRequest = new MaintenanceRequest({
      room_id: contract.room_id,
      tenant_id: tenantId,
      title,
      description,
      priority,
      status: 'open',
      images
    });
    
    await maintenanceRequest.save();
    
    // Get room info and owner for notification
    const room = await Room.findById(contract.room_id).populate('owner_id');
    if (room && room.owner_id) {
      // Populate room info for notification
      await maintenanceRequest.populate('room_id', 'code');
      
      // Send notification to owner
      try {
        await notifyMaintenanceCreated(maintenanceRequest, room.owner_id._id);
      } catch (notifError) {
        logger.error('Error sending maintenance notification:', notifError);
        // Don't fail the request if notification fails
      }
    }
    
    logger.info(`Tenant ${tenantId} created maintenance request ${maintenanceRequest._id}`);
    
    res.status(201).json({
      success: true,
      message: 'Yêu cầu bảo trì đã được tạo thành công',
      data: {
        id: maintenanceRequest._id,
        title: maintenanceRequest.title,
        status: maintenanceRequest.status,
        createdAt: maintenanceRequest.created_at
      }
    });
  } catch (error) {
    logger.error('Create maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo yêu cầu bảo trì'
    });
  }
};

// @desc    Get maintenance request by ID
// @route   GET /api/tenant/maintenance-requests/:id
// @access  Private (Tenant)
const getMaintenanceRequestById = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const requestId = req.params.id;
    
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant_id: tenantId
    })
    .populate('room_id', 'code title')
    .populate('assigned_to', 'full_name phone email')
    .populate('tenant_id', 'full_name phone');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu bảo trì'
      });
    }
    
    logger.info(`Tenant ${tenantId} retrieved maintenance request ${requestId}`);
    
    res.json({
      success: true,
      message: 'Chi tiết yêu cầu bảo trì được lấy thành công',
      data: {
        id: request._id,
        title: request.title,
        description: request.description,
        status: request.status,
        priority: request.priority,
        room: {
          code: request.room_id.code,
          title: request.room_id.title
        },
        tenant: {
          name: request.tenant_id.full_name,
          phone: request.tenant_id.phone
        },
        assignedTo: request.assigned_to ? {
          name: request.assigned_to.full_name,
          phone: request.assigned_to.phone,
          email: request.assigned_to.email
        } : null,
        createdAt: request.created_at,
        resolvedAt: request.resolved_at
      }
    });
  } catch (error) {
    logger.error('Get maintenance request by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết yêu cầu bảo trì'
    });
  }
};

// @desc    Update maintenance request
// @route   PUT /api/tenant/maintenance-requests/:id
// @access  Private (Tenant)
const updateMaintenanceRequest = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const requestId = req.params.id;
    const { title, description, priority } = req.body;
    
    const request = await MaintenanceRequest.findOne({
      _id: requestId,
      tenant_id: tenantId
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu bảo trì'
      });
    }
    
    // Only allow updates if status is 'open'
    if (request.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể chỉnh sửa yêu cầu khi trạng thái là "Mở"'
      });
    }
    
    // Update fields
    if (title) request.title = title;
    if (description) request.description = description;
    if (priority) request.priority = priority;
    
    await request.save();
    
    logger.info(`Tenant ${tenantId} updated maintenance request ${requestId}`);
    
    res.json({
      success: true,
      message: 'Yêu cầu bảo trì đã được cập nhật thành công',
      data: {
        id: request._id,
        title: request.title,
        status: request.status,
        updatedAt: request.updatedAt
      }
    });
  } catch (error) {
    logger.error('Update maintenance request error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật yêu cầu bảo trì'
    });
  }
};

// Helper functions
const getServiceUsageForMonth = async (roomId, month) => {
  const startDate = moment(month).startOf('month').toDate();
  const endDate = moment(month).endOf('month').toDate();
  
  logger.info(`Getting service usage for room ${roomId}, month ${month}, date range: ${startDate} to ${endDate}`);
  
  // Try to get data from MeterReading first
  const readings = await MeterReading.find({
    room_id: roomId,
    reading_date: { $gte: startDate, $lte: endDate }
  }).populate('service_type_id');
  
  logger.info(`Found ${readings.length} meter readings`);
  
  const usage = {};
  
  if (readings && readings.length > 0) {
    // Use MeterReading data if available
    readings.forEach(reading => {
      const serviceType = reading.service_type_id;
      const serviceCode = serviceType.code; // Use code (electricity, water, internet, etc.)
      
      logger.info(`Processing reading: ${serviceCode}, value: ${reading.reading_value}`);
      
      if (!usage[serviceCode]) {
        usage[serviceCode] = {
          value: 0,
          unit: serviceType.unit,
          cost: 0
        };
      }
      usage[serviceCode].value += reading.reading_value;
    });
    
    // Calculate costs based on service rates
    for (const [serviceCode, data] of Object.entries(usage)) {
      const serviceType = await ServiceType.findOne({ code: serviceCode });
      if (serviceType) {
        const serviceRate = await ServiceRate.findOne({
          service_type_id: serviceType._id,
          room_id: null,  // Global rate
          start_date: { $lte: endDate },
          end_date: { $gte: startDate }
        });
        
        if (serviceRate) {
          data.cost = data.value * serviceRate.unit_price;
          logger.info(`Calculated cost for ${serviceCode}: ${data.value} x ${serviceRate.unit_price} = ${data.cost}`);
        }
      }
    }
  } else {
    logger.info('No meter readings found, trying to get data from invoices');
    // Fallback: Get data from invoices
    const invoices = await Invoice.find({
      room_id: roomId,
      period_start: { $gte: startDate, $lte: endDate }
    }).populate('items.service_type_id');
    
    logger.info(`Found ${invoices.length} invoices`);
    
    if (invoices && invoices.length > 0) {
      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          if (item.item_type === 'service') {
            // Map service types
            let serviceKey = null;
            if (item.description.toLowerCase().includes('điện') || item.description.toLowerCase().includes('electric')) {
              serviceKey = 'electricity';
            } else if (item.description.toLowerCase().includes('nước') || item.description.toLowerCase().includes('water')) {
              serviceKey = 'water';
            } else if (item.description.toLowerCase().includes('internet') || item.description.toLowerCase().includes('wifi')) {
              serviceKey = 'internet';
            }
            
            if (serviceKey) {
              if (!usage[serviceKey]) {
                usage[serviceKey] = {
                  value: 0,
                  unit: serviceKey === 'electricity' ? 'kWh' : serviceKey === 'water' ? 'm³' : 'tháng',
                  cost: 0
                };
              }
              usage[serviceKey].value += item.quantity || 0;
              usage[serviceKey].cost += item.amount || 0;
            }
          }
        });
      });
    }
  }
  
  logger.info(`Final usage data:`, JSON.stringify(usage));
  return usage;
};

const getServiceUsageForMonths = async (roomId, months) => {
  const data = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const month = moment().subtract(i, 'months').format('YYYY-MM');
    const usage = await getServiceUsageForMonth(roomId, month);
    data.push({
      month,
      usage
    });
  }
  
  return data;
};

const getServiceUsagePrediction = async (roomId, historicalData) => {
  // Simple prediction based on average usage
  const predictions = {};
  
  // Calculate average usage for each service type
  const serviceTypes = ['electricity', 'water', 'internet'];
  
  serviceTypes.forEach(serviceType => {
    const values = historicalData
      .map(data => data.usage[serviceType]?.value || 0)
      .filter(value => value > 0);
    
    if (values.length > 0) {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      predictions[serviceType] = Math.round(average);
    }
  });
  
  // Calculate total predicted cost
  let totalCost = 0;
  for (const [serviceType, value] of Object.entries(predictions)) {
    const serviceRate = await ServiceRate.findOne({
      service_type: serviceType,
      is_active: true
    });
    if (serviceRate) {
      totalCost += value * serviceRate.rate;
    }
  }
  
  return {
    predictions,
    totalCost: Math.round(totalCost),
    confidence: 78 // Mock confidence level
  };
};

// @desc    Export invoice as PDF
// @route   GET /api/tenant/invoices/:id/pdf
// @access  Private (Tenant)
const exportInvoicePDF = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const invoiceId = req.params.id;
    
    // Get invoice with all populated data
    const invoice = await Invoice.findById(invoiceId)
      .populate('room_id', 'code title address')
      .populate({
        path: 'contract_id',
        populate: {
          path: 'tenant_id',
          select: 'full_name phone email'
        }
      });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hóa đơn'
      });
    }
    
    // Check if invoice belongs to tenant
    if (!invoice.contract_id || invoice.contract_id.tenant_id._id.toString() !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập hóa đơn này'
      });
    }
    
    // Add tenant_id to invoice object for PDF generator
    invoice.tenant_id = invoice.contract_id.tenant_id;
    
    // Create temp directory if not exists
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate PDF
    const filename = `invoice_${invoiceId}_${Date.now()}.pdf`;
    const outputPath = path.join(tempDir, filename);
    
    await generateInvoicePDF(invoice, outputPath);
    
    // Send PDF file
    res.download(outputPath, `HoaDon_${invoice.room_id?.code || invoiceId}.pdf`, (err) => {
      // Delete temp file after sending
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      if (err) {
        logger.error('Error sending PDF:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi file PDF'
          });
        }
      } else {
        logger.info(`Tenant ${tenantId} exported invoice ${invoiceId} as PDF`);
      }
    });
    
  } catch (error) {
    logger.error('Export invoice PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xuất hóa đơn PDF'
    });
  }
};

module.exports = {
  getTenantDashboard,
  getTenantInvoices,
  getTenantInvoiceById,
  getTenantServiceUsage,
  getTenantServiceHistory,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  exportInvoicePDF
};


