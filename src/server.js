const app = require('./app');
const connectDB = require('./config/database');
const config = require('./config/config');
const initializeDatabase = require('./utils/initializeDatabase');

// Connect to database
connectDB().then(async () => {
  // Initialize database with default data
  await initializeDatabase();
});

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${config.server.env} mode on port ${PORT}`);
  console.log(`📱 View app at: http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});
