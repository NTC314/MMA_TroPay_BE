const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const reviewSchema = new mongoose.Schema({
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required']
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Tenant ID is required']
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  contract_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: [true, 'Contract ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5']
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  issues: [{
    type: String,
    trim: true
  }],
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
reviewSchema.plugin(mongoosePaginate);

// Indexes for better query performance
reviewSchema.index({ owner_id: 1 });
reviewSchema.index({ tenant_id: 1 });
reviewSchema.index({ room_id: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ sentiment: 1 });
reviewSchema.index({ created_at: -1 });

// Virtual for owner details
reviewSchema.virtual('owner', {
  ref: 'User',
  localField: 'owner_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for tenant details
reviewSchema.virtual('tenant', {
  ref: 'User',
  localField: 'tenant_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for room details
reviewSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Review', reviewSchema);





