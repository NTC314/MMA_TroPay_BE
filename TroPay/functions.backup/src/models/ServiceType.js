const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Service type code is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: [true, 'Service type name is required'],
    trim: true
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: false
});

// Index for better query performance
serviceTypeSchema.index({ code: 1 });

module.exports = mongoose.model('ServiceType', serviceTypeSchema);