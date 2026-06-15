// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ==========================================
// GET ALL INSTRUCTORS
// ==========================================
// ==========================================
// GET ALL INSTRUCTORS - FIXED
// ==========================================
router.get('/instructors',authMiddleware ,async (req, res) => {
  try {
    const instructors = await User.find({ role: 'instructor' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean(); // ← IMPORTANT: Convert to plain objects
    
    // ✅ Map _id to id for frontend compatibility
    const instructorsWithId = instructors.map(inst => ({
      ...inst,
      id: inst._id.toString(), // ← ADD THIS LINE
      _id: inst._id.toString()
    }));
    
    res.json({
      success: true,
      instructors: instructorsWithId, // ← Use mapped array
      count: instructorsWithId.length
    });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch instructors' 
    });
  }
});

// ==========================================
// GET INSTRUCTOR BY ID
// ==========================================
// ==========================================
// GET ALL INSTRUCTORS - FIXED
// ==========================================
router.get('/instructors', authMiddleware, async (req, res) => {
  try {
    const instructors = await User.find({ role: 'instructor' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean(); // Convert to plain JavaScript objects
    
    // Map _id to id for frontend compatibility
    const instructorsWithId = instructors.map(inst => ({
      ...inst,
      id: inst._id.toString(), // Add id field
      _id: inst._id.toString()  // Keep _id as string too
    }));
    
    res.json({
      success: true,
      instructors: instructorsWithId,
      count: instructorsWithId.length
    });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch instructors' 
    });
  }
});

// ==========================================
// REGISTER NEW INSTRUCTOR (Admin only)
// ==========================================
router.post('/instructors', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { username, password, full_name, email, phone } = req.body;

    // Validate required fields
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Username, password, full name, and email are required' 
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }

    // Create new instructor (password will be hashed by pre-save hook)
    const instructor = new User({
      username,
      password,
      full_name,
      email,
      phone: phone || '',
      role: 'instructor',
      status: 'active'
    });

    await instructor.save();

    // Return success without password
    const instructorData = instructor.toJSON();

    res.status(201).json({ 
      success: true,
      message: 'Instructor registered successfully',
      instructor: instructorData
    });

  } catch (error) {
    console.error('Register instructor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to register instructor',
      error: error.message
    });
  }
});

// ==========================================
// UPDATE INSTRUCTOR
// ==========================================
router.put('/instructors/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { full_name, email, phone } = req.body;
    
    const instructor = await User.findById(req.params.id);
    
    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    if (instructor.role !== 'instructor') {
      return res.status(400).json({ 
        success: false,
        message: 'User is not an instructor' 
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== instructor.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already exists' 
        });
      }
    }

    // Update fields
    if (full_name) instructor.full_name = full_name;
    if (email) instructor.email = email;
    if (phone !== undefined) instructor.phone = phone;

    await instructor.save();

    const instructorData = instructor.toJSON();

    res.json({ 
      success: true,
      message: 'Instructor updated successfully',
      instructor: instructorData
    });

  } catch (error) {
    console.error('Update instructor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update instructor' 
    });
  }
});

// ==========================================
// TOGGLE INSTRUCTOR STATUS
// ==========================================
router.patch('/instructors/:id/toggle-status', authMiddleware, isAdmin, async (req, res) => {
  try {
    const instructor = await User.findById(req.params.id);
    
    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    if (instructor.role !== 'instructor') {
      return res.status(400).json({ 
        success: false,
        message: 'User is not an instructor' 
      });
    }

    instructor.status = instructor.status === 'active' ? 'inactive' : 'active';
    await instructor.save();

    const instructorData = instructor.toJSON();

    res.json({ 
      success: true,
      message: `Instructor ${instructor.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      instructor: instructorData
    });

  } catch (error) {
    console.error('Toggle instructor status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to toggle instructor status' 
    });
  }
});

// ==========================================
// DELETE INSTRUCTOR
// ==========================================
router.delete('/instructors/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const instructor = await User.findById(req.params.id);
    
    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    if (instructor.role !== 'instructor') {
      return res.status(400).json({ 
        success: false,
        message: 'User is not an instructor' 
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: 'Instructor deleted successfully' 
    });

  } catch (error) {
    console.error('Delete instructor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete instructor' 
    });
  }
});

module.exports = router;