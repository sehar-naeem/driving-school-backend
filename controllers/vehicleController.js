const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

/**
 * @desc    Get all vehicles
 * @route   GET /api/vehicles
 * @access  Private
 */
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('current_instructor_id', 'full_name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vehicles',
      error: error.message 
    });
  }
};

/**
 * @desc    Get single vehicle by ID
 * @route   GET /api/vehicles/:id
 * @access  Private
 */
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone');

    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    res.json({
      success: true,
      vehicle
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Get vehicles by status
 * @route   GET /api/vehicles/status/:status
 * @access  Private
 */
exports.getVehiclesByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const validStatuses = ['vacant', 'busy', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid status. Must be: vacant, busy, or maintenance' 
      });
    }

    const vehicles = await Vehicle.find({ status })
      .populate('current_instructor_id', 'full_name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      status,
      count: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error('Get vehicles by status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching vehicles',
      error: error.message 
    });
  }
};

/**
 * @desc    Create new vehicle
 * @route   POST /api/vehicles
 * @access  Private/Admin
 */
exports.createVehicle = async (req, res) => {
  try {
    const { registration_number, model, manufacturer, year, color } = req.body;

    if (!registration_number || !model || !manufacturer || !year || !color) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields' 
      });
    }

    const existingVehicle = await Vehicle.findOne({ 
      registration_number: registration_number.toUpperCase() 
    });

    if (existingVehicle) {
      return res.status(400).json({ 
        success: false,
        message: 'Vehicle with this registration number already exists' 
      });
    }

    const vehicle = await Vehicle.create({
      registration_number: registration_number.toUpperCase(),
      model,
      manufacturer,
      year,
      color
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:created', vehicle);
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Update vehicle
 * @route   PUT /api/vehicles/:id
 * @access  Private/Admin
 */
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    const allowedUpdates = ['model', 'manufacturer', 'year', 'color', 'status'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        vehicle[key] = req.body[key];
      }
    });

    await vehicle.save();

    const updatedVehicle = await Vehicle.findById(vehicle._id)
      .populate('current_instructor_id', 'full_name email phone');

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:updated', updatedVehicle);
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Delete vehicle
 * @route   DELETE /api/vehicles/:id
 * @access  Private/Admin
 */
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    if (vehicle.status === 'busy') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot delete vehicle that is currently allocated' 
      });
    }

    await vehicle.deleteOne();

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:deleted', { id: req.params.id });
    }

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Allocate vehicle to instructor
 * @route   POST /api/vehicles/allocate
 * @access  Private/Admin
 */
exports.allocateVehicle = async (req, res) => {
  try {
    const { vehicle_id, instructor_id, time_slot } = req.body;

    console.log('📋 Allocation Request:', { vehicle_id, instructor_id, time_slot });

    if (!vehicle_id || !instructor_id || !time_slot) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide vehicle_id, instructor_id, and time_slot' 
      });
    }

    const timeSlotNum = Number(time_slot);
    const validTimeSlots = [1, 10, 35, 65, 125];
    
    if (!validTimeSlots.includes(timeSlotNum) || isNaN(timeSlotNum)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid time_slot. Must be 1, 35, 65, or 125 minutes' 
      });
    }

    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    console.log('✅ Vehicle found:', vehicle.registration_number);

    if (vehicle.status === 'busy') {
      return res.status(400).json({ 
        success: false,
        message: 'Vehicle is already allocated' 
      });
    }

    if (vehicle.status === 'maintenance') {
      return res.status(400).json({ 
        success: false,
        message: 'Vehicle is under maintenance' 
      });
    }

    const instructor = await User.findOne({ 
      _id: instructor_id, 
      role: 'instructor'
    });

    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    console.log('✅ Instructor found:', instructor.full_name);

    // Check if instructor is already allocated to an active vehicle
    const alreadyBusyVehicle = await Vehicle.findOne({
      current_instructor_id: instructor_id,
      status: 'busy'
    });

    if (alreadyBusyVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Instructor ' + instructor.full_name + ' is already assigned to vehicle ' + alreadyBusyVehicle.registration_number + ' (' + alreadyBusyVehicle.model + ')'
      });
    }

    if (instructor.status === 'inactive') {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot allocate to inactive instructor' 
      });
    }

    vehicle.status = 'busy';
    vehicle.current_instructor_id = instructor_id;
    vehicle.time_slot = timeSlotNum;
    vehicle.session_start = new Date();
    vehicle.instructor_status = 'assigned';
    vehicle.instructor_acknowledged_at = null;
    vehicle.is_parked = false;
    
    console.log('💾 Saving vehicle...');

    await vehicle.save();

    console.log('✅ Vehicle saved successfully');

    const updatedVehicle = await Vehicle.findById(vehicle_id)
      .populate('current_instructor_id', 'full_name email phone');

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:allocated', updatedVehicle);
      req.app.get('io').emit('allocation:created', {
        vehicle: updatedVehicle,
        vehicle_id: updatedVehicle._id,
        instructor_id: instructor_id,
        registration_number: updatedVehicle.registration_number,
        model: updatedVehicle.model,
        time_slot: updatedVehicle.time_slot
      });
    }

    res.json({
      success: true,
      message: 'Vehicle allocated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    console.error('❌ Allocate error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error allocating vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Release vehicle
 * @route   POST /api/vehicles/:id/release
 * @access  Private/Admin
 */
exports.releaseVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    console.log('🔓 Releasing vehicle:', vehicle.registration_number);

    vehicle.status = 'vacant';
    vehicle.current_instructor_id = null;
    vehicle.time_slot = null;
    vehicle.session_start = null;
    await vehicle.save();

    console.log('✅ Vehicle released');

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:released', vehicle);
    }

    res.json({
      success: true,
      message: 'Vehicle released successfully',
      vehicle
    });
  } catch (error) {
    console.error('❌ Release error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error releasing vehicle',
      error: error.message 
    });
  }
};

/**
 * @desc    Update vehicle location
 * @route   PATCH /api/vehicles/:id/location
 * @access  Private
 */
exports.updateVehicleLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both latitude and longitude' 
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude must be between -90 and 90' 
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        success: false,
        message: 'Longitude must be between -180 and 180' 
      });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ 
        success: false,
        message: 'Vehicle not found' 
      });
    }

    vehicle.latitude = latitude;
    vehicle.longitude = longitude;
    vehicle.last_location_update = new Date();
    await vehicle.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('location:updated', {
        vehicle_id: vehicle._id,
        registration_number: vehicle.registration_number,
        latitude,
        longitude,
        timestamp: vehicle.last_location_update
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      vehicle: {
        id: vehicle._id,
        registration_number: vehicle.registration_number,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        last_location_update: vehicle.last_location_update
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating location',
      error: error.message 
    });
  }
};

/**
 * @desc    Instructor requests time extension for active vehicle
 * @route   POST /api/vehicles/:id/request-extension
 * @access  Private/Instructor
 */
exports.requestExtension = async (req, res) => {
  try {
    const { minutes, reason, latitude, longitude } = req.body;
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.status !== 'busy') {
      return res.status(400).json({ success: false, message: 'Vehicle is not currently in an active session' });
    }

    if (vehicle.is_parked) {
      return res.status(400).json({ success: false, message: 'Vehicle is already parked and ride is finished. Cannot request extension.' });
    }

    if (vehicle.extension_request && vehicle.extension_request.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'An extension request is already pending Admin approval. Please wait for the admin to reply.' 
      });
    }

    const extensionMinutes = Number(minutes) || 15;
    vehicle.extension_request = {
      minutes: extensionMinutes,
      reason: reason || 'Instructor requested additional time',
      requested_at: new Date(),
      status: 'pending'
    };

    if (latitude !== undefined && longitude !== undefined) {
      vehicle.latitude = Number(latitude);
      vehicle.longitude = Number(longitude);
      vehicle.last_location_update = new Date();
    }

    await vehicle.save();

    const payload = {
      vehicle_id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      instructor: vehicle.current_instructor_id ? vehicle.current_instructor_id.full_name : 'Instructor',
      instructor_id: vehicle.current_instructor_id ? vehicle.current_instructor_id._id : null,
      minutes: extensionMinutes,
      reason: vehicle.extension_request.reason,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      requested_at: vehicle.extension_request.requested_at
    };

    if (req.app.get('io')) {
      req.app.get('io').emit('extension:requested', payload);
      req.app.get('io').emit('extension:request', payload);
    }

    res.json({
      success: true,
      message: 'Extension request sent to administrator',
      extension_request: vehicle.extension_request,
      vehicle
    });
  } catch (error) {
    console.error('Request extension error:', error);
    res.status(500).json({ success: false, message: 'Error requesting extension', error: error.message });
  }
};

/**
 * @desc    Admin responds to instructor extension request (Approve / Decline)
 * @route   POST /api/vehicles/:id/respond-extension
 * @access  Private/Admin
 */
exports.respondExtension = async (req, res) => {
  try {
    const { approved, additional_minutes, message } = req.body;
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const isApproved = approved === true;
    const extraMin = Number(additional_minutes) || (vehicle.extension_request?.minutes || 15);

    if (isApproved) {
      vehicle.time_slot = (Number(vehicle.time_slot) || 0) + extraMin;
      vehicle.extension_request.status = 'approved';
    } else {
      vehicle.extension_request.status = 'rejected';
    }

    await vehicle.save();

    const payload = {
      vehicle_id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      approved: isApproved,
      additional_minutes: isApproved ? extraMin : 0,
      new_time_slot: vehicle.time_slot,
      message: message || (isApproved ? 'Extension approved by Admin' : 'Extension request declined by Admin'),
      vehicle
    };

    if (req.app.get('io')) {
      req.app.get('io').emit('extension:responded', payload);
      req.app.get('io').emit('extension:respond', payload);
      req.app.get('io').emit('vehicle:updated', vehicle);
    }

    res.json({
      success: true,
      message: isApproved ? 'Extension approved successfully' : 'Extension declined',
      vehicle
    });
  } catch (error) {
    console.error('Respond extension error:', error);
    res.status(500).json({ success: false, message: 'Error responding to extension', error: error.message });
  }
};

/**
 * @desc    Instructor reports vehicle is parked and session finished
 * @route   POST /api/vehicles/:id/report-parked
 * @access  Private/Instructor
 */
exports.reportParked = async (req, res) => {
  try {
    const { latitude, longitude, note } = req.body;
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    vehicle.is_parked = true;
    vehicle.parked_at = new Date();
    vehicle.instructor_status = 'parked';
    vehicle.extension_request = null;

    if (latitude !== undefined && longitude !== undefined) {
      vehicle.latitude = Number(latitude);
      vehicle.longitude = Number(longitude);
      vehicle.last_location_update = new Date();
    }

    await vehicle.save();

    const payload = {
      vehicle_id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      instructor: vehicle.current_instructor_id ? vehicle.current_instructor_id.full_name : 'Instructor',
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      parked_at: vehicle.parked_at,
      note: note || 'Car parked at driving school'
    };

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:parked', payload);
      req.app.get('io').emit('vehicle:updated', vehicle);
    }

    res.json({
      success: true,
      message: 'Vehicle reported as parked successfully',
      parked_info: payload,
      vehicle
    });
  } catch (error) {
    console.error('Report parked error:', error);
    res.status(500).json({ success: false, message: 'Error reporting parked vehicle', error: error.message });
  }
};


/**
 * @desc    Instructor acknowledges allocation and marks "On My Way / Start Lesson"
 * @route   POST /api/vehicles/:id/acknowledge-allocation
 * @access  Private/Instructor
 */
exports.acknowledgeAllocation = async (req, res) => {
  try {
    const { status, latitude, longitude } = req.body;
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    vehicle.instructor_status = status || 'on_way';
    vehicle.instructor_acknowledged_at = new Date();

    if (latitude !== undefined && longitude !== undefined) {
      vehicle.latitude = Number(latitude);
      vehicle.longitude = Number(longitude);
      vehicle.last_location_update = new Date();
    }

    await vehicle.save();

    const payload = {
      vehicle_id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      instructor: vehicle.current_instructor_id ? vehicle.current_instructor_id.full_name : 'Instructor',
      instructor_id: vehicle.current_instructor_id ? vehicle.current_instructor_id._id : null,
      instructor_status: vehicle.instructor_status,
      acknowledged_at: vehicle.instructor_acknowledged_at,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude
    };

    if (req.app.get('io')) {
      req.app.get('io').emit('instructor:on_way', payload);
      req.app.get('io').emit('vehicle:updated', vehicle);
    }

    res.json({
      success: true,
      message: 'Allocation acknowledged successfully. Admin notified that instructor is on the way!',
      vehicle
    });
  } catch (error) {
    console.error('Acknowledge allocation error:', error);
    res.status(500).json({ success: false, message: 'Error acknowledging allocation', error: error.message });
  }
};
