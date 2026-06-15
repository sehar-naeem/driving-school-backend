require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDatabase = require('./config/database');
const { initSocket } = require('./utils/socketHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const mapRoutes = require('./routes/mapRoutes');
const userRoutes = require('./routes/userRoutes');  // ✅ FIXED: Capital 'R'

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io); // Make io available in controllers
global.io = io; 
// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);  // ✅ FIXED: Variable name matches


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Driving School Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      vehicles: '/api/vehicles',
      complaints: '/api/complaints',
      dashboard: '/api/dashboard',
      map: '/api/map',
      users: '/api/users'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start listening
    server.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚗 DRIVING SCHOOL MANAGEMENT SYSTEM');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`✅ API available at http://localhost:${PORT}/api`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📍 Endpoints:');
      console.log(`   Auth:       http://localhost:${PORT}/api/auth`);
      console.log(`   Vehicles:   http://localhost:${PORT}/api/vehicles`);
      console.log(`   Complaints: http://localhost:${PORT}/api/complaints`);
      console.log(`   Dashboard:  http://localhost:${PORT}/api/dashboard`);
      console.log(`   Map:        http://localhost:${PORT}/api/map`);
      console.log(`   Users:      http://localhost:${PORT}/api/users`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 Default Credentials:');
      console.log('   Admin - Username: admin, Password: admin123');
      console.log('   Instructor - Username: john_doe, Password: instructor123');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
