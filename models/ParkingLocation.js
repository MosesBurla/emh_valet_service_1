const mongoose = require('mongoose');

const parkingLocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  geolocation: { lat: Number, lng: Number },
  capacity: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ParkingLocation', parkingLocationSchema);
