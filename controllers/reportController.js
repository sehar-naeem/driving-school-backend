const LessonReport = require('../models/LessonReport');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

/**
 * @desc    Get admin reports and analytics (KPIs, Instructor performance breakdown, Logs)
 * @route   GET /api/reports/admin
 * @access  Private/Admin
 */
exports.getAdminReports = async (req, res) => {
  try {
    const { month, instructor_id, vehicle_id, status } = req.query;

    const query = {};
    if (month && month !== 'all') {
      query.month_key = month;
    }
    if (instructor_id && instructor_id !== 'all') {
      query.instructor_id = instructor_id;
    }
    if (vehicle_id && vehicle_id !== 'all') {
      query.vehicle_id = vehicle_id;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const logs = await LessonReport.find(query).sort({ allocated_at: -1 });

    // Calculate Overall Summary KPIs
    const totalAllocations = logs.length;
    let startedCount = 0;
    let completedCount = 0;
    let declinedCount = 0;
    let pendingCount = 0;
    let totalExtensionRequests = 0;
    let extensionsApproved = 0;
    let extensionsRejected = 0;
    let totalTrainingMinutes = 0;

    // Per-Instructor Breakdown Map
    const instructorMap = {};

    // Per-Vehicle Breakdown Map
    const vehicleMap = {};

    logs.forEach(log => {
      if (log.status === 'in_progress') startedCount++;
      if (log.status === 'completed') {
        startedCount++;
        completedCount++;
        totalTrainingMinutes += (log.total_duration_minutes || log.initial_time_slot || 35);
      }
      if (log.status === 'declined') declinedCount++;
      if (log.status === 'assigned') pendingCount++;

      // Count extensions
      if (Array.isArray(log.extensions)) {
        log.extensions.forEach(ext => {
          totalExtensionRequests++;
          if (ext.status === 'approved') extensionsApproved++;
          if (ext.status === 'rejected') extensionsRejected++;
        });
      }

      // Instructor stats aggregation
      const instKey = log.instructor_id.toString();
      if (!instructorMap[instKey]) {
        instructorMap[instKey] = {
          instructor_id: log.instructor_id,
          instructor_name: log.instructor_name,
          instructor_email: log.instructor_email,
          total_assigned: 0,
          started: 0,
          completed: 0,
          declined: 0,
          extension_requests: 0,
          extensions_approved: 0,
          extensions_rejected: 0,
          total_minutes: 0
        };
      }
      instructorMap[instKey].total_assigned++;
      if (log.status === 'completed' || log.status === 'in_progress') {
        instructorMap[instKey].started++;
        if (log.status === 'completed') {
          instructorMap[instKey].completed++;
          instructorMap[instKey].total_minutes += (log.total_duration_minutes || log.initial_time_slot || 35);
        }
      }
      if (log.status === 'declined') instructorMap[instKey].declined++;
      if (Array.isArray(log.extensions)) {
        log.extensions.forEach(ext => {
          instructorMap[instKey].extension_requests++;
          if (ext.status === 'approved') instructorMap[instKey].extensions_approved++;
          if (ext.status === 'rejected') instructorMap[instKey].extensions_rejected++;
        });
      }

      // Vehicle stats aggregation
      const vehKey = log.vehicle_id.toString();
      if (!vehicleMap[vehKey]) {
        vehicleMap[vehKey] = {
          vehicle_id: log.vehicle_id,
          model: log.vehicle_model,
          registration_number: log.registration_number,
          total_assigned: 0,
          completed_lessons: 0,
          declined_count: 0,
          total_minutes: 0
        };
      }
      vehicleMap[vehKey].total_assigned++;
      if (log.status === 'completed') {
        vehicleMap[vehKey].completed_lessons++;
        vehicleMap[vehKey].total_minutes += (log.total_duration_minutes || log.initial_time_slot || 35);
      }
      if (log.status === 'declined') vehicleMap[vehKey].declined_count++;
    });

    const instructorBreakdown = Object.values(instructorMap).map(item => ({
      ...item,
      acceptance_rate: item.total_assigned ? Math.round((item.started / item.total_assigned) * 100) : 0,
      decline_rate: item.total_assigned ? Math.round((item.declined / item.total_assigned) * 100) : 0,
      total_hours: (item.total_minutes / 60).toFixed(1)
    }));

    const vehicleBreakdown = Object.values(vehicleMap).map(item => ({
      ...item,
      total_hours: (item.total_minutes / 60).toFixed(1)
    }));

    // Generate available distinct month list for dropdown filter
    const allReports = await LessonReport.find({}, 'month_key');
    const availableMonths = Array.from(new Set(allReports.map(r => r.month_key).filter(Boolean))).sort().reverse();
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (!availableMonths.includes(currentMonthKey)) {
      availableMonths.unshift(currentMonthKey);
    }

    res.json({
      success: true,
      summary: {
        total_allocations: totalAllocations,
        started_count: startedCount,
        completed_count: completedCount,
        declined_count: declinedCount,
        pending_count: pendingCount,
        acceptance_rate: totalAllocations ? Math.round((startedCount / totalAllocations) * 100) : 0,
        decline_rate: totalAllocations ? Math.round((declinedCount / totalAllocations) * 100) : 0,
        extension_requests: totalExtensionRequests,
        extensions_approved: extensionsApproved,
        extensions_rejected: extensionsRejected,
        total_training_minutes: totalTrainingMinutes,
        total_training_hours: (totalTrainingMinutes / 60).toFixed(1)
      },
      instructor_breakdown: instructorBreakdown,
      vehicle_breakdown: vehicleBreakdown,
      available_months: availableMonths,
      logs: logs
    });
  } catch (error) {
    console.error('Get admin reports error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving admin reports', error: error.message });
  }
};

/**
 * @desc    Get personal reports for logged-in instructor
 * @route   GET /api/reports/instructor
 * @access  Private/Instructor
 */
exports.getInstructorReports = async (req, res) => {
  try {
    const instructorId = req.user.id || req.user._id;
    const { month, status } = req.query;

    const query = { instructor_id: instructorId };
    if (month && month !== 'all') {
      query.month_key = month;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const logs = await LessonReport.find(query).sort({ allocated_at: -1 });

    const totalAssigned = logs.length;
    let startedCount = 0;
    let completedCount = 0;
    let declinedCount = 0;
    let extensionRequests = 0;
    let extensionsApproved = 0;
    let extensionsRejected = 0;
    let totalMinutes = 0;

    logs.forEach(log => {
      if (log.status === 'in_progress') startedCount++;
      if (log.status === 'completed') {
        startedCount++;
        completedCount++;
        totalMinutes += (log.total_duration_minutes || log.initial_time_slot || 35);
      }
      if (log.status === 'declined') declinedCount++;

      if (Array.isArray(log.extensions)) {
        log.extensions.forEach(ext => {
          extensionRequests++;
          if (ext.status === 'approved') extensionsApproved++;
          if (ext.status === 'rejected') extensionsRejected++;
        });
      }
    });

    const allMyReports = await LessonReport.find({ instructor_id: instructorId }, 'month_key');
    const availableMonths = Array.from(new Set(allMyReports.map(r => r.month_key).filter(Boolean))).sort().reverse();
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    if (!availableMonths.includes(currentMonthKey)) {
      availableMonths.unshift(currentMonthKey);
    }

    res.json({
      success: true,
      summary: {
        total_assigned: totalAssigned,
        started_count: startedCount,
        completed_count: completedCount,
        declined_count: declinedCount,
        acceptance_rate: totalAssigned ? Math.round((startedCount / totalAssigned) * 100) : 0,
        decline_rate: totalAssigned ? Math.round((declinedCount / totalAssigned) * 100) : 0,
        extension_requests: extensionRequests,
        extensions_approved: extensionsApproved,
        extensions_rejected: extensionsRejected,
        total_minutes: totalMinutes,
        total_hours: (totalMinutes / 60).toFixed(1)
      },
      available_months: availableMonths,
      logs: logs
    });
  } catch (error) {
    console.error('Get instructor reports error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving instructor reports', error: error.message });
  }
};
