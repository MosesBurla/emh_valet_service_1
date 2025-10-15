const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  number: { type: String, required: true, unique: true },
  color: { type: String },
  photoUrl: { type: String },
  status: { type: String, enum: ['available', 'parked', 'in-progress'], default: 'available' },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
