const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const contractSchema = new mongoose.Schema({
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tenant ID is required']
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required']
  },
  rent_amount: {
    type: Number,
    required: [true, 'Rent amount is required'],
    min: [0, 'Rent amount cannot be negative']
  },
  deposit_amount: {
    type: Number,
    required: [true, 'Deposit amount is required'],
    min: [0, 'Deposit amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'breached'],
    default: 'active'
  },
  terms: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
contractSchema.plugin(mongoosePaginate);

// Indexes for better query performance
contractSchema.index({ room_id: 1 });
contractSchema.index({ tenant_id: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ start_date: 1, end_date: 1 });
contractSchema.index({ room_id: 1, status: 1 });

// Validation: end_date must be after start_date
contractSchema.pre('validate', function(next) {
  if (this.end_date <= this.start_date) {
    this.invalidate('end_date', 'End date must be after start date');
  }
  next();
});

// Virtual for room details
contractSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for tenant details
contractSchema.virtual('tenant', {
  ref: 'User',
  localField: 'tenant_id',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Contract', contractSchema);