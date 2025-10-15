const Vehicle = require('../models/Vehicle');
const Request = require('../models/Request');
const History = require('../models/History');
const User = require('../models/User');
const { getIO, emitToRole, emitToRoles } = require('../utils/socket');

// Valet Supervisor Functions
const createPickupRequest = async (req, res) => {
  const { vehicleId, locationFrom, notes } = req.body;

  try {
    // Find the parked vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ msg: 'Vehicle not found' });
    }

    if (vehicle.status !== 'parked') {
      return res.status(400).json({ msg: 'Vehicle must be parked to create pickup request' });
    }

    // Check if there's already a pending pickup request for this vehicle
    const existingPickupRequest = await Request.findOne({
      vehicleId: vehicle._id,
      type: 'pickup',
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingPickupRequest) {
      return res.status(400).json({ msg: 'Pickup request already exists for this vehicle' });
    }

    // Create pickup request
    const pickupRequest = new Request({
      vehicleId: vehicle._id,
      createdBy: req.user.id,
      type: 'pickup',
      status: 'pending',
      locationFrom: locationFrom,
      notes: notes || `Pickup request for parked vehicle ${vehicle.number}`
    });

    await pickupRequest.save();

    // Update vehicle status to in-progress for pickup
    vehicle.status = 'in-progress';
    await vehicle.save();

    // Create history entry
    const history = new History({
      requestId: pickupRequest._id,
      vehicleId: vehicle._id,
      ownerId: vehicle.createdBy, // Owner who originally parked the vehicle
      action: 'pickup_request_created',
      details: {
        requestType: 'pickup',
        carNumber: vehicle.number,
        ownerName: vehicle.ownerName,
        location: locationFrom,
        notes: pickupRequest.notes
      },
      performedBy: req.user.id
    });
    await history.save();

    // Send notification to all drivers
    const { sendRequestNotification } = require('../utils/notifier');
    sendRequestNotification(pickupRequest, 'new_pickup_request');

    // Broadcast via socket
    getIO().emit('new-pickup-request', {
      pickupRequest,
      vehicle: {
        number: vehicle.number,
        make: vehicle.make,
        model: vehicle.model,
        ownerName: vehicle.ownerName,
        ownerPhone: vehicle.ownerPhone
      },
      location: locationFrom
    });

    res.status(201).json({
      msg: 'Pickup request created successfully',
      pickupRequest,
      vehicle
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const createParkRequest = async (req, res) => {
  const { phoneNumber, customerName, licensePlate, make, model, color } = req.body;

  try {
    // Check if vehicle exists by license plate
    let vehicle = await Vehicle.findOne({ number: licensePlate });

    if (vehicle) {
      // Update owner details if phone number matches or if owner info is missing
      if (!vehicle.ownerName || vehicle.ownerPhone !== phoneNumber) {
        vehicle.ownerName = customerName;
        vehicle.ownerPhone = phoneNumber;
        await vehicle.save();
      }
    } else {
      // Create new vehicle entry
      vehicle = new Vehicle({
        ownerName: customerName,
        ownerPhone: phoneNumber,
        make: make || 'Unknown',
        model: model || 'Unknown',
        number: licensePlate,
        color: color || 'Unknown',
        status: 'in-progress',
        createdBy: req.user.id
      });
      await vehicle.save();
    }

    // Check if there's already a pending park request for this vehicle
    const existingRequest = await Request.findOne({
      vehicleId: vehicle._id,
      type: 'park',
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ msg: 'Park request already exists for this vehicle' });
    }

    // Create new park request
    const request = new Request({
      vehicleId: vehicle._id,
      createdBy: req.user.id,
      type: 'park',
      status: 'pending',
      locationFrom: req.body.locationFrom,
      notes: req.body.notes
    });

    await request.save();

    // Update vehicle status
    vehicle.status = 'in-progress';
    await vehicle.save();

    // Create history entry
    const history = new History({
      requestId: request._id,
      vehicleId: vehicle._id,
      action: 'park_request',
      details: {
        requestType: 'park',
        carNumber: licensePlate,
        ownerName: customerName,
        ownerPhone: phoneNumber,
        location: req.body.locationFrom ? 'Valet Location' : 'Unknown'
      },
      performedBy: req.user.id
    });
    await history.save();

    // Broadcast to all drivers at valet location
    getIO().emit('new-park-request', {
      request,
      vehicle: {
        number: vehicle.number,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        ownerName: vehicle.ownerName,
        ownerPhone: vehicle.ownerPhone
      }
    });

    res.status(201).json({ request, vehicle });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Parking Location Supervisor Functions
const verifyParkRequest = async (req, res) => {
  const { carNumber } = req.body;

  try {
    // Find vehicle by car number
    const vehicle = await Vehicle.findOne({ number: carNumber });

    if (vehicle) {
      // Find the park request
      const request = await Request.findOne({
        vehicleId: vehicle._id,
        type: 'park',
        status: { $in: ['completed'] }
      });

      if (request) {
        // Mark as verified
        request.status = 'verified';
        request.verificationTime = new Date();
        await request.save();

        // Update vehicle verification status
        vehicle.isVerified = true;
        vehicle.verifiedBy = req.user.id;
        vehicle.verifiedAt = new Date();
        await vehicle.save();

        // Create history entry
        const history = new History({
          requestId: request._id,
          vehicleId: vehicle._id,
          action: 'verified',
          details: {
            requestType: 'park',
            carNumber: carNumber,
            ownerName: vehicle.ownerName,
            ownerPhone: vehicle.ownerPhone
          },
          performedBy: req.user.id
        });
        await history.save();

        getIO().emit('vehicle-verified', { request, vehicle });
        return res.json({ msg: 'Vehicle verified successfully', request, vehicle });
      } else {
        // Vehicle exists but no completed park request found - create self-parked request
        const selfParkedRequest = new Request({
          vehicleId: vehicle._id,
          createdBy: req.user.id,
          type: 'park',
          status: 'verified',
          isSelfParked: true,
          locationFrom: req.body.locationFrom,
          notes: 'Self-parked vehicle - verified during verification process'
        });
        await selfParkedRequest.save();

        // Update vehicle verification status
        vehicle.isVerified = true;
        vehicle.verifiedBy = req.user.id;
        vehicle.verifiedAt = new Date();
        await vehicle.save();

        // Create history entry
        const history = new History({
          requestId: selfParkedRequest._id,
          vehicleId: vehicle._id,
          action: 'self_parked',
          details: {
            requestType: 'park',
            carNumber: carNumber,
            ownerName: vehicle.ownerName,
            ownerPhone: vehicle.ownerPhone
          },
          performedBy: req.user.id
        });
        await history.save();

        getIO().emit('self-parked-created', { request: selfParkedRequest, vehicle });
        return res.status(201).json({
          msg: 'Self-parked request created for existing vehicle',
          request: selfParkedRequest,
          vehicle
        });
      }
    }

    // If vehicle not found, check if there's already a self-parked request with this car number
    const existingSelfParkedRequest = await Request.findOne({
      'details.carNumber': carNumber,
      'details.requestType': 'park',
      action: 'self_parked'
    });

    if (existingSelfParkedRequest) {
      return res.status(400).json({
        msg: 'Self-parked vehicle with this car number already exists'
      });
    }

    // If vehicle not found and no existing self-parked request, create self-parked entry
    try {
      const selfParkedVehicle = new Vehicle({
        ownerName: req.body.ownerName || 'Unknown',
        ownerPhone: req.body.ownerPhone || carNumber,
        make: req.body.make || 'Unknown',
        model: req.body.model || 'Unknown',
        number: carNumber,
        color: req.body.color || 'Unknown',
        status: 'parked',
        isVerified: true,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        createdBy: req.user.id  // Add required createdBy field
      });
      await selfParkedVehicle.save();

      // Create self-parked request
      const selfParkedRequest = new Request({
        vehicleId: selfParkedVehicle._id,
        createdBy: req.user.id,
        type: 'park',
        status: 'self_parked',
        isSelfParked: true,
        locationFrom: req.body.locationFrom,
        notes: 'Self-parked vehicle'
      });
      await selfParkedRequest.save();

      // Create history entry
      const history = new History({
        requestId: selfParkedRequest._id,
        vehicleId: selfParkedVehicle._id,
        action: 'self_parked',
        details: {
          requestType: 'park',
          carNumber: carNumber,
          ownerName: selfParkedVehicle.ownerName
        },
        performedBy: req.user.id
      });
      await history.save();

      getIO().emit('self-parked-created', { request: selfParkedRequest, vehicle: selfParkedVehicle });
      res.status(201).json({ msg: 'Self-parked vehicle created', request: selfParkedRequest, vehicle: selfParkedVehicle });

    } catch (duplicateError) {
      if (duplicateError.code === 11000) {
        return res.status(400).json({
          msg: 'Vehicle with this car number already exists in the system'
        });
      }
      throw duplicateError;
    }

  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({
        msg: 'Vehicle with this car number already exists in the system'
      });
    } else {
      res.status(500).json({ msg: err.message });
    }
  }
};

const markSelfPickup = async (req, res) => {
  const { vehicleId } = req.params;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    const request = await Request.findOne({ vehicleId: vehicle._id, status: 'verified' });
    if (!request) return res.status(404).json({ msg: 'No verified request found for this vehicle' });

    // Mark as self-pickup
    request.status = 'self_pickup';
    request.handoverTime = new Date();
    request.isSelfPickup = true;
    await request.save();

    // Update vehicle status
    vehicle.status = 'available';
    await vehicle.save();

    // Create history entry
    const history = new History({
      requestId: request._id,
      vehicleId: vehicle._id,
      action: 'self_pickup',
      details: {
        requestType: 'pickup',
        carNumber: vehicle.number,
        ownerName: vehicle.ownerName,
        ownerPhone: vehicle.ownerPhone
      },
      performedBy: req.user.id
    });
    await history.save();

    getIO().emit('self-pickup-marked', { request, vehicle });
    res.json({ msg: 'Self-pickup marked successfully', request, vehicle });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// Common Functions
const getParkedVehicles = async (req, res) => {
  try {
    const { dateFrom, dateTo, status } = req.query;
    let filter = { status: 'parked' };

    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const parked = await Vehicle.find(filter).populate('verifiedBy createdBy');
    res.json(parked);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getTodayParkedVehicles = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const vehicles = await Vehicle.find({
      status: 'parked',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('verifiedBy createdBy');

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo, type, action } = req.query;

    let filter = {};
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) filter.timestamp.$gte = new Date(dateFrom);
      if (dateTo) filter.timestamp.$lte = new Date(dateTo);
    }
    if (type) filter['details.requestType'] = type;
    if (action) filter.action = action;

    const history = await History.find(filter)
      .populate('vehicleId parkDriverId pickupDriverId performedBy')
      .sort({ timestamp: -1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    // Get statistics for the specified period
    const totalParked = await Vehicle.countDocuments({
      status: 'parked',
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const totalRequests = await Request.countDocuments({
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const totalVerified = await Vehicle.countDocuments({
      isVerified: true,
      ...(dateFrom || dateTo ? { verifiedAt: dateFilter } : {})
    });

    const totalSelfParked = await Request.countDocuments({
      isSelfParked: true,
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const totalSelfPickup = await Request.countDocuments({
      isSelfPickup: true,
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    // Get role-based statistics
    const usersByRole = await User.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Get daily request trends (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dailyStats = await Request.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
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

    res.json({
      totalParked,
      totalRequests,
      totalVerified,
      totalSelfParked,
      totalSelfPickup,
      usersByRole,
      dailyStats,
      period: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : 'all_time'
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports = {
  // Valet Supervisor
  createPickupRequest,
  createParkRequest,

  // Parking Location Supervisor
  verifyParkRequest,
  markSelfPickup,

  // Common
  getParkedVehicles,
  getTodayParkedVehicles,
  getHistory,
  getDashboardStats
};
