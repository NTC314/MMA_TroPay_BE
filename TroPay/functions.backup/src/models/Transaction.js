const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const transactionSchema = new mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['transfer', 'payment', 'withdraw'].includes(this.transaction_type);
    }
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return ['transfer', 'payment'].includes(this.transaction_type);
    }
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ['transfer', 'deposit', 'withdraw', 'payment', 'refund', 'fee', 'bonus']
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount must be positive'],
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD']
  },
  fee: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  reference_id: {
    type: String,
    unique: true,
    sparse: true
  },
  gateway: {
    type: String,
    enum: ['internal', 'vnpay', 'momo', 'bank', 'manual'],
    default: 'internal'
  },
  gateway_transaction_id: {
    type: String,
    sparse: true
  },
  processed_at: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For rollback purposes
  is_reversed: {
    type: Boolean,
    default: false
  },
  reversed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  // Balances before and after transaction
  sender_balance_before: Number,
  sender_balance_after: Number,
  receiver_balance_before: Number,
  receiver_balance_after: Number
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    getters: true
  },
  toObject: { 
    virtuals: true,
    getters: true
  }
});

// Add pagination plugin
transactionSchema.plugin(mongoosePaginate);

// Indexes for better query performance
transactionSchema.index({ sender_id: 1, createdAt: -1 });
transactionSchema.index({ receiver_id: 1, createdAt: -1 });
transactionSchema.index({ transaction_type: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ reference_id: 1 });
transactionSchema.index({ gateway_transaction_id: 1 });
transactionSchema.index({ createdAt: -1 });

// Virtual for total amount (amount + fee)
transactionSchema.virtual('total_amount').get(function() {
  return this.amount + this.fee;
});

// Virtual for formatted amount
transactionSchema.virtual('formatted_amount').get(function() {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Method to generate unique reference ID
transactionSchema.methods.generateReferenceId = function() {
  const prefix = this.transaction_type.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Pre-save hook to generate reference ID
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.reference_id) {
    this.reference_id = this.generateReferenceId();
  }
  next();
});

// Static method to get transaction statistics
transactionSchema.statics.getStats = async function(userId, startDate, endDate) {
  const matchStage = {
    $or: [{ sender_id: userId }, { receiver_id: userId }],
    status: 'completed',
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$transaction_type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);

  return stats;
};

// Static method to get daily transaction volume
transactionSchema.statics.getDailyVolume = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const volume = await this.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalVolume: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  return volume;
};

module.exports = mongoose.model('Transaction', transactionSchema);