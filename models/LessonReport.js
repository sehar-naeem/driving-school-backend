const mongoose = require('mongoose');

const extensionEntrySchema = new mongoose.Schema({
  requested_minutes: { type: Number, default: 15 },
  reason: { type: String, default: '' },
  requested_at: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  admin_minutes: { type: Number, default: 0 },
  admin_message: { type: String, default: '' },
  responded_at: { type: Date, default: null }
}, { _id: false });

const lessonReportSchema = new mongoose.Schema({
  instructor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  instructor_name: {
    type: String,
    required: true
  },
  instructor_email: {
    type: String,
    default: ''
  },
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  vehicle_model: {
    type: String,
    required: true
  },
  registration_number: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'declined', 'cancelled'],
    default: 'assigned'
  },
  allocated_at: {
    type: Date,
    default: Date.now
  },
  started_at: {
    type: Date,
    default: null
  },
  declined_at: {
    type: Date,
    default: null
  },
  declined_reason: {
    type: String,
    default: ''
  },
  completed_at: {
    type: Date,
    default: null
  },
  initial_time_slot: {
    type: Number,
    default: 35
  },
  total_duration_minutes: {
    type: Number,
    default: 35
  },
  extensions: [extensionEntrySchema],
  parked_note: {
    type: String,
    default: ''
  },
  month_key: {
    type: String, // e.g. '2026-08', '2026-09' for fast monthly aggregation
    default: () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}, {
  timestamps: true
});

lessonReportSchema.index({ instructor_id: 1, month_key: 1 });
lessonReportSchema.index({ vehicle_id: 1 });
lessonReportSchema.index({ status: 1 });
lessonReportSchema.index({ allocated_at: -1 });

module.exports = mongoose.model('LessonReport', lessonReportSchema);
