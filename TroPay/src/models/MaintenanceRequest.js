const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const maintenanceRequestSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolved_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
maintenanceRequestSchema.plugin(mongoosePaginate);

// Indexes for better query performance
maintenanceRequestSchema.index({ room_id: 1 });
maintenanceRequestSchema.index({ tenant_id: 1 });
maintenanceRequestSchema.index({ status: 1 });
maintenanceRequestSchema.index({ priority: 1 });
maintenanceRequestSchema.index({ assigned_to: 1 });
maintenanceRequestSchema.index({ created_at: 1 });

// Virtual for room details
maintenanceRequestSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for tenant details
maintenanceRequestSchema.virtual('tenant', {
  ref: 'User',
  localField: 'tenant_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for assigned user details
maintenanceRequestSchema.virtual('assignedTo', {
  ref: 'User',
  localField: 'assigned_to',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);