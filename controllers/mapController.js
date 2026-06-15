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
      .populate('current_instructor_id', 'full_name')
      .select(
        'registration_number model status latitude longitude last_location_update current_instructor_id'
      );

    const locations = vehicles.map(vehicle => ({
      id: vehicle._id,
      registration_number: vehicle.registration_number,
      model: vehicle.model,
      status: vehicle.status,
      instructor: vehicle.current_instructor_id
        ? vehicle.current_instructor_id.full_name
        : null,
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
      .populate('current_instructor_id', 'full_name')
      .select(
        'registration_number model status latitude longitude last_location_update current_instructor_id'
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
        instructor: vehicle.current_instructor_id
          ? vehicle.current_instructor_id.full_name
          : null,
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
 * @desc    Get address from coordinates using Google Maps Geocoding API
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

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const address = response.data.results[0].formatted_address;

      res.json({
        success: true,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        address,
        fullResponse: response.data.results[0]
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
 * @desc    Get coordinates from address using Google Maps Geocoding API
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

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;

      res.json({
        success: true,
        address: result.formatted_address,
        coordinates: {
          latitude: location.lat,
          longitude: location.lng
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
 * @desc    Get route between two points using Google Maps Directions API
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
      'https://maps.googleapis.com/maps/api/directions/json',
      {
        params: {
          origin: `${origin_lat},${origin_lng}`,
          destination: `${dest_lat},${dest_lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];

      res.json({
        success: true,
        route: {
          distance: route.legs[0].distance,
          duration: route.legs[0].duration,
          start_address: route.legs[0].start_address,
          end_address: route.legs[0].end_address,
          polyline: route.overview_polyline.points
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
