const User = require('../models/User');
const ParkingLocation = require('../models/ParkingLocation');
const Request = require('../models/Request');
const Vehicle = require('../models/Vehicle');
const History = require('../models/History');
const Feedback = require('../models/Feedback');
const notifier = require('../utils/notifier');

const getPendingRegistrations = async (req, res) => {
  try {
    const { role, dateFrom, dateTo } = req.query;

    let filter = { status: 'pending' };
    if (role) filter.role = role;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const pendings = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(pendings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const approveUser = async (req, res) => {
  const { role } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.status = 'approved';
    if (role && ['driver', 'valet_supervisor', 'parking_location_supervisor'].includes(role)) {
      user.role = role;
    }
    await user.save();

    // Send notification
    notifier.notifyUser(user.phone, `Your registration is approved! You are now registered as ${user.role.replace('_', ' ')}.`);
    res.json({ msg: 'User approved successfully', user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const userData = { ...user.toObject() };
    await User.findByIdAndDelete(req.params.id);

    notifier.notifyUser(user.phone, 'Your registration was rejected. Please contact support if you have questions.');
    res.json({ msg: 'User rejected successfully' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const editUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const allowedFields = ['name', 'email'];
    const updates = {};

    // Allow drivers to edit licenseDetails
    if (user.role === 'driver' && req.body.licenseDetails !== undefined) {
      allowedFields.push('licenseDetails');
    }

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle role changes separately
    if (req.body.role && ['admin', 'driver', 'valet_supervisor', 'parking_location_supervisor'].includes(req.body.role)) {
      updates.role = req.body.role;
    }

    // Check for email uniqueness if email is being updated
    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email,
        _id: { $ne: req.params.id } // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          msg: `Email ${updates.email} is already registered to another user`
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ msg: 'User not found' });

    res.json(updatedUser);
  } catch (err) {
    // Handle duplicate key errors with better error messages
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      return res.status(400).json({
        msg: `${field} "${value}" is already registered to another user`
      });
    }
    res.status(500).json({ msg: err.message });
  }
};

const addParkingLocation = async (req, res) => {
  const { name, address, geolocation, capacity } = req.body;
  try {
    const location = new ParkingLocation({ name, address, geolocation, capacity });
    await location.save();
    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const editParkingLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!location) return res.status(404).json({ msg: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const deleteParkingLocation = async (req, res) => {
  try {
    const location = await ParkingLocation.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ msg: 'Location not found' });
    res.json({ msg: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo, locationId } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    // Basic counts
    const totalUsers = await User.countDocuments({ status: 'approved' });
    const totalRequests = await Request.countDocuments({
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });
    const totalVehicles = await Vehicle.countDocuments();
    const totalParked = await Vehicle.countDocuments({ status: 'parked' });

    // Role distribution
    const usersByRole = await User.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Request status distribution
    const requestsByStatus = await Request.aggregate([
      { $match: dateFrom || dateTo ? { createdAt: dateFilter } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Vehicle status distribution
    const vehiclesByStatus = await Vehicle.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Daily request trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await Request.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          park: { $sum: { $cond: [{ $eq: ['$type', 'park'] }, 1, 0] } },
          pickup: { $sum: { $cond: [{ $eq: ['$type', 'pickup'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Average completion time
    const completionTimes = await Request.aggregate([
      {
        $match: {
          status: { $in: ['completed', 'handed_over'] },
          ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$completionTime', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$completionTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Feedback statistics
    const feedbackStats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]);

    res.json({
      overview: {
        totalUsers,
        totalRequests,
        totalVehicles,
        totalParked,
        avgRating: feedbackStats[0]?.avgRating || 0,
        avgCompletionTime: completionTimes[0]?.avgTime || 0
      },
      usersByRole,
      requestsByStatus,
      vehiclesByStatus,
      dailyStats,
      feedbackStats: feedbackStats[0] || { avgRating: 0, totalFeedback: 0 },
      period: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : 'all_time'
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getComprehensiveHistory = async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      date, // Single date option
      type,
      action,
      userId,
      vehicleId,
      searchBy, // 'vehicle' or 'driver'
      searchValue, // vehicle number or driver mobile
      page = 1,
      limit = 20
    } = req.query;

    let filter = {};

    // Handle date filtering - either date range or single date
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    } else if (date) {
      // Single date - get records for that specific date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      filter.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (type) filter['details.requestType'] = type;
    if (action) filter.action = action;
    if (userId) filter.performedBy = userId;
    if (vehicleId) filter.vehicleId = vehicleId;

    // Search functionality
    if (searchBy && searchValue) {
      if (searchBy === 'vehicle') {
        // Search by vehicle number in details
        filter['details.carNumber'] = { $regex: searchValue, $options: 'i' };
      } else if (searchBy === 'driver') {
        // Search by driver mobile number - need to populate and filter
        // This will be handled in the aggregation pipeline
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // For driver search, we need to use aggregation to filter after populate
    if (searchBy === 'driver' && searchValue) {
      const history = await History.aggregate([
        {
          $match: filter
        },
        {
          $lookup: {
            from: 'users',
            localField: 'performedBy',
            foreignField: '_id',
            as: 'performedByUser'
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicleInfo'
          }
        },
        {
          $match: {
            'performedByUser.phone': { $regex: searchValue, $options: 'i' }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      const totalCount = await History.aggregate([
        {
          $match: filter
        },
        {
          $lookup: {
            from: 'users',
            localField: 'performedBy',
            foreignField: '_id',
            as: 'performedByUser'
          }
        },
        {
          $match: {
            'performedByUser.phone': { $regex: searchValue, $options: 'i' }
          }
        },
        {
          $count: 'total'
        }
      ]);

      res.json({
        history,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0]?.total || 0,
          pages: Math.ceil((totalCount[0]?.total || 0) / parseInt(limit))
        }
      });
    } else {
      // Regular query without driver search
      const history = await History.find(filter)
        .populate('vehicleId parkDriverId pickupDriverId performedBy')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const totalCount = await History.countDocuments(filter);

      res.json({
        history,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const exportHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo, type, format = 'json' } = req.query;

    let filter = {};

    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    }

    if (type) filter['details.requestType'] = type;

    const history = await History.find(filter)
      .populate('vehicleId parkDriverId pickupDriverId performedBy')
      .sort({ timestamp: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = history.map(record => ({
        timestamp: record.timestamp,
        action: record.action,
        requestType: record.details?.requestType || '',
        carNumber: record.details?.carNumber || '',
        ownerName: record.details?.ownerName || '',
        parkDriverName: record.details?.parkDriverName || '',
        pickupDriverName: record.details?.pickupDriverName || '',
        location: record.details?.location || '',
        performedBy: record.performedBy?.name || ''
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="valet_history.csv"');

      // Simple CSV conversion
      const csv = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="valet_history.json"');
      res.json(history);
    }
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getParkingLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role, status = 'approved' } = req.query;

    let filter = { status };
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getSystemHealth = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'approved' });
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const totalVehicles = await Vehicle.countDocuments();
    const parkedVehicles = await Vehicle.countDocuments({ status: 'parked' });
    const activeRequests = await Request.countDocuments({ status: { $in: ['pending', 'accepted'] } });
    const totalRequests = await Request.countDocuments();

    res.json({
      users: { total: totalUsers, active: activeUsers, pending: pendingUsers },
      vehicles: { total: totalVehicles, parked: parkedVehicles },
      requests: { total: totalRequests, active: activeRequests },
      systemStatus: 'healthy',
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports = {
  getPendingRegistrations,
  approveUser,
  rejectUser,
  editUser,
  addParkingLocation,
  editParkingLocation,
  deleteParkingLocation,
  getStatistics,
  getComprehensiveHistory,
  exportHistory,
  getParkingLocations,
  getAllUsers,
  getSystemHealth
};
