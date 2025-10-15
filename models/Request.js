const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parkDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickupDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['park', 'pickup'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'verified', 'handed_over', 'self_parked', 'self_pickup'], default: 'pending' },
  locationFrom: { lat: Number, lng: Number },
  locationTo: { lat: Number, lng: Number },
  completionTime: { type: Date },
  handoverTime: { type: Date },
  verificationTime: { type: Date },
  isSelfParked: { type: Boolean, default: false },
  isSelfPickup: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);
