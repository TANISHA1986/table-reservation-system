const Reservation = require('../models/Reservation');
const Table = require('../models/Table');

/**
 * Service layer containing core business logic
 * Separates business rules from controller logic for better testability
 */

class ReservationService {
  /**
   * Check if a time slot overlaps with existing reservations
   * Prevents double booking on the same table
   * 
   * Logic:
   * Two time slots overlap if:
   * - New start time is before existing end time AND
   * - New end time is after existing start time
   */
  async checkTimeSlotConflict(tableId, date, startTime, endTime, excludeReservationId = null) {
    const query = {
      tableId,
      date: new Date(date),
      status: 'BOOKED'
    };

    // Exclude current reservation when updating
    if (excludeReservationId) {
      query._id = { $ne: excludeReservationId };
    }

    const existingReservations = await Reservation.find(query);

    for (const reservation of existingReservations) {
      const existingStart = reservation.startTime;
      const existingEnd = reservation.endTime;

      // Check for overlap
      if (startTime < existingEnd && endTime > existingStart) {
        return {
          conflict: true,
          message: `Time slot conflicts with existing reservation (${existingStart} - ${existingEnd})`
        };
      }
    }

    return { conflict: false };
  }

  /**
   * Check if user already has a booking at the same time
   * Prevents users from booking multiple tables simultaneously
   */
  async checkUserConflict(userId, date, startTime, endTime, excludeReservationId = null) {
    const query = {
      userId,
      date: new Date(date),
      status: 'BOOKED'
    };

    if (excludeReservationId) {
      query._id = { $ne: excludeReservationId };
    }

    const userReservations = await Reservation.find(query);

    for (const reservation of userReservations) {
      if (startTime < reservation.endTime && endTime > reservation.startTime) {
        return {
          conflict: true,
          message: `You already have a reservation at this time (${reservation.startTime} - ${reservation.endTime})`
        };
      }
    }

    return { conflict: false };
  }

  /**
   * Validate that reservation date/time is in the future
   */
  validateFutureDateTime(date, startTime) {
    const reservationDateTime = new Date(`${date}T${startTime}`);
    const now = new Date();

    if (reservationDateTime <= now) {
      return {
        valid: false,
        message: 'Reservation must be in the future'
      };
    }

    return { valid: true };
  }

  /**
   * Validate that end time is after start time
   */
  validateTimeRange(startTime, endTime) {
    if (startTime >= endTime) {
      return {
        valid: false,
        message: 'End time must be after start time'
      };
    }

    return { valid: true };
  }

  /**
   * Validate table exists, is active, and has sufficient capacity
   */
  async validateTable(tableId, guestCount) {
    const table = await Table.findById(tableId);

    if (!table) {
      return {
        valid: false,
        message: 'Table not found'
      };
    }

    if (!table.isActive) {
      return {
        valid: false,
        message: 'Table is currently inactive'
      };
    }

    if (guestCount > table.capacity) {
      return {
        valid: false,
        message: `Guest count (${guestCount}) exceeds table capacity (${table.capacity})`
      };
    }

    return { valid: true, table };
  }

  /**
   * Main validation orchestrator for creating reservations
   * Runs all validation checks in sequence
   */
  async validateReservation(data) {
    const { tableId, date, startTime, endTime, guestCount, userId } = data;

    // 1. Validate time range
    const timeRangeCheck = this.validateTimeRange(startTime, endTime);
    if (!timeRangeCheck.valid) {
      return timeRangeCheck;
    }

    // 2. Validate future date/time
    const futureCheck = this.validateFutureDateTime(date, startTime);
    if (!futureCheck.valid) {
      return futureCheck;
    }

    // 3. Validate table
    const tableCheck = await this.validateTable(tableId, guestCount);
    if (!tableCheck.valid) {
      return tableCheck;
    }

    // 4. Check table time slot conflicts
    const slotConflict = await this.checkTimeSlotConflict(tableId, date, startTime, endTime);
    if (slotConflict.conflict) {
      return { valid: false, message: slotConflict.message };
    }

    // 5. Check user conflicts (prevent double booking)
    const userConflict = await this.checkUserConflict(userId, date, startTime, endTime);
    if (userConflict.conflict) {
      return { valid: false, message: userConflict.message };
    }

    return { valid: true };
  }
}

module.exports = new ReservationService();
