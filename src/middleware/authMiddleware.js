const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');
const { sendError } = require('../utils/responseHandler');

/**
 * Middleware to verify JWT token and attach user to request
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header (for API calls)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: Check for token in cookies (for browser requests)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    console.log('Token found:', token ? 'Yes' : 'No'); // Debug log

    if (!token) {
      // For view routes, redirect to login
      if (req.originalUrl.startsWith('/dashboard') || 
          req.originalUrl.startsWith('/book-table') ||
          req.originalUrl.startsWith('/my-reservations') ||
          req.originalUrl.startsWith('/admin')) {
        return res.redirect('/login');
      }
      return sendError(res, 'Not authorized to access this route', 401);
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('Decoded token:', decoded); // Debug log

    // Attach user to request object
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      // For view routes, redirect to login
      if (req.originalUrl.startsWith('/dashboard') || 
          req.originalUrl.startsWith('/book-table') ||
          req.originalUrl.startsWith('/my-reservations') ||
          req.originalUrl.startsWith('/admin')) {
        return res.redirect('/login');
      }
      return sendError(res, 'User not found', 404);
    }

    console.log('User authenticated:', req.user.email); // Debug log
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message); // Debug log
    
    if (error.name === 'JsonWebTokenError') {
      // For view routes, redirect to login
      if (req.originalUrl.startsWith('/dashboard') || 
          req.originalUrl.startsWith('/book-table') ||
          req.originalUrl.startsWith('/my-reservations') ||
          req.originalUrl.startsWith('/admin')) {
        return res.redirect('/login');
      }
      return sendError(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      // For view routes, redirect to login
      if (req.originalUrl.startsWith('/dashboard') || 
          req.originalUrl.startsWith('/book-table') ||
          req.originalUrl.startsWith('/my-reservations') ||
          req.originalUrl.startsWith('/admin')) {
        return res.redirect('/login');
      }
      return sendError(res, 'Token expired', 401);
    }
    
    // For view routes, redirect to login
    if (req.originalUrl.startsWith('/dashboard') || 
        req.originalUrl.startsWith('/book-table') ||
        req.originalUrl.startsWith('/my-reservations') ||
        req.originalUrl.startsWith('/admin')) {
      return res.redirect('/login');
    }
    return sendError(res, 'Not authorized to access this route', 401);
  }
};

/**
 * Middleware to restrict routes to specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      // For view routes, show error page or redirect
      if (req.originalUrl.startsWith('/admin') && req.user.role !== 'ADMIN') {
        return res.status(403).send('<h1>403 Forbidden</h1><p>You do not have permission to access this page.</p><a href="/dashboard">Go to Dashboard</a>');
      }
      return sendError(res, `Role ${req.user.role} is not authorized to access this route`, 403);
    }
    next();
  };
};
