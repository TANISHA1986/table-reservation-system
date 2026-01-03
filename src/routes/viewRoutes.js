const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * View routes for rendering EJS templates
 * These handle the frontend pages
 */

// Public routes
router.get('/', (req, res) => {
  res.render('index', { user: null });
});

router.get('/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

// Protected user routes
router.get('/dashboard', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({ 
      userId: req.user._id, 
      status: 'BOOKED',
      date: { $gte: new Date() }
    })
      .populate('tableId')
      .sort({ date: 1 })
      .limit(5);

    res.render('user/dashboard', { 
      user: req.user, 
      reservations 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Server Error');
  }
});

router.get('/book-table', protect, async (req, res) => {
  try {
    const tables = await Table.find({ isActive: true }).sort({ tableNumber: 1 });
    res.render('user/book-table', { 
      user: req.user, 
      tables, 
      error: null 
    });
  } catch (error) {
    console.error('Book table error:', error);
    res.status(500).send('Server Error');
  }
});

router.get('/my-reservations', protect, async (req, res) => {
  try {
    const reservations = await Reservation.find({ userId: req.user._id })
      .populate('tableId')
      .sort({ date: -1 });

    res.render('user/my-reservations', { 
      user: req.user, 
      reservations 
    });
  } catch (error) {
    console.error('My reservations error:', error);
    res.status(500).send('Server Error');
  }
});

// Protected admin routes
router.get('/admin/dashboard', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      totalTables: await Table.countDocuments(),
      activeTables: await Table.countDocuments({ isActive: true }),
      todayReservations: await Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow }, 
        status: 'BOOKED' 
      }),
      totalReservations: await Reservation.countDocuments({ status: 'BOOKED' })
    };

    res.render('admin/dashboard', { 
      user: req.user, 
      stats 
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Server Error');
  }
});

// Add this route after other admin routes
router.get('/admin/checkin', protect, authorize('ADMIN'), async (req, res) => {
  try {
    res.render('admin/check-in', { 
      user: req.user
    });
  } catch (error) {
    console.error('Check-in page error:', error);
    res.status(500).send('Server Error');
  }
});


router.get('/admin/tables', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });
    res.render('admin/manage-tables', { 
      user: req.user, 
      tables, 
      error: null 
    });
  } catch (error) {
    console.error('Admin tables error:', error);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/reservations', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(req.query.date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const reservations = await Reservation.find(query)
      .populate('userId', 'name email')
      .populate('tableId', 'tableNumber capacity')
      .sort({ date: -1, startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reservation.countDocuments(query);

    res.render('admin/all-reservations', {
      user: req.user,
      reservations,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      filters: req.query
    });
  } catch (error) {
    console.error('Admin reservations error:', error);
    res.status(500).send('Server Error');
  }
});

// Add this route after other admin routes
router.get('/admin/analytics', protect, authorize('ADMIN'), async (req, res) => {
  try {
    res.render('admin/analytics', { 
      user: req.user
    });
  } catch (error) {
    console.error('Analytics page error:', error);
    res.status(500).send('Server Error');
  }
});


module.exports = router;
