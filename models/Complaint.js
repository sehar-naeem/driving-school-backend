const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle is required']
  },
  instructor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  issue_type: {
    type: String,
    enum: ['mechanical', 'maintenance', 'accident', 'safety', 'other'],
    required: [true, 'Issue type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  admin_response: {
    type: String,
    default: null
  },
  resolved_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Virtual for vehicle details
complaintSchema.virtual('vehicle', {
  ref: 'Vehicle',
  localField: 'vehicle_id',
  foreignField: '_id',
  justOne: true
});

// Virtual for instructor details
complaintSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructor_id',
  foreignField: '_id',
  justOne: true
});

// Enable virtuals
complaintSchema.set('toJSON', { virtuals: true });
complaintSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);