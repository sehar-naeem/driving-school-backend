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
    const validTimeSlots = [1, 35, 65, 125];
    
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
    
    console.log('💾 Saving vehicle...');

    await vehicle.save();

    console.log('✅ Vehicle saved successfully');

    const updatedVehicle = await Vehicle.findById(vehicle_id)
      .populate('current_instructor_id', 'full_name email phone');

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicle:allocated', updatedVehicle);
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