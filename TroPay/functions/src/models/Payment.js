const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const paymentSchema = new mongoose.Schema({
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice ID is required']
  },
  paid_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  payment_method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay', 'credit_card'],
    required: [true, 'Payment method is required']
  },
  // Legacy field for backward compatibility
  method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'momo', 'zalopay', 'vnpay', 'credit_card']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transaction_id: {
    type: String,
    index: true
  },
  paid_at: {
    type: Date
  },
  // Legacy field for backward compatibility
  tx_ref: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Metadata for payment gateway response
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Add pagination plugin
paymentSchema.plugin(mongoosePaginate);

// Indexes for better query performance
paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ paid_by: 1 });
paymentSchema.index({ paid_at: 1 });
paymentSchema.index({ payment_method: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transaction_id: 1 });

// Virtual for invoice details
paymentSchema.virtual('invoice', {
  ref: 'Invoice',
  localField: 'invoice_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for paid by user details
paymentSchema.virtual('paidBy', {
  ref: 'User',
  localField: 'paid_by',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Payment', paymentSchema);