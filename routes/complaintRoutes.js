const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Instructor routes
router.get('/my-complaints', authMiddleware, checkRole('instructor'), complaintController.getMyComplaints);
router.post('/', authMiddleware, checkRole('instructor'), complaintController.createComplaint);

// Admin routes
router.get('/', authMiddleware, checkRole('admin'), complaintController.getAllComplaints);
router.get('/:id', authMiddleware, complaintController.getComplaintById);
router.patch('/:id/status', authMiddleware, checkRole('admin'), complaintController.updateComplaintStatus);
router.delete('/:id', authMiddleware, checkRole('admin'), complaintController.deleteComplaint);

module.exports = router;