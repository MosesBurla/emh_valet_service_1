const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  photoUrl: { type: String },
  password: { type: String, required: false },
  role: { type: String, enum: ['admin', 'driver', 'valet_supervisor', 'parking_location_supervisor'], required: true },
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  licenseDetails: { type: Object },
  defaultLocation: { type: Object },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
