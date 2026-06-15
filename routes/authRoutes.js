const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);

// Admin only routes
router.get('/instructors', authMiddleware, checkRole('admin'), authController.getAllInstructors);
router.post('/register-instructor', authMiddleware, checkRole('admin'), authController.registerInstructor);
router.delete('/instructors/:id', authMiddleware, checkRole('admin'), authController.deleteInstructor);
router.patch('/instructors/:id/toggle-status', authMiddleware, checkRole('admin'), authController.toggleInstructorStatus);

module.exports = router;