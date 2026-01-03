const analyticsService = require('../services/analyticsService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/analytics/dashboard
 * @access  Private (ADMIN)
 */
exports.getDashboardAnalytics = async (req, res, next) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    sendSuccess(res, stats, 'Dashboard analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking trends
 * @route   GET /api/analytics/trends
 * @access  Private (ADMIN)
 */
exports.getBookingTrends = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const trends = await analyticsService.getBookingTrends(days);
    sendSuccess(res, trends, 'Booking trends retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get popular tables
 * @route   GET /api/analytics/popular-tables
 * @access  Private (ADMIN)
 */
exports.getPopularTables = async (req, res, next) => {
  try {
    const tables = await analyticsService.getPopularTables();
    sendSuccess(res, { tables }, 'Popular tables retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get peak hours
 * @route   GET /api/analytics/peak-hours
 * @access  Private (ADMIN)
 */
exports.getPeakHours = async (req, res, next) => {
  try {
    const peakHours = await analyticsService.getPeakHours();
    sendSuccess(res, peakHours, 'Peak hours retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer insights
 * @route   GET /api/analytics/customers
 * @access  Private (ADMIN)
 */
exports.getCustomerInsights = async (req, res, next) => {
  try {
    const customers = await analyticsService.getCustomerInsights();
    sendSuccess(res, { customers }, 'Customer insights retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get status distribution
 * @route   GET /api/analytics/status-distribution
 * @access  Private (ADMIN)
 */
exports.getStatusDistribution = async (req, res, next) => {
  try {
    const distribution = await analyticsService.getStatusDistribution();
    sendSuccess(res, distribution, 'Status distribution retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get monthly comparison
 * @route   GET /api/analytics/monthly-comparison
 * @access  Private (ADMIN)
 */
exports.getMonthlyComparison = async (req, res, next) => {
  try {
    const comparison = await analyticsService.getMonthlyComparison();
    sendSuccess(res, comparison, 'Monthly comparison retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
