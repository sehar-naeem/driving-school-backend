const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Admin report endpoint
router.get('/admin', authMiddleware, checkRole('admin'), reportController.getAdminReports);

// Instructor report endpoint
router.get('/instructor', authMiddleware, reportController.getInstructorReports);

module.exports = router;
