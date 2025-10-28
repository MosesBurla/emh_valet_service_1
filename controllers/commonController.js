const ParkingLocation = require('../models/ParkingLocation');
const Vehicle = require('../models/Vehicle');
const ApiResponse = require('../utils/responseHelper');

const getParkingLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find();
    return ApiResponse.success(locations, 'Parking locations retrieved successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

const searchVehicles = async (req, res) => {
  try {
    const { q } = req.query;

    // Check if search query is provided and has minimum 3 characters
    if (!q || q.length < 3) {
      return ApiResponse.badRequest('Search query is required and must be at least 3 characters long').send(res);
    }

    // Create search regex pattern (case-insensitive)
    const searchRegex = new RegExp(q, 'i');

    // Search across multiple fields
    const vehicles = await Vehicle.find({
      $or: [
        { ownerName: searchRegex },
        { ownerPhone: searchRegex },
        { make: searchRegex },
        { model: searchRegex },
        { number: searchRegex },
        { color: searchRegex }
      ]
    })
    .select('ownerName ownerPhone make model number color status')
    .limit(10); // Limit results for autocomplete

    return ApiResponse.success(vehicles, 'Vehicle search completed successfully').send(res);
  } catch (err) {
    return ApiResponse.error('ServerError', err.message).send(res);
  }
};

module.exports = { getParkingLocations, searchVehicles };
