const Reservation = require('../models/Reservation');
const reservationService = require('../services/reservationService');
const { generateReservationQR, generateVerificationCode } = require('../services/qrcodeService');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { sendBookingConfirmation, sendAdminNotification, sendCancellationEmail } = require('../config/email');

/**
 * @desc    Create new reservation with QR code
 * @route   POST /api/reservations/book
 * @access  Private (USER)
 */
exports.createReservation = async (req, res, next) => {
  try {
    const { tableId, date, startTime, endTime, guestCount, specialRequests } = req.body;
    const userId = req.user._id;

    // Validate reservation using service layer
    const validation = await reservationService.validateReservation({
      tableId,
      date,
      startTime,
      endTime,
      guestCount,
      userId
    });

    if (!validation.valid) {
      return sendError(res, validation.message, 400);
    }

    // Generate verification code before creating reservation
    const tempId = Date.now().toString();
    const verificationCode = generateVerificationCode(tempId);

    // Create reservation
    const reservation = await Reservation.create({
      userId,
      tableId,
      date,
      startTime,
      endTime,
      guestCount,
      specialRequests: specialRequests || '',
      status: 'BOOKED',
      verificationCode
    });

    // Populate table and user details
    await reservation.populate('tableId', 'tableNumber capacity');
    await reservation.populate('userId', 'name email');

    // Generate QR code
    const qrResult = await generateReservationQR(reservation);
    if (qrResult.success) {
      reservation.qrCode = qrResult.qrCode;
      reservation.verificationCode = qrResult.verificationCode;
      await reservation.save();
    } else {
      console.error('QR Code generation failed:', qrResult.error);
    }

    // Send confirmation emails (non-blocking - won't fail booking if email fails)
    setImmediate(() => {
      sendBookingConfirmation(req.user, reservation, reservation.tableId)
        .catch(err => console.error('❌ Booking confirmation email failed:', err.message));
      
      sendAdminNotification(reservation, req.user, reservation.tableId)
        .catch(err => console.error('❌ Admin notification failed:', err.message));
    });

    sendSuccess(res, { reservation }, 'Reservation created successfully! QR code generated and confirmation email sent.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's reservations
 * @route   GET /api/reservations/my
 * @access  Private (USER)
 */
exports.getMyReservations = async (req, res, next) => {
  try {
    const { status, upcoming } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (status) {
      query.status = status;
    }

    // Filter for upcoming reservations only
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
      query.status = 'BOOKED';
    }

    const reservations = await Reservation.find(query)
      .populate('tableId', 'tableNumber capacity')
      .sort({ date: -1, startTime: -1 });

    sendSuccess(res, { 
      count: reservations.length,
      reservations 
    }, 'Reservations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel reservation
 * @route   DELETE /api/reservations/:id
 * @access  Private (USER)
 */
exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('tableId', 'tableNumber capacity')
      .populate('userId', 'name email');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    // Check if user owns the reservation
    if (reservation.userId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to cancel this reservation', 403);
    }

    // Check if already cancelled
    if (reservation.status === 'CANCELLED') {
      return sendError(res, 'Reservation already cancelled', 400);
    }

    // Check if reservation is completed
    if (reservation.status === 'COMPLETED') {
      return sendError(res, 'Cannot cancel a completed reservation', 400);
    }

    // Check cancellation policy (can't cancel within 2 hours of reservation)
    const reservationDateTime = new Date(`${reservation.date.toISOString().split('T')[0]}T${reservation.startTime}`);
    const now = new Date();
    const hoursDifference = (reservationDateTime - now) / (1000 * 60 * 60);

    if (hoursDifference < 2 && hoursDifference > 0) {
      return sendError(res, 'Cannot cancel reservation less than 2 hours before the booking time', 400);
    }

    // Update status instead of deleting (for audit trail)
    reservation.status = 'CANCELLED';
    await reservation.save();

    // Send cancellation email (non-blocking)
    setImmediate(() => {
      sendCancellationEmail(req.user, reservation, reservation.tableId)
        .catch(err => console.error('❌ Cancellation email failed:', err.message));
    });

    sendSuccess(res, { reservation }, 'Reservation cancelled successfully! Confirmation email sent.');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single reservation
 * @route   GET /api/reservations/:id
 * @access  Private (USER)
 */
exports.getReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('tableId', 'tableNumber capacity')
      .populate('userId', 'name email');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    // Check if user owns the reservation or is admin
    if (reservation.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return sendError(res, 'Not authorized to view this reservation', 403);
    }

    sendSuccess(res, { reservation }, 'Reservation retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update reservation (reschedule)
 * @route   PUT /api/reservations/:id
 * @access  Private (USER)
 */
exports.updateReservation = async (req, res, next) => {
  try {
    const { date, startTime, endTime, guestCount, specialRequests } = req.body;

    const reservation = await Reservation.findById(req.params.id)
      .populate('tableId')
      .populate('userId');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    // Check if user owns the reservation
    if (reservation.userId._id.toString() !== req.user._id.toString()) {
      return sendError(res, 'Not authorized to update this reservation', 403);
    }

    // Check if reservation is cancelled or completed
    if (reservation.status === 'CANCELLED') {
      return sendError(res, 'Cannot update a cancelled reservation', 400);
    }

    if (reservation.status === 'COMPLETED') {
      return sendError(res, 'Cannot update a completed reservation', 400);
    }

    // Validate new time slot if date/time is being changed
    if (date || startTime || endTime || guestCount) {
      const validation = await reservationService.validateReservation({
        tableId: reservation.tableId._id,
        date: date || reservation.date,
        startTime: startTime || reservation.startTime,
        endTime: endTime || reservation.endTime,
        guestCount: guestCount || reservation.guestCount,
        userId: req.user._id,
        excludeReservationId: reservation._id // Exclude current reservation from conflict check
      });

      if (!validation.valid) {
        return sendError(res, validation.message, 400);
      }
    }

    // Update reservation fields
    if (date) reservation.date = date;
    if (startTime) reservation.startTime = startTime;
    if (endTime) reservation.endTime = endTime;
    if (guestCount) reservation.guestCount = guestCount;
    if (specialRequests !== undefined) reservation.specialRequests = specialRequests;

    // Regenerate QR code if booking details changed
    if (date || startTime || endTime) {
      const qrResult = await generateReservationQR(reservation);
      if (qrResult.success) {
        reservation.qrCode = qrResult.qrCode;
        reservation.verificationCode = qrResult.verificationCode;
      }
    }

    await reservation.save();
    await reservation.populate('tableId', 'tableNumber capacity');

    // Send update confirmation email
    setImmediate(() => {
      sendBookingConfirmation(req.user, reservation, reservation.tableId)
        .catch(err => console.error('❌ Update email failed:', err.message));
    });

    sendSuccess(res, { reservation }, 'Reservation updated successfully!');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reservation statistics for user
 * @route   GET /api/reservations/stats
 * @access  Private (USER)
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalBookings, completedBookings, cancelledBookings, upcomingBookings, noShowBookings] = await Promise.all([
      Reservation.countDocuments({ userId }),
      Reservation.countDocuments({ userId, status: 'COMPLETED' }),
      Reservation.countDocuments({ userId, status: 'CANCELLED' }),
      Reservation.countDocuments({ userId, status: 'BOOKED', date: { $gte: today } }),
      Reservation.countDocuments({ userId, status: 'NO_SHOW' })
    ]);

    const pastBookings = await Reservation.countDocuments({ 
      userId, 
      status: 'BOOKED', 
      date: { $lt: today } 
    });

    sendSuccess(res, {
      stats: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        upcoming: upcomingBookings,
        noShow: noShowBookings,
        past: pastBookings
      }
    }, 'User statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check-in using QR code verification
 * @route   POST /api/reservations/checkin
 * @access  Private (ADMIN)
 */
exports.checkInReservation = async (req, res, next) => {
  try {
    const { verificationCode } = req.body;

    if (!verificationCode) {
      return sendError(res, 'Verification code is required', 400);
    }

    // Find reservation by verification code
    const reservation = await Reservation.findOne({ 
      verificationCode: verificationCode.toUpperCase(),
      status: 'BOOKED'
    })
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity');

    if (!reservation) {
      return sendError(res, 'Invalid verification code or reservation not found', 404);
    }

    // Check if reservation is for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reservationDate = new Date(reservation.date);
    reservationDate.setHours(0, 0, 0, 0);

    if (reservationDate.getTime() !== today.getTime()) {
      return sendError(res, `This reservation is for ${reservationDate.toLocaleDateString()}, not today`, 400);
    }

    // Check if already checked in
    if (reservation.checkedIn) {
      return sendError(res, `Guest already checked in at ${new Date(reservation.checkedInAt).toLocaleTimeString()}`, 400);
    }

    // Mark as checked in
    reservation.checkedIn = true;
    reservation.checkedInAt = new Date();
    await reservation.save();

    sendSuccess(res, { 
      reservation,
      message: `Welcome ${reservation.userId.name}! Table ${reservation.tableId.tableNumber} is ready for ${reservation.guestCount} guests.`
    }, 'Check-in successful');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark reservation as completed
 * @route   PATCH /api/reservations/:id/complete
 * @access  Private (ADMIN)
 */
exports.completeReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    if (reservation.status !== 'BOOKED') {
      return sendError(res, 'Only booked reservations can be marked as completed', 400);
    }

    reservation.status = 'COMPLETED';
    await reservation.save();

    sendSuccess(res, { reservation }, 'Reservation marked as completed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark reservation as no-show
 * @route   PATCH /api/reservations/:id/no-show
 * @access  Private (ADMIN)
 */
exports.markNoShow = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    if (reservation.status !== 'BOOKED') {
      return sendError(res, 'Only booked reservations can be marked as no-show', 400);
    }

    reservation.status = 'NO_SHOW';
    await reservation.save();

    sendSuccess(res, { reservation }, 'Reservation marked as no-show successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all check-ins for today
 * @route   GET /api/reservations/checkins/today
 * @access  Private (ADMIN)
 */
exports.getTodayCheckIns = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await Reservation.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity')
      .sort({ startTime: 1 });

    const checkedIn = reservations.filter(r => r.checkedIn).length;
    const pending = reservations.filter(r => !r.checkedIn && r.status === 'BOOKED').length;

    sendSuccess(res, {
      count: reservations.length,
      checkedIn,
      pending,
      reservations
    }, 'Today\'s check-ins retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download reservation QR code
 * @route   GET /api/reservations/:id/qrcode
 * @access  Private (USER)
 */
exports.downloadQRCode = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('tableId', 'tableNumber')
      .populate('userId', 'name');

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    // Check authorization
    if (reservation.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return sendError(res, 'Not authorized to access this QR code', 403);
    }

    if (!reservation.qrCode) {
      return sendError(res, 'QR code not available for this reservation', 404);
    }

    if (reservation.status !== 'BOOKED') {
      return sendError(res, 'QR code only available for active bookings', 400);
    }

    sendSuccess(res, {
      qrCode: reservation.qrCode,
      verificationCode: reservation.verificationCode,
      bookingId: reservation._id,
      tableNumber: reservation.tableId.tableNumber,
      date: reservation.date,
      time: `${reservation.startTime} - ${reservation.endTime}`
    }, 'QR code retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
