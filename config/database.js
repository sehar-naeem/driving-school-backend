const mongoose = require('mongoose');
const User = require('../models/User');

const connectDatabase = async () => {
  try {
    // Connect to MongoDB (Mongoose 7+ does not need useNewUrlParser or useUnifiedTopology)
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    
    // Create default users if they don't exist
    await createDefaultUsers();
    
    return conn;
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Create default admin and instructor
const createDefaultUsers = async () => {
  try {
    // Create Admin
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      await User.create({
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
        full_name: 'System Administrator',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@drivingschool.com',
        role: 'admin',
        status: 'active'
      });
      
      console.log('✅ Default admin created:');
      console.log('   Username:', process.env.DEFAULT_ADMIN_USERNAME || 'admin');
      console.log('   Password:', process.env.DEFAULT_ADMIN_PASSWORD || 'admin123');
    }
    
    // Create Sample Instructor
    const instructorExists = await User.findOne({ username: 'john_doe' });
    if (!instructorExists) {
      await User.create({
        username: 'john_doe',
        password: 'instructor123',
        full_name: 'John Doe',
        email: 'john@drivingschool.com',
        phone: '+92-300-1234567',
        role: 'instructor',
        status: 'active'
      });
      console.log('✅ Sample instructor created:');
      console.log('   Username: john_doe');
      console.log('   Password: instructor123');
    }
    
  } catch (error) {
    console.error('Error creating default users:', error.message);
  }
};

module.exports = connectDatabase;
