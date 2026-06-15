const socketIO = require('socket.io');

let io;

/**
 * Initialize Socket.IO
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });

    // Handle custom events (optional)
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`📍 Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave-room', (room) => {
      socket.leave(room);
      console.log(`📍 Client ${socket.id} left room: ${room}`);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

/**
 * Get Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
};

module.exports = {
  initSocket,
  getIO
};