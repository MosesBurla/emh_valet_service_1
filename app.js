const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { getIO } = require('./utils/socket');
const ApiResponse = require('./utils/responseHelper');

dotenv.config();
connectDB();

const app = express();

// Socket.io middleware
app.use((req, res, next) => {
  req.io = getIO();
  next();
});

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/driver', require('./routes/driverRoutes'));
app.use('/api/supervisor', require('./routes/supervisorRoutes'));
app.use('/api/common', require('./routes/commonRoutes'));

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    message: 'Valet Parking Backend is running',
    timestamp: new Date().toISOString(),
    socket: req.io ? 'Socket.io initialized' : 'Socket.io not initialized'
  };
  return ApiResponse.success(healthData, 'Health check successful').send(res);
});

// Socket.io endpoint for testing
app.get('/socket-test', (req, res) => {
  const io = req.io;
  if (io) {
    const socketData = {
      status: 'OK',
      message: 'Socket.io is available',
      connectedSockets: Object.keys(io.sockets.sockets).length
    };
    return ApiResponse.success(socketData, 'Socket test successful').send(res);
  } else {
    return ApiResponse.error('ServerError', 'Socket.io not initialized').send(res);
  }
});

app.use(errorHandler);

module.exports = app;
