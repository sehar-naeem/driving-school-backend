const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Login user (admin or instructor)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both username and password' 
      });
    }

    // Find user by username
    const user = await User.findOne({ username }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials. Please check your username and password.' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials. Please check your username and password.' 
      });
    }

    // Check if user is active
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        success: false,
        message: 'Your account is inactive. Please contact administrator.' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Send response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        created_at: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: error.message 
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching profile',
      error: error.message 
    });
  }
};

/**
 * @desc    Get all instructors
 * @route   GET /api/auth/instructors
 * @access  Private/Admin
 */
exports.getAllInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: 'instructor' })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: instructors.length,
      instructors
    });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching instructors',
      error: error.message 
    });
  }
};

/**
 * @desc    Register new instructor
 * @route   POST /api/auth/register-instructor
 * @access  Private/Admin
 */
exports.registerInstructor = async (req, res) => {
  try {
    const { username, password, full_name, email, phone } = req.body;

    // Validation
    if (!username || !password || !full_name || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide username, password, full_name, and email' 
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

    // Create instructor
    const instructor = await User.create({
      username,
      password,
      full_name,
      email,
      phone,
      role: 'instructor',
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Instructor registered successfully',
      instructor
    });

  } catch (error) {
    console.error('Register instructor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error registering instructor',
      error: error.message 
    });
  }
};

/**
 * @desc    Delete instructor
 * @route   DELETE /api/auth/instructors/:id
 * @access  Private/Admin
 */
exports.deleteInstructor = async (req, res) => {
  try {
    const instructor = await User.findOne({
      _id: req.params.id,
      role: 'instructor'
    });

    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    await instructor.deleteOne();

    res.json({
      success: true,
      message: 'Instructor deleted successfully'
    });
  } catch (error) {
    console.error('Delete instructor error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting instructor',
      error: error.message 
    });
  }
};

/**
 * @desc    Toggle instructor status
 * @route   PATCH /api/auth/instructors/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleInstructorStatus = async (req, res) => {
  try {
    const instructor = await User.findOne({
      _id: req.params.id,
      role: 'instructor'
    });

    if (!instructor) {
      return res.status(404).json({ 
        success: false,
        message: 'Instructor not found' 
      });
    }

    instructor.status = instructor.status === 'active' ? 'inactive' : 'active';
    await instructor.save();

    res.json({
      success: true,
      message: `Instructor ${instructor.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      instructor
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error toggling instructor status',
      error: error.message 
    });
  }
};