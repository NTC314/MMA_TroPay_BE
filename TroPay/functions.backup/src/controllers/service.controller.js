const { ServiceType, ServiceRate, MeterReading, Room, Contract } = require('../models');
const logger = require('../utils/logger');

// @desc    Get service types
// @route   GET /api/services/types
// @access  Public
const getServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find();
    
    logger.info(`Retrieved ${serviceTypes.length} service types`);
    
    res.json({
      success: true,
      message: 'Danh sách loại dịch vụ được lấy thành công',
      data: serviceTypes
    });
  } catch (error) {
    logger.error('Get service types error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách loại dịch vụ'
    });
  }
};

// @desc    Get current service rates for owner
// @route   GET /api/services/rates
// @access  Private (Owner)
const getServiceRates = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const currentDate = new Date();
    
    // Get owner's rooms
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id);
    
    // Get active service rates (global and room-specific)
    const rates = await ServiceRate.find({
      $and: [
        { start_date: { $lte: currentDate } },
        { end_date: { $gte: currentDate } }
      ],
      $or: [
        { room_id: { $in: roomIds } },
        { room_id: null }
      ]
    })
    .populate('service_type_id')
    .populate('room_id', 'code')
    .sort({ 'service_type_id.code': 1 });
    
    // Group rates by service type
    const groupedRates = {};
    
    rates.forEach(rate => {
      const serviceCode = rate.service_type_id.code;
      if (!groupedRates[serviceCode]) {
        groupedRates[serviceCode] = {
          service_type: {
            _id: rate.service_type_id._id,
            code: rate.service_type_id.code,
            name: rate.service_type_id.name,
            unit: rate.service_type_id.unit,
            description: rate.service_type_id.description
          },
          rate: rate.unit_price,
          room_rates: {}
        };
      }
      
      if (rate.room_id) {
        groupedRates[serviceCode].room_rates[rate.room_id._id] = rate.unit_price;
      }
    });
    
    logger.info(`Owner ${ownerId} retrieved service rates`);
    
    res.json({
      success: true,
      message: 'Danh sách bảng giá được lấy thành công',
      data: groupedRates
    });
  } catch (error) {
    logger.error('Get service rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy bảng giá dịch vụ'
    });
  }
};

// @desc    Update service rates
// @route   PUT /api/services/rates
// @access  Private (Owner)
const updateServiceRates = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { rates } = req.body; // Array of { service_type_id, unit_price }
    
    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ'
      });
    }
    
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const updatedRates = [];
    
    for (const rateData of rates) {
      const { service_type_id, unit_price } = rateData;
      
      // Check if rate exists for this period
      let existingRate = await ServiceRate.findOne({
        service_type_id,
        room_id: null, // Global rate
        start_date: { $lte: currentDate },
        end_date: { $gte: currentDate }
      });
      
      if (existingRate) {
        // Update existing rate
        existingRate.unit_price = unit_price;
        await existingRate.save();
      } else {
        // Create new rate
        const newRate = new ServiceRate({
          service_type_id,
          room_id: null,
          start_date: startDate,
          end_date: endDate,
          unit_price
        });
        await newRate.save();
        existingRate = newRate;
      }
      
      updatedRates.push(existingRate);
    }
    
    logger.info(`Owner ${ownerId} updated service rates`);
    
    res.json({
      success: true,
      message: 'Bảng giá dịch vụ được cập nhật thành công',
      data: updatedRates
    });
  } catch (error) {
    logger.error('Update service rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật bảng giá dịch vụ'
    });
  }
};

// @desc    Get monthly meter readings for owner's rooms
// @route   GET /api/services/meter-readings
// @access  Private (Owner)
const getMeterReadings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { month, year } = req.query;
    
    // Get owner's rooms with tenant info
    const rooms = await Room.find({ owner_id: ownerId })
      .populate('tenant_id', 'name email')
      .sort({ code: 1 });
    
    // Default to current month
    const targetDate = month && year 
      ? new Date(year, month - 1, 1)
      : new Date();
    
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Get all service types
    const serviceTypes = await ServiceType.find();
    
    // Get meter readings for this month
    const readings = await MeterReading.find({
      room_id: { $in: rooms.map(r => r._id) },
      reading_date: { $gte: startOfMonth, $lte: endOfMonth }
    })
    .populate('service_type_id')
    .sort({ room_id: 1, 'service_type_id.code': 1 });
    
    // Build result with ALL rooms
    const result = rooms.map(room => {
      const roomData = {
        room: {
          _id: room._id,
          code: room.code,
          status: room.status
        },
        readings: {}
      };
      
      // Add tenant info if exists
      if (room.tenant_id) {
        roomData.room.tenant = {
          _id: room.tenant_id._id,
          name: room.tenant_id.name,
          email: room.tenant_id.email
        };
      }
      
      // Initialize all service types with 0
      serviceTypes.forEach(service => {
        roomData.readings[service.code] = 0;
      });
      
      // Fill in actual readings if they exist
      readings.forEach(reading => {
        if (reading.room_id.toString() === room._id.toString()) {
          const serviceCode = reading.service_type_id.code;
          roomData.readings[serviceCode] = reading.reading_value;
        }
      });
      
      return roomData;
    });
    
    logger.info(`Owner ${ownerId} retrieved meter readings for ${rooms.length} rooms`);
    
    res.json({
      success: true,
      message: 'Chỉ số sử dụng được lấy thành công',
      data: result
    });
  } catch (error) {
    logger.error('Get meter readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chỉ số sử dụng'
    });
  }
};

// @desc    Create meter readings
// @route   POST /api/services/meter-readings
// @access  Private (Owner)
const createMeterReadings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { readings, month, year } = req.body; // Array of { room_id, service_code, reading_value } or old format { room_id, service_type_id, reading_value }
    
    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ'
      });
    }
    
    // Get owner's rooms to validate
    const rooms = await Room.find({ owner_id: ownerId });
    const roomIds = rooms.map(room => room._id.toString());
    
    // Get all service types for code lookup
    const serviceTypes = await ServiceType.find();
    const serviceTypeMap = {};
    serviceTypes.forEach(st => {
      serviceTypeMap[st.code] = st._id;
      serviceTypeMap[st._id.toString()] = st._id; // Also support direct ID
    });
    
    // Use provided month/year or default to current month
    const targetDate = month && year 
      ? new Date(year, month - 1, 1)
      : new Date();
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    logger.info(`Creating meter readings for date range:`, {
      month,
      year,
      startOfMonth: startOfMonth.toISOString(),
      endOfMonth: endOfMonth.toISOString()
    });
    
    const createdReadings = [];
    
    for (const readingData of readings) {
      const { room_id, service_code, service_type_id, reading_value } = readingData;
      
      // Validate room belongs to owner
      if (!roomIds.includes(room_id.toString())) {
        continue; // Skip invalid room
      }
      
      // Get service type ID (support both service_code and service_type_id)
      const serviceId = service_code 
        ? serviceTypeMap[service_code] 
        : service_type_id;
      
      if (!serviceId) {
        logger.warn(`Invalid service code/id for room ${room_id}`);
        continue;
      }
      
      // Check if reading already exists
      const existingReading = await MeterReading.findOne({
        room_id,
        service_type_id: serviceId,
        reading_date: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      if (existingReading) {
        // Update existing reading
        existingReading.reading_value = reading_value;
        existingReading.recorded_by = ownerId;
        await existingReading.save();
        createdReadings.push(existingReading);
      } else {
        // Create new reading with the target date (middle of the month for consistency)
        const readingDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 15);
        const reading = new MeterReading({
          room_id,
          service_type_id: serviceId,
          reading_date: readingDate,
          reading_value,
          source: 'manual',
          recorded_by: ownerId
        });
        await reading.save();
        createdReadings.push(reading);
      }
    }
    
    logger.info(`Owner ${ownerId} created/updated ${createdReadings.length} meter readings`);
    
    res.json({
      success: true,
      message: 'Chỉ số sử dụng được cập nhật thành công',
      data: createdReadings
    });
  } catch (error) {
    logger.error('Create meter readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật chỉ số sử dụng'
    });
  }
};

module.exports = {
  getServiceTypes,
  getServiceRates,
  updateServiceRates,
  getMeterReadings,
  createMeterReadings
};





