const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Invoice Item Schema (embedded)
const invoiceItemSchema = new mongoose.Schema({
  item_type: {
    type: String,
    enum: ['rent', 'service', 'other'],
    required: [true, 'Item type is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unit_price: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  service_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    default: null
  }
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  contract_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: [true, 'Contract ID is required']
  },
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room ID is required']
  },
  period_start: {
    type: Date,
    required: [true, 'Period start date is required']
  },
  period_end: {
    type: Date,
    required: [true, 'Period end date is required']
  },
  total_amount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['issued', 'paid', 'overdue', 'cancelled'],
    default: 'issued'
  },
  issued_at: {
    type: Date,
    default: Date.now
  },
  due_date: {
    type: Date,
    required: [true, 'Due date is required']
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  items: [invoiceItemSchema] // Embedded invoice items
}, {
  timestamps: false
});

// Add pagination plugin
invoiceSchema.plugin(mongoosePaginate);

// Indexes for better query performance
invoiceSchema.index({ contract_id: 1 });
invoiceSchema.index({ room_id: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ due_date: 1 });
invoiceSchema.index({ issued_at: 1 });
invoiceSchema.index({ period_start: 1, period_end: 1 });
invoiceSchema.index({ contract_id: 1, status: 1 });

// Validation: period_end must be after period_start
invoiceSchema.pre('validate', function(next) {
  if (this.period_end <= this.period_start) {
    this.invalidate('period_end', 'Period end must be after period start');
  }
  next();
});

// Virtual for contract details
invoiceSchema.virtual('contract', {
  ref: 'Contract',
  localField: 'contract_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for room details
invoiceSchema.virtual('room', {
  ref: 'Room',
  localField: 'room_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for payments
invoiceSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'invoice_id'
});

module.exports = mongoose.model('Invoice', invoiceSchema);