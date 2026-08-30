const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// All authenticated users can view vehicles
router.get('/', authMiddleware, vehicleController.getAllVehicles);
router.get('/status/:status', authMiddleware, vehicleController.getVehiclesByStatus);
router.get('/:id', authMiddleware, vehicleController.getVehicleById);

// Admin only routes
router.post('/', authMiddleware, checkRole('admin'), vehicleController.createVehicle);
router.put('/:id', authMiddleware, checkRole('admin'), vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, checkRole('admin'), vehicleController.deleteVehicle);
router.post('/allocate', authMiddleware, checkRole('admin'), vehicleController.allocateVehicle);
router.post('/:id/release', authMiddleware, checkRole('admin'), vehicleController.releaseVehicle);
router.post('/:id/respond-extension', authMiddleware, checkRole('admin'), vehicleController.respondExtension);

// Instructor / User accessible routes
router.patch('/:id/location', authMiddleware, vehicleController.updateVehicleLocation);
router.post('/:id/acknowledge-allocation', authMiddleware, vehicleController.acknowledgeAllocation);
router.post('/:id/request-extension', authMiddleware, vehicleController.requestExtension);
router.post('/:id/report-parked', authMiddleware, vehicleController.reportParked);

module.exports = router;
