const Complaint = require('../models/Complaint');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

/**
 * @desc    Get all complaints (Admin only)
 * @route   GET /api/complaints
 * @access  Private/Admin
 */
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('vehicle_id', 'registration_number model manufacturer')
      .populate('instructor_id', 'full_name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching complaints',
      error: error.message 
    });
  }
};

/**
 * @desc    Get my complaints (Instructor only)
 * @route   GET /api/complaints/my-complaints
 * @access  Private/Instructor
 */
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ instructor_id: req.user._id })
      .populate('vehicle_id', 'registration_number model manufacturer')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching your complaints',
      error: error.message 
    });
  }
};

/**
 * @desc    Get single complaint by ID
 * @route   GET /api/complaints/:id
 * @access  Private
 */
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('vehicle_id', 'registration_number model manufacturer')
      .populate('instructor_id', 'full_name email phone');

    if (!complaint) {
      return res.status(404).json({ 
        success: false,
        message: 'Complaint not found' 
      });
    }

    // Check authorization (instructor can only see their own complaints)
    if (req.user.role === 'instructor' && complaint.instructor_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only view your own complaints' 
      });
    }

    res.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching complaint',
      error: error.message 
    });
  }
};

/**
 * @desc    Create new complaint
 * @route   POST /api/complaints
 * @access  Private/Instructor
 */
exports.createComplaint = async (req, res) => {
  try {
    const { vehicle_id, issue_type, title, description, priority } = req.body;

    // Validation
    if (!vehicle_id || !issue_type || !title || !description) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide vehicle_id, issue_type, title, and description' 
      });
    }

    // Check if vehicle exists
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    // Create complaint
    const complaint = await Complaint.create({
      vehicle_id,
      instructor_id: req.user._id,
      issue_type,
      title,
      description,
      priority: priority || 'medium',
      status: 'pending'
    });

    const complaintWithDetails = await Complaint.findById(complaint._id)
      .populate('vehicle_id', 'registration_number model manufacturer')
      .populate('instructor_id', 'full_name email phone');

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('complaint:created', complaintWithDetails);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint filed successfully',
      complaint: complaintWithDetails
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating complaint',
      error: error.message 
    });
  }
};

/**
 * @desc    Update complaint status and admin response
 * @route   PATCH /api/complaints/:id/status
 * @access  Private/Admin
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, admin_response } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ 
        success: false,
        message: 'Complaint not found' 
      });
    }

    // Update status if provided
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid status. Must be: pending, in_progress, resolved, or closed' 
        });
      }
      complaint.status = status;

      // Set resolved_at timestamp if status is resolved
      if (status === 'resolved' && !complaint.resolved_at) {
        complaint.resolved_at = new Date();
      }
    }

    // Update admin response if provided
    if (admin_response) {
      complaint.admin_response = admin_response;
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate('vehicle_id', 'registration_number model manufacturer')
      .populate('instructor_id', 'full_name email phone');

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('complaint:updated', updatedComplaint);
    }

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      complaint: updatedComplaint
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating complaint',
      error: error.message 
    });
  }
};

/**
 * @desc    Delete complaint
 * @route   DELETE /api/complaints/:id
 * @access  Private/Admin
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ 
        success: false,
        message: 'Complaint not found' 
      });
    }

    await complaint.deleteOne();

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').emit('complaint:deleted', { id: req.params.id });
    }

    res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting complaint',
      error: error.message 
    });
  }
};