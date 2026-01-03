const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const User = require('../models/User');

/**
 * Get comprehensive dashboard statistics
 */
exports.getDashboardStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);

    const yearAgo = new Date(today);
    yearAgo.setFullYear(today.getFullYear() - 1);

    // Run all queries in parallel
    const [
      totalTables,
      activeTables,
      totalUsers,
      todayReservations,
      todayCheckIns,
      weekReservations,
      monthReservations,
      totalReservations,
      cancelledReservations,
      completedReservations,
      noShowReservations,
      revenueData
    ] = await Promise.all([
      Table.countDocuments(),
      Table.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'USER' }),
      Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow }, 
        status: 'BOOKED' 
      }),
      Reservation.countDocuments({ 
        date: { $gte: today, $lt: tomorrow },
        checkedIn: true
      }),
      Reservation.countDocuments({ 
        date: { $gte: weekAgo },
        status: 'BOOKED'
      }),
      Reservation.countDocuments({ 
        date: { $gte: monthAgo },
        status: 'BOOKED'
      }),
      Reservation.countDocuments({ status: 'BOOKED' }),
      Reservation.countDocuments({ status: 'CANCELLED' }),
      Reservation.countDocuments({ status: 'COMPLETED' }),
      Reservation.countDocuments({ status: 'NO_SHOW' }),
      calculateRevenue()
    ]);

    return {
      overview: {
        totalTables,
        activeTables,
        inactiveTables: totalTables - activeTables,
        totalUsers,
        totalReservations: totalReservations + cancelledReservations + completedReservations + noShowReservations
      },
      reservations: {
        today: todayReservations,
        todayCheckIns,
        thisWeek: weekReservations,
        thisMonth: monthReservations,
        active: totalReservations,
        completed: completedReservations,
        cancelled: cancelledReservations,
        noShow: noShowReservations
      },
      revenue: revenueData,
      performance: {
        checkInRate: todayReservations > 0 ? ((todayCheckIns / todayReservations) * 100).toFixed(1) : 0,
        cancellationRate: ((cancelledReservations / (totalReservations + cancelledReservations)) * 100).toFixed(1),
        completionRate: ((completedReservations / (totalReservations + completedReservations)) * 100).toFixed(1),
        noShowRate: ((noShowReservations / (totalReservations + noShowReservations)) * 100).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Analytics error:', error);
    throw error;
  }
};

/**
 * Get booking trends (last 30 days)
 */
exports.getBookingTrends = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trends = await Reservation.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Format data for charts
    const dates = [...new Set(trends.map(t => t._id.date))].sort();
    const booked = dates.map(date => {
      const item = trends.find(t => t._id.date === date && t._id.status === 'BOOKED');
      return item ? item.count : 0;
    });
    const cancelled = dates.map(date => {
      const item = trends.find(t => t._id.date === date && t._id.status === 'CANCELLED');
      return item ? item.count : 0;
    });
    const completed = dates.map(date => {
      const item = trends.find(t => t._id.date === date && t._id.status === 'COMPLETED');
      return item ? item.count : 0;
    });

    return {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Booked',
          data: booked,
          backgroundColor: 'rgba(30, 126, 52, 0.2)',
          borderColor: 'rgba(30, 126, 52, 1)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Completed',
          data: completed,
          backgroundColor: 'rgba(23, 162, 184, 0.2)',
          borderColor: 'rgba(23, 162, 184, 1)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Cancelled',
          data: cancelled,
          backgroundColor: 'rgba(196, 30, 58, 0.2)',
          borderColor: 'rgba(196, 30, 58, 1)',
          borderWidth: 2,
          fill: true
        }
      ]
    };
  } catch (error) {
    console.error('Booking trends error:', error);
    throw error;
  }
};

/**
 * Get popular tables
 */
exports.getPopularTables = async () => {
  try {
    const popular = await Reservation.aggregate([
      {
        $match: {
          status: { $in: ['BOOKED', 'COMPLETED'] }
        }
      },
      {
        $group: {
          _id: "$tableId",
          bookings: { $sum: 1 },
          totalGuests: { $sum: "$guestCount" }
        }
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Populate table details
    await Table.populate(popular, { path: '_id', select: 'tableNumber capacity' });

    return popular.map(item => ({
      tableNumber: item._id.tableNumber,
      capacity: item._id.capacity,
      bookings: item.bookings,
      totalGuests: item.totalGuests,
      avgGuests: (item.totalGuests / item.bookings).toFixed(1)
    }));
  } catch (error) {
    console.error('Popular tables error:', error);
    throw error;
  }
};

/**
 * Get peak hours analysis
 */
exports.getPeakHours = async () => {
  try {
    const peakData = await Reservation.aggregate([
      {
        $match: {
          status: { $in: ['BOOKED', 'COMPLETED'] }
        }
      },
      {
        $group: {
          _id: "$startTime",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    return {
      labels: peakData.map(p => p._id),
      data: peakData.map(p => p.count)
    };
  } catch (error) {
    console.error('Peak hours error:', error);
    throw error;
  }
};

/**
 * Get customer insights
 */
exports.getCustomerInsights = async () => {
  try {
    const insights = await Reservation.aggregate([
      {
        $match: {
          status: { $in: ['BOOKED', 'COMPLETED'] }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalBookings: { $sum: 1 },
          totalGuests: { $sum: "$guestCount" },
          lastBooking: { $max: "$date" }
        }
      },
      {
        $sort: { totalBookings: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Populate user details
    await User.populate(insights, { path: '_id', select: 'name email' });

    return insights.map(item => ({
      name: item._id.name,
      email: item._id.email,
      totalBookings: item.totalBookings,
      totalGuests: item.totalGuests,
      avgGuestsPerBooking: (item.totalGuests / item.totalBookings).toFixed(1),
      lastBooking: item.lastBooking
    }));
  } catch (error) {
    console.error('Customer insights error:', error);
    throw error;
  }
};

/**
 * Get status distribution
 */
exports.getStatusDistribution = async () => {
  try {
    const distribution = await Reservation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusMap = {
      'BOOKED': 'Active',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'NO_SHOW': 'No Show'
    };

    return {
      labels: distribution.map(d => statusMap[d._id] || d._id),
      data: distribution.map(d => d.count),
      backgroundColor: [
        'rgba(30, 126, 52, 0.8)',
        'rgba(23, 162, 184, 0.8)',
        'rgba(196, 30, 58, 0.8)',
        'rgba(108, 117, 125, 0.8)'
      ]
    };
  } catch (error) {
    console.error('Status distribution error:', error);
    throw error;
  }
};

/**
 * Calculate revenue (dummy implementation - can be extended)
 */
const calculateRevenue = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);

    // Assuming $50 per completed reservation (can be customized)
    const pricePerBooking = 50;

    const [todayCompleted, weekCompleted, monthCompleted, totalCompleted] = await Promise.all([
      Reservation.countDocuments({ 
        date: { $gte: today }, 
        status: 'COMPLETED' 
      }),
      Reservation.countDocuments({ 
        date: { $gte: weekAgo }, 
        status: 'COMPLETED' 
      }),
      Reservation.countDocuments({ 
        date: { $gte: monthAgo }, 
        status: 'COMPLETED' 
      }),
      Reservation.countDocuments({ status: 'COMPLETED' })
    ]);

    return {
      today: todayCompleted * pricePerBooking,
      thisWeek: weekCompleted * pricePerBooking,
      thisMonth: monthCompleted * pricePerBooking,
      total: totalCompleted * pricePerBooking,
      pricePerBooking
    };
  } catch (error) {
    console.error('Revenue calculation error:', error);
    return { today: 0, thisWeek: 0, thisMonth: 0, total: 0 };
  }
};

/**
 * Get monthly comparison
 */
exports.getMonthlyComparison = async () => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const twoMonthsAgo = new Date(currentMonth);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const [currentMonthCount, lastMonthCount, twoMonthsAgoCount] = await Promise.all([
      Reservation.countDocuments({ 
        date: { $gte: currentMonth },
        status: { $in: ['BOOKED', 'COMPLETED'] }
      }),
      Reservation.countDocuments({ 
        date: { $gte: lastMonth, $lt: currentMonth },
        status: { $in: ['BOOKED', 'COMPLETED'] }
      }),
      Reservation.countDocuments({ 
        date: { $gte: twoMonthsAgo, $lt: lastMonth },
        status: { $in: ['BOOKED', 'COMPLETED'] }
      })
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      labels: [
        monthNames[twoMonthsAgo.getMonth()],
        monthNames[lastMonth.getMonth()],
        monthNames[currentMonth.getMonth()]
      ],
      data: [twoMonthsAgoCount, lastMonthCount, currentMonthCount]
    };
  } catch (error) {
    console.error('Monthly comparison error:', error);
    throw error;
  }
};
