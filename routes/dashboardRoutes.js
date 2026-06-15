const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Admin dashboard
router.get('/admin', authMiddleware, checkRole('admin'), dashboardController.getAdminDashboard);

// Instructor dashboard
router.get('/instructor', authMiddleware, checkRole('instructor'), dashboardController.getInstructorDashboard);

module.exports = router;