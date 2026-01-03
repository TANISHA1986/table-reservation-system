const mongoose = require('mongoose');
const config = require('./config');

/**
 * Database connection with proper error handling and connection pooling
 * Connection pooling reuses existing connections instead of creating new ones per request
 * This improves scalability and reduces latency
 */
const connectDB = async () => {
  try {
    const options = {
      // Connection pooling settings for production
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4 // Use IPv4, skip trying IPv6
    };

    await mongoose.connect(config.database.uri, options);
    
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1); // Exit process with failure
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Error:', err);
});

module.exports = connectDB;
