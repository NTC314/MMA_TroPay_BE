const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const roomSchema = new mongoose.Schema({
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  code: {
    type: String,
    required: [true, 'Room code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  title: {
    type: String,
    required: [true, 'Room title is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Room address is required'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Room capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied', 'maintenance'],
    default: 'vacant'
  },
  monthly_rent: {
    type: Number,
    required: [true, 'Monthly rent is required'],
    min: [0, 'Monthly rent cannot be negative']
  },
  deposit: {
    type: Number,
    required: [true, 'Deposit is required'],
    min: [0, 'Deposit cannot be negative']
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
roomSchema.plugin(mongoosePaginate);

// Indexes for better query performance
roomSchema.index({ owner_id: 1 });
roomSchema.index({ code: 1 });
roomSchema.index({ status: 1 });
roomSchema.index({ owner_id: 1, status: 1 });

// Virtual for current contract
roomSchema.virtual('currentContract', {
  ref: 'Contract',
  localField: '_id',
  foreignField: 'room_id',
  justOne: true,
  match: { status: 'active' }
});

module.exports = mongoose.model('Room', roomSchema);