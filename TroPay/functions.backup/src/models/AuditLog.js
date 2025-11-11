const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const auditLogSchema = new mongoose.Schema({
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Actor ID is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  object_type: {
    type: String,
    enum: ['user', 'room', 'contract', 'invoice', 'payment', 'maintenance_request', 'service_rate', 'meter_reading'],
    required: [true, 'Object type is required']
  },
  object_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Object ID is required']
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Add pagination plugin
auditLogSchema.plugin(mongoosePaginate);

// Indexes for better query performance
auditLogSchema.index({ actor_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ object_type: 1 });
auditLogSchema.index({ object_id: 1 });
auditLogSchema.index({ created_at: -1 }); // Descending for recent logs first
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ object_type: 1, object_id: 1, created_at: -1 });

// Virtual for actor details
auditLogSchema.virtual('actor', {
  ref: 'User',
  localField: 'actor_id',
  foreignField: '_id',
  justOne: true
});

// Static method to log an action
auditLogSchema.statics.logAction = function(actorId, action, objectType, objectId, payload = {}) {
  return this.create({
    actor_id: actorId,
    action,
    object_type: objectType,
    object_id: objectId,
    payload
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);