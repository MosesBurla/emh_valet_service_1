const ParkingLocation = require('../models/ParkingLocation');
const getParkingLocations = async (req, res) => {
  try {
    const locations = await ParkingLocation.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

module.exports = { getParkingLocations};
