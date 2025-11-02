const admin = require('firebase-admin');
const FCMToken = require('../models/FCMToken');

// Initialize Firebase Admin SDK
// Use environment variables for service account to avoid committing credentials to git
let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY) {
  // Method 1: Individual service account environment variables
  serviceAccount = {
    "type": process.env.FIREBASE_TYPE || "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    "token_uri": process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  console.log('FCM initialized with environment variables');
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Method 2: JSON string in environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('FCM initialized with JSON environment variable');
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format:', error);
    throw new Error('Invalid Firebase service account JSON');
  }
} else {
  console.warn('Firebase credentials not found. Set FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON environment variables.');
  console.warn('Push notifications will not work without proper Firebase credentials.');
  serviceAccount = null;
}

/**
 * Generate and store FCM access token
 */
const generateAndStoreAccessToken = async () => {
  try {
    if (!serviceAccount) {
      console.warn('Firebase not initialized - skipping FCM token generation');
      return null;
    }

    const accessToken = await admin.app().options.credential.getAccessToken();

    const fcmToken = new FCMToken({
      token: accessToken.access_token,
      expiresAt: new Date(Date.now() + accessToken.expires_in * 1000) // expires_in is in seconds
    });

    await fcmToken.save();
    console.log('FCM Access Token generated and stored');
    return accessToken.access_token;
  } catch (error) {
    console.error('Error generating FCM access token:', error);
    throw error;
  }
};

/**
 * Get current valid access token
 */
const getCurrentAccessToken = async () => {
  try {
    // Find the latest token that hasn't expired
    const token = await FCMToken.findOne({
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (token) {
      return token.token;
    } else {
      // No valid token, generate a new one
      return await generateAndStoreAccessToken();
    }
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    throw error;
  }
};

/**
 * Send FCM notification to a single device
 */
const sendFCMNotification = async (token, title, body) => {
  try {
    if (!serviceAccount) {
      console.warn('Firebase not initialized - FCM notifications unavailable');
      throw new Error('Firebase credentials not configured');
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    throw error;
  }
};

/**
 * Send FCM notification to multiple devices
 */
const sendBulkFCMNotifications = async (tokens, title, body) => {
  try {
    if (!serviceAccount) {
      console.warn('Firebase not initialized - FCM bulk notifications unavailable');
      throw new Error('Firebase credentials not configured');
    }

    const messages = tokens.map(token => ({
      token: token,
      notification: {
        title: title,
        body: body
      }
    }));

    const response = await admin.messaging().sendAll(messages);
    console.log('Bulk FCM notifications sent successfully');
    return response;
  } catch (error) {
    console.error('Error sending bulk FCM notifications:', error);
    throw error;
  }
};

module.exports = {
  generateAndStoreAccessToken,
  getCurrentAccessToken,
  sendFCMNotification,
  sendBulkFCMNotifications
};

// Only initialize Firebase if we have valid credentials
if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}
