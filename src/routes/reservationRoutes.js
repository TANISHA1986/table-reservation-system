const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateReservation, validateMongoId } = require('../middleware/validate');

router.use(protect); // All routes require authentication

// User routes
router.post('/book', authorize('USER', 'ADMIN'), validateReservation, reservationController.createReservation);
router.get('/my', authorize('USER', 'ADMIN'), reservationController.getMyReservations);
router.get('/stats', authorize('USER', 'ADMIN'), reservationController.getUserStats);
router.get('/:id', authorize('USER', 'ADMIN'), validateMongoId, reservationController.getReservation);
router.put('/:id', authorize('USER', 'ADMIN'), validateMongoId, reservationController.updateReservation);
router.delete('/:id', authorize('USER', 'ADMIN'), validateMongoId, reservationController.cancelReservation);

// Admin routes
router.post('/checkin', authorize('ADMIN'), reservationController.checkInReservation);
router.patch('/:id/complete', authorize('ADMIN'), validateMongoId, reservationController.completeReservation);
router.patch('/:id/no-show', authorize('ADMIN'), validateMongoId, reservationController.markNoShow);

module.exports = router;
