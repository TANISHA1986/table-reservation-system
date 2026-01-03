const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateTable, validateMongoId, validateDateQuery } = require('../middleware/validate');

router.use(protect);
router.use(authorize('ADMIN'));

// Reservation routes
router.get('/reservations', validateDateQuery, adminController.getAllReservations);
router.delete('/reservations/:id', validateMongoId, adminController.cancelReservation);

// Table routes
router.get('/tables', adminController.getAllTables);
router.post('/tables', validateTable, adminController.createTable);
router.patch('/tables/:id', validateMongoId, adminController.updateTable);
router.patch('/tables/:id/status', validateMongoId, adminController.updateTableStatus);
router.delete('/tables/:id', validateMongoId, adminController.deleteTable);

// Stats and availability
router.get('/stats', adminController.getDashboardStats);
router.get('/tables/availability', validateDateQuery, adminController.getTableAvailability);

module.exports = router;
