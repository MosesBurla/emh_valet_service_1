const Request = require('../models/Request');
const Vehicle = require('../models/Vehicle');
const History = require('../models/History');
const ParkingLocation = require('../models/ParkingLocation');
const { getIO, emitToRole, emitToRoles } = require('../utils/socket');
const ApiResponse = require('../utils/responseHelper');

const getIncomingRequests = async (req, res) => {
  try {
    const { type, location } = req.query;

    // First, check if driver has any accepted requests
    const acceptedRequest = await Request.findOne({
      driverId: req.user.id,
      status: 'accepted'
    }).populate('vehicleId');

    if (acceptedRequest) {
      // Driver has an accepted request, return only that request
      return ApiResponse.success([acceptedRequest], 'Accepted request retrieved successfully').send(res);
    }

    // Driver has no accepted requests, return all available incoming requests
    let filter = {
      status: 'pending',
      driverId: null
    };

    if (type) filter.type = type;
    if (location) filter.locationFrom = location;

    const requests = await Request.find(filter)
      .populate('vehicleId')
      .sort({ createdAt: 1 }); // Oldest first

    return ApiResponse.success(requests, 'Incoming requests retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const acceptRequest = async (req, res) => {
  try {
    // Use atomic operation to prevent race conditions
    // Only update if status is 'pending' and driverId is null
    const updatedRequest = await Request.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'pending',
        driverId: null
      },
      {
        driverId: req.user.id,
        status: 'accepted',
        acceptedAt: new Date()
      },
      { new: true }
    );

    if (!updatedRequest) {
      return ApiResponse.conflict('Request no longer available').send(res);
    }

    // Update vehicle status
    const vehicle = await Vehicle.findById(updatedRequest.vehicleId);
    if (vehicle) {
      vehicle.status = 'in-progress';
      await vehicle.save();
    }

    // Create history entry
    const history = new History({
      requestId: updatedRequest._id,
      vehicleId: updatedRequest.vehicleId,
      ownerId: vehicle?.createdBy, // Get owner from vehicle since Request doesn't have ownerId
      action: 'accepted',
      details: {
        requestType: updatedRequest.type,
        carNumber: vehicle?.number,
        ownerName: vehicle?.ownerName
      },
      performedBy: req.user.id
    });
    await history.save();

    // Broadcast acceptance to all drivers (excluding the one who accepted)
    getIO().emit('request-accepted', {
      request: updatedRequest,
      acceptedBy: req.user.id,
      vehicle: vehicle ? {
        number: vehicle.number,
        make: vehicle.make,
        model: vehicle.model,
        ownerName: vehicle.ownerName,
        ownerPhone: vehicle.ownerPhone
      } : null
    });

    return ApiResponse.success({ request: updatedRequest }, 'Request accepted successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const markParked = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || request.driverId.toString() !== req.user.id) {
      return ApiResponse.forbidden('Unauthorized to complete this request').send(res);
    }

    if (request.type !== 'park') {
      return ApiResponse.badRequest('This is not a park request').send(res);
    }

    // Update request status
    request.status = 'completed';
    request.completionTime = new Date();
    if (request.type === 'park') {
      request.parkDriverId = req.user.id;
    }
    await request.save();

    // Update vehicle status
    const vehicle = await Vehicle.findById(request.vehicleId);
    if (vehicle) {
      vehicle.status = 'parked';
      await vehicle.save();
    }

    // Create history entry
    const history = new History({
      requestId: request._id,
      vehicleId: request.vehicleId,
      ownerId: vehicle?.createdBy, // Get owner from vehicle since Request doesn't have ownerId
      parkDriverId: req.user.id,
      action: 'completed',
      details: {
        requestType: 'park',
        carNumber: vehicle?.number,
        ownerName: vehicle?.ownerName,
        parkDriverName: req.user.name
      },
      performedBy: req.user.id
    });
    await history.save();

    // Notify parking location supervisors about completed park request
    getIO().emit('park-completed', {
      request,
      vehicle: vehicle ? {
        number: vehicle.number,
        make: vehicle.make,
        model: vehicle.model,
        ownerName: vehicle.ownerName,
        ownerPhone: vehicle.ownerPhone
      } : null
    });

    return ApiResponse.success({ request, vehicle }, 'Vehicle marked as parked').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const markHandedOver = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || request.driverId?.toString() !== req.user.id) {
      return ApiResponse.forbidden('Unauthorized to complete this request').send(res);
    }

    if (request.type !== 'pickup') {
      return ApiResponse.badRequest('This is not a pickup request').send(res);
    }

    // Update request status
    request.status = 'handed_over';
    request.handoverTime = new Date();
    if (request.type === 'pickup') {
      request.pickupDriverId = req.user.id;
    }
    await request.save();

    // Update vehicle status
    const vehicle = await Vehicle.findById(request.vehicleId);
    if (vehicle) {
      vehicle.status = 'available';
      await vehicle.save();
    }

    // Create history entry
    const history = new History({
      requestId: request._id,
      vehicleId: request.vehicleId,
      ownerId: vehicle?.createdBy, // Get owner from vehicle since Request doesn't have ownerId
      pickupDriverId: req.user.id,
      action: 'handed_over',
      details: {
        requestType: 'pickup',
        carNumber: vehicle?.number,
        ownerName: vehicle?.ownerName,
        pickupDriverName: req.user.name
      },
      performedBy: req.user.id
    });
    await history.save();

    // Broadcast completion
    getIO().emit('pickup-completed', { request, vehicle });

    return ApiResponse.success({ request, vehicle }, 'Vehicle handover completed').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const getHistory = async (req, res) => {
  try {
    const { dateFrom, dateTo, type } = req.query;

    let filter = { driverId: req.user.id };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (type) filter.type = type;

    const history = await Request.find(filter)
      .populate('vehicleId createdBy')
      .sort({ createdAt: -1 });

    return ApiResponse.success(history, 'Driver history retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const getTodayParkedVehicles = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get vehicles parked today by this driver
    const parkedRequests = await Request.find({
      parkDriverId: req.user.id,
      type: 'park',
      status: 'completed',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('vehicleId');

    const vehicles = parkedRequests.map(request => request.vehicleId);

    return ApiResponse.success(vehicles, 'Today\'s parked vehicles retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const getDriverStats = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    // Get driver's statistics
    const totalRequests = await Request.countDocuments({
      driverId: req.user.id,
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const completedRequests = await Request.countDocuments({
      driverId: req.user.id,
      status: { $in: ['completed', 'handed_over'] },
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const parkRequests = await Request.countDocuments({
      parkDriverId: req.user.id,
      type: 'park',
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    const pickupRequests = await Request.countDocuments({
      pickupDriverId: req.user.id,
      type: 'pickup',
      ...(dateFrom || dateTo ? { createdAt: dateFilter } : {})
    });

    // Get today's performance
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRequests = await Request.countDocuments({
      driverId: req.user.id,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    const statsData = {
      totalRequests,
      completedRequests,
      parkRequests,
      pickupRequests,
      todayRequests,
      completionRate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : 0,
      period: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : 'all_time'
    };

    return ApiResponse.success(statsData, 'Driver statistics retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const getParkingLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find();
    return ApiResponse.success(locations, 'Parking locations retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

module.exports = {
  getIncomingRequests,
  acceptRequest,
  markParked,
  markHandedOver,
  getHistory,
  getTodayParkedVehicles,
  getDriverStats,
  getParkingLocations
};
