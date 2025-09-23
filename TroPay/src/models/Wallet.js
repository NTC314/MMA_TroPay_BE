const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const walletSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
    get: v => Math.round(v * 100) / 100, // Round to 2 decimal places
    set: v => Math.round(v * 100) / 100
  },
  currency: {
    type: String,
    default: 'VND',
    enum: ['VND', 'USD']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_transaction_at: {
    type: Date
  },
  daily_limit: {
    type: Number,
    default: 50000000, // 50 million VND
    min: 0
  },
  monthly_limit: {
    type: Number,
    default: 1000000000, // 1 billion VND
    min: 0
  },
  daily_spent: {
    type: Number,
    default: 0,
    min: 0
  },
  monthly_spent: {
    type: Number,
    default: 0,
    min: 0
  },
  last_daily_reset: {
    type: Date,
    default: Date.now
  },
  last_monthly_reset: {
    type: Date,
    default: Date.now
  }
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
walletSchema.plugin(mongoosePaginate);

// Index for better query performance
walletSchema.index({ user_id: 1 });
walletSchema.index({ is_active: 1 });

// Virtual for available daily limit
walletSchema.virtual('available_daily_limit').get(function() {
  return Math.max(0, this.daily_limit - this.daily_spent);
});

// Virtual for available monthly limit
walletSchema.virtual('available_monthly_limit').get(function() {
  return Math.max(0, this.monthly_limit - this.monthly_spent);
});

// Method to check if transaction amount is within limits
walletSchema.methods.checkLimits = function(amount) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Reset daily limit if needed
  if (this.last_daily_reset < today) {
    this.daily_spent = 0;
    this.last_daily_reset = today;
  }

  // Reset monthly limit if needed
  if (this.last_monthly_reset < thisMonth) {
    this.monthly_spent = 0;
    this.last_monthly_reset = thisMonth;
  }

  const remainingDaily = this.daily_limit - this.daily_spent;
  const remainingMonthly = this.monthly_limit - this.monthly_spent;

  return {
    canProceed: amount <= remainingDaily && amount <= remainingMonthly && amount <= this.balance,
    remainingDaily,
    remainingMonthly,
    sufficientBalance: amount <= this.balance
  };
};

// Method to update spending limits
walletSchema.methods.updateSpending = function(amount) {
  this.daily_spent += amount;
  this.monthly_spent += amount;
  this.last_transaction_at = new Date();
};

// Method to credit balance
walletSchema.methods.credit = function(amount, description = '') {
  this.balance += amount;
  this.last_transaction_at = new Date();
  return this.save();
};

// Method to debit balance
walletSchema.methods.debit = function(amount, description = '') {
  if (this.balance < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance -= amount;
  this.updateSpending(amount);
  return this.save();
};

module.exports = mongoose.model('Wallet', walletSchema);