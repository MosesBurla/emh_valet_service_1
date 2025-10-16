const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { getIO } = require('./utils/socket');

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
  res.status(200).json({
    status: 'OK',
    message: 'Valet Parking Backend is running',
    timestamp: new Date().toISOString(),
    socket: req.io ? 'Socket.io initialized' : 'Socket.io not initialized'
  });
});

// Socket.io endpoint for testing
app.get('/socket-test', (req, res) => {
  const io = req.io;
  if (io) {
    res.status(200).json({
      status: 'OK',
      message: 'Socket.io is available',
      connectedSockets: Object.keys(io.sockets.sockets).length
    });
  } else {
    res.status(500).json({
      status: 'ERROR',
      message: 'Socket.io not initialized'
    });
  }
});

app.use(errorHandler);

module.exports = app;
