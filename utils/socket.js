let io;
const User = require('../models/User');

const initSocket = (server) => {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store connected users with their roles and IDs
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication on connection
    socket.on('authenticate', async (data) => {
      try {
        const { userId, role } = data;
        connectedUsers.set(socket.id, { userId, role });

        // Join role-specific rooms
        socket.join(`role_${role}`);
        socket.join(`user_${userId}`);

        console.log(`User ${userId} (${role}) authenticated and joined rooms`);

        // Send confirmation
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { msg: 'Authentication failed' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log('User disconnected:', socket.id);
    });
  });

  console.log('✅ Socket.io initialized with authentication');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized! Call initSocket first.');
  }
  return io;
};

// Helper function to emit to specific roles
const emitToRole = (role, event, data) => {
  if (io) {
    io.to(`role_${role}`).emit(event, data);
  }
};

// Helper function to emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

// Helper function to emit to multiple roles
const emitToRoles = (roles, event, data) => {
  roles.forEach(role => emitToRole(role, event, data));
};

module.exports = {
  initSocket,
  getIO,
  emitToRole,
  emitToUser,
  emitToRoles
};
