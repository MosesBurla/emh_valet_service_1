const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();


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
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;
