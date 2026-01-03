const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: [true, 'Table ID is required']
  },
  date: {
    type: Date,
    required: [true, 'Reservation date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:MM)']
  },
  status: {
    type: String,
    enum: ['BOOKED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
    default: 'BOOKED'
  },
  guestCount: {
    type: Number,
    required: [true, 'Guest count is required'],
    min: [1, 'Guest count must be at least 1']
  },
  qrCode: {
    type: String,
    default: null
  },
  verificationCode: {
    type: String,
    default: null
  },
  checkedIn: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  specialRequests: {
    type: String,
    maxlength: [500, 'Special requests cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes
reservationSchema.index({ tableId: 1, date: 1, status: 1 });
reservationSchema.index({ userId: 1, date: 1, status: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ date: 1 });
reservationSchema.index({ verificationCode: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
