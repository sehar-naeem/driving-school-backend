const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all vehicle locations
router.get('/vehicles', mapController.getAllVehicleLocations);

// Get single vehicle location
router.get('/vehicles/:id', mapController.getVehicleLocation);

// Geocoding - convert coordinates to address
router.get('/geocode', mapController.geocodeLocation);

// Search - convert address to coordinates
router.get('/search', mapController.searchLocation);

// Get route between two points
router.get('/route', mapController.getRoute);

module.exports = router;