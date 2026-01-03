const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Auto-create default tables if none exist
 * This ensures tables are available for booking
 */
const ensureDefaultTables = async () => {
  try {
    const tableCount = await Table.countDocuments();
    if (tableCount === 0) {
      const defaultTables = [
        // Small tables for couples
        { tableNumber: '1', capacity: 2, isActive: true },
        { tableNumber: '2', capacity: 2, isActive: true },
        { tableNumber: '3', capacity: 2, isActive: true },
        
        // Medium tables for small groups
        { tableNumber: '4', capacity: 4, isActive: true },
        { tableNumber: '5', capacity: 4, isActive: true },
        { tableNumber: '6', capacity: 4, isActive: true },
        { tableNumber: '7', capacity: 4, isActive: true },
        
        // Large tables for families
        { tableNumber: '8', capacity: 6, isActive: true },
        { tableNumber: '9', capacity: 6, isActive: true },
        { tableNumber: '10', capacity: 8, isActive: true },
        
        // VIP tables
        { tableNumber: 'VIP-1', capacity: 10, isActive: true },
        { tableNumber: 'VIP-2', capacity: 12, isActive: true }
      ];
      
      await Table.insertMany(defaultTables);
      console.log('✅ Auto-created 12 default tables');
    }
  } catch (error) {
    console.error('❌ Error creating default tables:', error.message);
  }
};

/**
 * @desc    Get all reservations (with optional date filter and pagination)
 * @route   GET /api/admin/reservations
 * @access  Private (ADMIN)
 */
exports.getAllReservations = async (req, res, next) => {
  try {
    const { date, status, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    
    if (date) {
      // Parse date and set to start of day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      // Set end of day
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch reservations with populated user and table data
    const reservations = await Reservation.find(query)
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Reservation.countDocuments(query);

    sendSuccess(res, {
      count: reservations.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      reservations
    }, 'Reservations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new table
 * @route   POST /api/admin/tables
 * @access  Private (ADMIN)
 */
exports.createTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity } = req.body;

    // Check if table number already exists
    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return sendError(res, `Table ${tableNumber} already exists`, 400);
    }

    // Create table
    const table = await Table.create({
      tableNumber,
      capacity,
      isActive: true
    });

    sendSuccess(res, { table }, 'Table created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tables
 * @route   GET /api/admin/tables
 * @access  Private (ADMIN)
 */
exports.getAllTables = async (req, res, next) => {
  try {
    // Ensure default tables exist
    await ensureDefaultTables();
    
    // Fetch all tables sorted by table number
    const tables = await Table.find().sort({ tableNumber: 1 });

    sendSuccess(res, {
      count: tables.length,
      tables
    }, 'Tables retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update table status (activate/deactivate)
 * @route   PATCH /api/admin/tables/:id/status
 * @access  Private (ADMIN)
 */
exports.updateTableStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    // Validate isActive is boolean
    if (typeof isActive !== 'boolean') {
      return sendError(res, 'isActive must be true or false', 400);
    }

    // Find and update table
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!table) {
      return sendError(res, 'Table not found', 404);
    }

    // Check if deactivating table with active reservations
    if (!isActive) {
      const futureReservations = await Reservation.countDocuments({
        tableId: req.params.id,
        status: 'BOOKED',
        date: { $gte: new Date() }
      });

      if (futureReservations > 0) {
        return sendError(res, 
          `Warning: This table has ${futureReservations} active future reservation(s). Consider cancelling them first.`, 
          400
        );
      }
    }

    const statusText = isActive ? 'activated' : 'deactivated';
    sendSuccess(res, { table }, `Table ${statusText} successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update table details
 * @route   PATCH /api/admin/tables/:id
 * @access  Private (ADMIN)
 */
exports.updateTable = async (req, res, next) => {
  try {
    const { tableNumber, capacity, isActive } = req.body;

    // Build update object
    const updateData = {};
    if (tableNumber) updateData.tableNumber = tableNumber;
    if (capacity) updateData.capacity = capacity;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Check if new table number conflicts with existing
    if (tableNumber) {
      const existingTable = await Table.findOne({ 
        tableNumber, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingTable) {
        return sendError(res, `Table number ${tableNumber} already exists`, 400);
      }
    }

    // Update table
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!table) {
      return sendError(res, 'Table not found', 404);
    }

    sendSuccess(res, { table }, 'Table updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete table
 * @route   DELETE /api/admin/tables/:id
 * @access  Private (ADMIN)
 */
exports.deleteTable = async (req, res, next) => {
  try {
    // Check if table has active reservations
    const activeReservations = await Reservation.countDocuments({
      tableId: req.params.id,
      status: 'BOOKED',
      date: { $gte: new Date() }
    });

    if (activeReservations > 0) {
      return sendError(res, 
        `Cannot delete table with ${activeReservations} active reservation(s). Please cancel them first.`, 
        400
      );
    }

    // Find and delete table
    const table = await Table.findByIdAndDelete(req.params.id);

    if (!table) {
      return sendError(res, 'Table not found', 404);
    }

    sendSuccess(res, null, `Table ${table.tableNumber} deleted successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/stats
 * @access  Private (ADMIN)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Ensure default tables exist
    await ensureDefaultTables();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Get this month's date range
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Run all queries in parallel for better performance
    const [
      totalTables,
      activeTables,
      inactiveTables,
      todayReservations,
      weekReservations,
      monthReservations,
      totalReservations,
      cancelledReservations
    ] = await Promise.all([
      Table.countDocuments(),
      Table.countDocuments({ isActive: true }),
      Table.countDocuments({ isActive: false }),
      Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow }, 
        status: 'BOOKED' 
      }),
      Reservation.countDocuments({ 
        date: { $gte: weekStart, $lt: weekEnd }, 
        status: 'BOOKED' 
      }),
      Reservation.countDocuments({ 
        date: { $gte: monthStart, $lte: monthEnd }, 
        status: 'BOOKED' 
      }),
      Reservation.countDocuments({ status: 'BOOKED' }),
      Reservation.countDocuments({ status: 'CANCELLED' })
    ]);

    // Get recent reservations
    const recentReservations = await Reservation.find()
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity')
      .sort({ createdAt: -1 })
      .limit(5);

    sendSuccess(res, {
      stats: {
        tables: {
          total: totalTables,
          active: activeTables,
          inactive: inactiveTables
        },
        reservations: {
          today: todayReservations,
          thisWeek: weekReservations,
          thisMonth: monthReservations,
          total: totalReservations,
          cancelled: cancelledReservations
        }
      },
      recentReservations
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a reservation (Admin can cancel any reservation)
 * @route   DELETE /api/admin/reservations/:id
 * @access  Private (ADMIN)
 */
exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return sendError(res, 'Reservation not found', 404);
    }

    // Check if already cancelled
    if (reservation.status === 'CANCELLED') {
      return sendError(res, 'Reservation already cancelled', 400);
    }

    // Update status
    reservation.status = 'CANCELLED';
    await reservation.save();

    // Populate for response
    await reservation.populate('userId', 'name email');
    await reservation.populate('tableId', 'tableNumber capacity');

    sendSuccess(res, { reservation }, 'Reservation cancelled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get table availability for a specific date
 * @route   GET /api/admin/tables/availability
 * @access  Private (ADMIN)
 */
exports.getTableAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return sendError(res, 'Date is required', 400);
    }

    // Parse date range
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get all tables
    const tables = await Table.find({ isActive: true });

    // Get all reservations for the date
    const reservations = await Reservation.find({
      date: { $gte: startDate, $lte: endDate },
      status: 'BOOKED'
    }).populate('tableId');

    // Map tables with their reservations
    const availability = tables.map(table => {
      const tableReservations = reservations.filter(
        res => res.tableId && res.tableId._id.toString() === table._id.toString()
      );

      return {
        table: {
          id: table._id,
          tableNumber: table.tableNumber,
          capacity: table.capacity
        },
        reservations: tableReservations.map(res => ({
          startTime: res.startTime,
          endTime: res.endTime,
          guestCount: res.guestCount
        })),
        reservationCount: tableReservations.length
      };
    });

    sendSuccess(res, { 
      date,
      availability 
    }, 'Table availability retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
