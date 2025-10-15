const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  parkDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickupDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // 'park_request', 'pickup_request', 'accepted', 'completed', 'verified', 'handed_over', 'self_parked', 'self_pickup'
  details: {
    requestType: { type: String },
    carNumber: { type: String },
    ownerName: { type: String },
    ownerPhone: { type: String },
    parkDriverName: { type: String },
    pickupDriverName: { type: String },
    location: { type: String },
    notes: { type: String }
  },
  timestamp: { type: Date, default: Date.now },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Index for efficient querying
historySchema.index({ requestId: 1, timestamp: -1 });
historySchema.index({ vehicleId: 1, timestamp: -1 });
historySchema.index({ performedBy: 1, timestamp: -1 });

module.exports = mongoose.model('History', historySchema);
