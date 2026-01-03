const mongoose = require('mongoose');
const Table = require('../models/Table');
const User = require('../models/User');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing data
    await Table.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create default admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@restaurant.com',
      password: 'admin123',
      role: 'ADMIN'
    });
    console.log('✅ Created admin user (admin@restaurant.com / admin123)');

    // Create default regular user
    const regularUser = await User.create({
      name: 'John Doe',
      email: 'user@example.com',
      password: 'user123',
      role: 'USER'
    });
    console.log('✅ Created regular user (user@example.com / user123)');

    // Create tables
    const tables = [
      // Small tables for couples
      { tableNumber: '1', capacity: 2, isActive: true },
      { tableNumber: '2', capacity: 2, isActive: true },
      { tableNumber: '3', capacity: 2, isActive: true },
      
      // Medium tables for small groups
      { tableNumber: '4', capacity: 4, isActive: true },
      { tableNumber: '5', capacity: 4, isActive: true },
      { tableNumber: '6', capacity: 4, isActive: true },
      { tableNumber: '7', capacity: 4, isActive: true },
      
      // Large tables for families
      { tableNumber: '8', capacity: 6, isActive: true },
      { tableNumber: '9', capacity: 6, isActive: true },
      { tableNumber: '10', capacity: 8, isActive: true },
      
      // VIP tables
      { tableNumber: 'VIP-1', capacity: 10, isActive: true },
      { tableNumber: 'VIP-2', capacity: 12, isActive: true },
      
      // Inactive table (for testing)
      { tableNumber: '13', capacity: 4, isActive: false }
    ];

    await Table.insertMany(tables);
    console.log('✅ Created 13 tables successfully!');

    console.log('\n📊 Seed Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Admin: admin@restaurant.com / admin123');
    console.log('👤 User:  user@example.com / user123');
    console.log('🪑 Tables: 13 (12 active, 1 inactive)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedData();
