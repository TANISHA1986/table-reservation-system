const mongoose = require('mongoose');

/**
 * Table Schema representing restaurant tables
 * Tables can be activated/deactivated by admins
 */
const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: [true, 'Table number is required'],
    unique: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Table capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [20, 'Capacity cannot exceed 20']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster table lookups
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ isActive: 1 });

module.exports = mongoose.model('Table', tableSchema);
