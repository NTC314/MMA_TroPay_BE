const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const meterReadingSchema = new mongoose.Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  service_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: [true, 'Service type ID is required']
  },
  reading_date: {
    type: Date,
    required: [true, 'Reading date is required']
  },
  reading_value: {
    type: Number,
    required: [true, 'Reading value is required'],
    min: [0, 'Reading value cannot be negative']
  },
  source: {
    type: String,
    enum: ['manual', 'iot'],
    default: 'manual'
  },
  recorded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorded by user ID is required']
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
meterReadingSchema.plugin(mongoosePaginate);

// Indexes for better query performance
meterReadingSchema.index({ room_id: 1 });
meterReadingSchema.index({ service_type_id: 1 });
meterReadingSchema.index({ reading_date: 1 });
meterReadingSchema.index({ room_id: 1, service_type_id: 1, reading_date: 1 });
meterReadingSchema.index({ recorded_by: 1 });

// Compound unique index to prevent duplicate readings for same room, service type, and date
meterReadingSchema.index({ 
  room_id: 1, 
  service_type_id: 1, 
  reading_date: 1 
}, { unique: true });

// Virtual for room details
meterReadingSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for service type details
meterReadingSchema.virtual('serviceType', {
  ref: 'ServiceType',
  localField: 'service_type_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for recorded by user details
meterReadingSchema.virtual('recordedBy', {
  ref: 'User',
  localField: 'recorded_by',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('MeterReading', meterReadingSchema);