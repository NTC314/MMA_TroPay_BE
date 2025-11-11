const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10,15}$/, 'Phone number must be 10-15 digits']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  full_name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  date_of_birth: {
    type: Date
  },
  avatar: {
    type: String
  },
  id_card_number: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: [12, 'ID card number cannot exceed 12 characters']
  },
  id_card_front_image: {
    type: String
  },
  id_card_back_image: {
    type: String
  },
  address: {
    type: String
  },
  role: {
    type: String,
    enum: ['owner', 'tenant', 'admin'],
    default: 'tenant'
  },
  kyc_status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  is_phone_verified: {
    type: Boolean,
    default: false
  },
  is_email_verified: {
    type: Boolean,
    default: false
  },
  pin: {
    type: String,
    maxlength: 6,
    select: false
  },
  last_login: {
    type: Date
  },
  profile: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deleted_at: {
    type: Date
  },
  otp: {
    type: String,
    select: false
  },
  otp_expires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
userSchema.plugin(mongoosePaginate);

// Index for better query performance
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ id_card_number: 1 });
userSchema.index({ role: 1 });
userSchema.index({ kyc_status: 1 });

// Virtual for wallet
userSchema.virtual('wallet', {
  ref: 'Wallet',
  localField: '_id',
  foreignField: 'user_id',
  justOne: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('pin') || !this.pin) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.pin = await bcrypt.hash(this.pin, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Compare PIN method
userSchema.methods.comparePin = async function(pin) {
  if (!this.pin) return false;
  return await bcrypt.compare(pin, this.pin);
};

// Generate OTP method
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otp_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Verify OTP method
userSchema.methods.verifyOTP = function(otp) {
  if (!this.otp || !this.otp_expires) return false;
  if (Date.now() > this.otp_expires) return false;
  return this.otp === otp;
};

module.exports = mongoose.model('User', userSchema);