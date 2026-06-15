const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/dashboard/admin
 * @access  Private/Admin
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    // Get vehicle statistics
    const totalVehicles = await Vehicle.countDocuments();
    const vacantVehicles = await Vehicle.countDocuments({ status: 'vacant' });
    const busyVehicles = await Vehicle.countDocuments({ status: 'busy' });
    const maintenanceVehicles = await Vehicle.countDocuments({ status: 'maintenance' });

    // Get instructor statistics
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const activeInstructors = await User.countDocuments({ role: 'instructor', status: 'active' });
    const inactiveInstructors = await User.countDocuments({ role: 'instructor', status: 'inactive' });

    // Get complaint statistics
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in_progress' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const closedComplaints = await Complaint.countDocuments({ status: 'closed' });

    // Get recent complaints
    const recentComplaints = await Complaint.find()
      .populate('vehicle_id', 'registration_number model')
      .populate('instructor_id', 'full_name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get currently allocated vehicles
    const allocatedVehicles = await Vehicle.find({ status: 'busy' })
      .populate('current_instructor_id', 'full_name email')
      .select('registration_number model time_slot session_start');

    res.json({
      success: true,
      stats: {
        vehicles: {
          total: totalVehicles,
          vacant: vacantVehicles,
          busy: busyVehicles,
          maintenance: maintenanceVehicles
        },
        instructors: {
          total: totalInstructors,
          active: activeInstructors,
          inactive: inactiveInstructors
        },
        complaints: {
          total: totalComplaints,
          pending: pendingComplaints,
          in_progress: inProgressComplaints,
          resolved: resolvedComplaints,
          closed: closedComplaints
        }
      },
      recentComplaints,
      allocatedVehicles
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message 
    });
  }
};

/**
 * @desc    Get instructor dashboard statistics
 * @route   GET /api/dashboard/instructor
 * @access  Private/Instructor
 */
exports.getInstructorDashboard = async (req, res) => {
  try {
    // Get current vehicle allocation
    const currentVehicle = await Vehicle.findOne({ 
      current_instructor_id: req.user._id,
      status: 'busy'
    }).select('registration_number model time_slot session_start latitude longitude');

    // Get instructor's complaint statistics
    const totalComplaints = await Complaint.countDocuments({ instructor_id: req.user._id });
    const pendingComplaints = await Complaint.countDocuments({ 
      instructor_id: req.user._id,
      status: 'pending' 
    });
    const resolvedComplaints = await Complaint.countDocuments({ 
      instructor_id: req.user._id,
      status: 'resolved' 
    });

    // Get recent complaints by this instructor
    const recentComplaints = await Complaint.find({ instructor_id: req.user._id })
      .populate('vehicle_id', 'registration_number model')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        currentlyAllocated: !!currentVehicle,
        totalComplaints,
        pendingComplaints,
        resolvedComplaints
      },
      currentVehicle,
      recentComplaints
    });
  } catch (error) {
    console.error('Get instructor dashboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message 
    });
  }
};