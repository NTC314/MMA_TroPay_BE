const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const serviceRateSchema = new mongoose.Schema({
  service_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: [true, 'Service type ID is required']
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null // null means applies to all rooms
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required']
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  calc_formula: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
serviceRateSchema.plugin(mongoosePaginate);

// Indexes for better query performance
serviceRateSchema.index({ service_type_id: 1 });
serviceRateSchema.index({ room_id: 1 });
serviceRateSchema.index({ start_date: 1, end_date: 1 });
serviceRateSchema.index({ service_type_id: 1, room_id: 1, start_date: 1, end_date: 1 });

// Validation: end_date must be after start_date
serviceRateSchema.pre('validate', function(next) {
  if (this.end_date <= this.start_date) {
    this.invalidate('end_date', 'End date must be after start date');
  }
  next();
});

// Virtual for service type details
serviceRateSchema.virtual('serviceType', {
  ref: 'ServiceType',
  localField: 'service_type_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for room details
serviceRateSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('ServiceRate', serviceRateSchema);