const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware using express-validator
 * Prevents malicious input and ensures data integrity
 */

// Helper to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

// Login validation
exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Reservation validation
exports.validateReservation = [
  body('tableId')
    .notEmpty().withMessage('Table ID is required')
    .isMongoId().withMessage('Invalid table ID'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (use HH:MM)'),
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (use HH:MM)'),
  body('guestCount')
    .notEmpty().withMessage('Guest count is required')
    .isInt({ min: 1 }).withMessage('Guest count must be at least 1'),
  validate
];

// Table creation validation
exports.validateTable = [
  body('tableNumber')
    .trim()
    .notEmpty().withMessage('Table number is required'),
  body('capacity')
    .notEmpty().withMessage('Capacity is required')
    .isInt({ min: 1, max: 20 }).withMessage('Capacity must be between 1 and 20'),
  validate
];

// MongoDB ID validation
exports.validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate
];

// Date query validation
exports.validateDateQuery = [
  query('date').optional().isISO8601().withMessage('Invalid date format'),
  validate
];
