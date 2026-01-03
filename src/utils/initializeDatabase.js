const Table = require('../models/Table');

/**
 * Initialize database with default tables
 * Runs automatically on server start
 */
const initializeDatabase = async () => {
  try {
    // Check if tables already exist
    const existingTables = await Table.countDocuments();
    
    if (existingTables === 0) {
      console.log('📋 No tables found. Creating default tables...');
      
      const defaultTables = [
        { tableNumber: '1', capacity: 2, isActive: true },
        { tableNumber: '2', capacity: 2, isActive: true },
        { tableNumber: '3', capacity: 4, isActive: true },
        { tableNumber: '4', capacity: 4, isActive: true },
        { tableNumber: '5', capacity: 4, isActive: true },
        { tableNumber: '6', capacity: 6, isActive: true },
        { tableNumber: '7', capacity: 6, isActive: true },
        { tableNumber: '8', capacity: 8, isActive: true },
        { tableNumber: 'VIP-1', capacity: 10, isActive: true },
        { tableNumber: 'VIP-2', capacity: 12, isActive: true }
      ];

      await Table.insertMany(defaultTables);
      console.log('✅ Successfully created 10 default tables');
    } else {
      console.log(`✅ Found ${existingTables} existing tables`);
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
  }
};

module.exports = initializeDatabase;
