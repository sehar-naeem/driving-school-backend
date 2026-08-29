const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  registration_number: {
    type: String,
    required: [true, 'Please add a registration number'],
    unique: true,
    uppercase: true,
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Please add a vehicle model'],
    trim: true
  },
  manufacturer: {
    type: String,
    required: [true, 'Please add a manufacturer'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Please add a year'],
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  color: {
    type: String,
    required: [true, 'Please add a color'],
    trim: true
  },
  status: {
    type: String,
    enum: ['vacant', 'busy', 'maintenance'],
    default: 'vacant'
  },
  current_instructor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  time_slot: {
    type: Number,
    default: null
  },
  session_start: {
    type: Date,
    default: null
  },
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  last_location_update: {
    type: Date,
    default: null
  },
  is_parked: {
    type: Boolean,
    default: false
  },
  parked_at: {
    type: Date,
    default: null
  },
  extension_request: {
    minutes: { type: Number, default: null },
    reason: { type: String, default: '' },
    requested_at: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected', null], default: null }
  }
}, {
  timestamps: true
});

// Index for better query performance
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ current_instructor_id: 1 });
vehicleSchema.index({ registration_number: 1 });

// Virtual for getting current instructor (backward compatibility)
vehicleSchema.virtual('current_instructor', {
  ref: 'User',
  localField: 'current_instructor_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON
vehicleSchema.set('toJSON', { virtuals: true });
vehicleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
