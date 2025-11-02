const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Determine which MongoDB URI to use based on environment
const getMongoURI = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // Use production database
    return process.env.MONGO_URI_PRODUCTION || process.env.MONGO_URI_ATLAS;
  } else {
    // Use development database
    return process.env.MONGO_URI || process.env.MONGO_URI_ATLAS;
  }
};

const connectDB = async () => {
  try {
    const mongoURI = getMongoURI();
    await mongoose.connect(mongoURI);
    const env = process.env.NODE_ENV || 'development';
    console.log(`MongoDB connected (${env} environment)`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
