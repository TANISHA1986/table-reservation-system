const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All analytics routes require admin access
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/trends', analyticsController.getBookingTrends);
router.get('/popular-tables', analyticsController.getPopularTables);
router.get('/peak-hours', analyticsController.getPeakHours);
router.get('/customers', analyticsController.getCustomerInsights);
router.get('/status-distribution', analyticsController.getStatusDistribution);
router.get('/monthly-comparison', analyticsController.getMonthlyComparison);

module.exports = router;
