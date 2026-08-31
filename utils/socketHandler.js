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
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected to Socket.IO:', socket.id);

    // Handle client disconnect
    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });

    // Relay client-emitted events to all connected clients
    socket.on('instructor:on_way', (data) => {
      console.log('⚡ Relaying instructor:on_way:', data);
      io.emit('instructor:on_way', data);
    });

    socket.on('allocation:declined', (data) => {
      console.log('⚡ Relaying allocation:declined:', data);
      io.emit('allocation:declined', data);
    });

    socket.on('extension:request', (data) => {
      console.log('⚡ Relaying extension:request:', data);
      io.emit('extension:requested', data);
    });

    socket.on('extension:respond', (data) => {
      console.log('⚡ Relaying extension:respond:', data);
      io.emit('extension:responded', data);
    });

    socket.on('location:update', (data) => {
      io.emit('location:updated', data);
    });
  });

  console.log('✅ Socket.IO initialized with universal CORS');
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
