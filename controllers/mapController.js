const axios = require('axios');
const Vehicle = require('../models/Vehicle');

/**
 * @desc    Get all vehicle locations for map
 * @route   GET /api/map/vehicles
 * @access  Private
 */
exports.getAllVehicleLocations = async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('current_instructor_id', 'full_name email phone')
      .select(
        'registration_number model status latitude longitude last_location_update current_instructor_id time_slot session_start'
      );

    const locations = vehicles.map(vehicle => ({
      id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      status: vehicle.status,
      time_slot: vehicle.time_slot,
      session_start: vehicle.session_start,
      instructor: vehicle.current_instructor_id
        ? vehicle.current_instructor_id.full_name
        : null,
      instructor_details: vehicle.current_instructor_id || null,
      coordinates: {
        latitude: vehicle.latitude,
        longitude: vehicle.longitude
      },
      last_update: vehicle.last_location_update
    }));

    res.json({
      success: true,
      count: locations.length,
      locations
    });
  } catch (error) {
    console.error('Get vehicle locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle locations',
      error: error.message
    });
  }
};

/**
 * @desc    Get single vehicle location
 * @route   GET /api/map/vehicles/:id
 * @access  Private
 */
exports.getVehicleLocation = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('current_instructor_id', 'full_name email phone')
      .select(
        'registration_number model status latitude longitude last_location_update current_instructor_id time_slot session_start'
      );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      location: {
        id: vehicle._id,
        registration_number: vehicle.registration_number,
        model: vehicle.model,
        status: vehicle.status,
        time_slot: vehicle.time_slot,
        session_start: vehicle.session_start,
        instructor: vehicle.current_instructor_id
          ? vehicle.current_instructor_id.full_name
          : null,
        instructor_details: vehicle.current_instructor_id || null,
        coordinates: {
          latitude: vehicle.latitude,
          longitude: vehicle.longitude
        },
        last_update: vehicle.last_location_update
      }
    });
  } catch (error) {
    console.error('Get vehicle location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle location',
      error: error.message
    });
  }
};

/**
 * @desc    Get address from coordinates using free OpenStreetMap Nominatim
 * @route   GET /api/map/geocode
 * @access  Private
 */
exports.geocodeLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: latitude,
        lon: longitude
      },
      headers: {
        'User-Agent': 'DrivingSchoolManagement/1.0'
      }
    });

    if (response.data && response.data.display_name) {
      res.json({
        success: true,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        address: response.data.display_name,
        fullResponse: response.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Address not found for given coordinates'
      });
    }
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error geocoding location',
      error: error.message
    });
  }
};

/**
 * @desc    Get coordinates from address using free OpenStreetMap Nominatim
 * @route   GET /api/map/search
 * @access  Private
 */
exports.searchLocation = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an address to search'
      });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: address
      },
      headers: {
        'User-Agent': 'DrivingSchoolManagement/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      res.json({
        success: true,
        address: result.display_name,
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        },
        fullResponse: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }
  } catch (error) {
    console.error('Search location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching location',
      error: error.message
    });
  }
};

/**
 * @desc    Get route between two points
 * @route   GET /api/map/route
 * @access  Private
 */
exports.getRoute = async (req, res) => {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = req.query;

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide origin and destination coordinates'
      });
    }

    const response = await axios.get(
      'https://router.project-osrm.org/route/v1/driving/' + origin_lng + ',' + origin_lat + ';' + dest_lng + ',' + dest_lat + '?overview=full&geometries=geojson'
    );

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      res.json({
        success: true,
        route: {
          distance: { text: (route.distance / 1000).toFixed(2) + ' km', value: route.distance },
          duration: { text: Math.round(route.duration / 60) + ' mins', value: route.duration },
          geometry: route.geometry
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching route',
      error: error.message
    });
  }
};
