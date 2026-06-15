require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Complaint = require('./models/Complaint');

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Complaint.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const admin = await User.create({
      username: 'admin',
      password: 'admin123',
      full_name: 'System Administrator',
      email: 'admin@drivingschool.com',
      role: 'admin',
      status: 'active'
    });
    console.log('✅ Admin created');

    // Create Instructors
    const instructors = await User.insertMany([
      {
        username: 'john_doe',
        password: 'instructor123',
        full_name: 'John Doe',
        email: 'john@drivingschool.com',
        phone: '+92-300-1234567',
        role: 'instructor',
        status: 'active'
      },
      {
        username: 'jane_smith',
        password: 'instructor123',
        full_name: 'Jane Smith',
        email: 'jane@drivingschool.com',
        phone: '+92-300-7654321',
        role: 'instructor',
        status: 'active'
      },
      {
        username: 'mike_wilson',
        password: 'instructor123',
        full_name: 'Mike Wilson',
        email: 'mike@drivingschool.com',
        phone: '+92-301-1234567',
        role: 'instructor',
        status: 'active'
      }
    ]);
    console.log(`✅ ${instructors.length} Instructors created`);

    // Create Vehicles
    const vehicles = await Vehicle.insertMany([
      {
        registration_number: 'ABC-123',
        model: 'Toyota Corolla',
        manufacturer: 'Toyota',
        year: 2022,
        color: 'White',
        status: 'vacant',
        latitude: 33.5651,
        longitude: 73.0169
      },
      {
        registration_number: 'XYZ-456',
        model: 'Honda Civic',
        manufacturer: 'Honda',
        year: 2023,
        color: 'Black',
        status: 'busy',
        current_instructor_id: instructors[0]._id,
        time_slot: 65,
        session_start: new Date(),
        latitude: 33.5951,
        longitude: 73.0469
      },
      {
        registration_number: 'DEF-789',
        model: 'Suzuki Alto',
        manufacturer: 'Suzuki',
        year: 2021,
        color: 'Silver',
        status: 'vacant',
        latitude: 33.5451,
        longitude: 73.0069
      },
      {
        registration_number: 'GHI-101',
        model: 'Honda City',
        manufacturer: 'Honda',
        year: 2023,
        color: 'Blue',
        status: 'vacant',
        latitude: 33.5751,
        longitude: 73.0269
      },
      {
        registration_number: 'JKL-202',
        model: 'Toyota Yaris',
        manufacturer: 'Toyota',
        year: 2022,
        color: 'Red',
        status: 'maintenance',
        latitude: 33.5551,
        longitude: 73.0369
      }
    ]);
    console.log(`✅ ${vehicles.length} Vehicles created`);

    // Create Complaints
    const complaints = await Complaint.insertMany([
      {
        vehicle_id: vehicles[1]._id,
        instructor_id: instructors[0]._id,
        issue_type: 'mechanical',
        title: 'Brake not working properly',
        description: 'The brake pedal feels soft and the vehicle takes longer to stop than usual. This is a safety concern.',
        status: 'pending',
        priority: 'high'
      },
      {
        vehicle_id: vehicles[4]._id,
        instructor_id: instructors[1]._id,
        issue_type: 'maintenance',
        title: 'Oil change needed',
        description: 'The vehicle has exceeded 5000 km since last oil change. Dashboard warning light is on.',
        status: 'resolved',
        priority: 'medium',
        admin_response: 'Oil change completed. Vehicle serviced on 2025-01-15.',
        resolved_at: new Date('2025-01-15')
      },
      {
        vehicle_id: vehicles[0]._id,
        instructor_id: instructors[2]._id,
        issue_type: 'safety',
        title: 'Tire pressure low',
        description: 'Front left tire pressure is critically low. Needs immediate attention.',
        status: 'in_progress',
        priority: 'urgent',
        admin_response: 'Mechanic assigned. Will be fixed today.'
      }
    ]);
    console.log(`✅ ${complaints.length} Complaints created`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   - 1 Admin`);
    console.log(`   - ${instructors.length} Instructors`);
    console.log(`   - ${vehicles.length} Vehicles`);
    console.log(`   - ${complaints.length} Complaints`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Login Credentials:');
    console.log('');
    console.log('   Admin:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('   Instructor 1:');
    console.log('   Username: john_doe');
    console.log('   Password: instructor123');
    console.log('');
    console.log('   Instructor 2:');
    console.log('   Username: jane_smith');
    console.log('   Password: instructor123');
    console.log('');
    console.log('   Instructor 3:');
    console.log('   Username: mike_wilson');
    console.log('   Password: instructor123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();