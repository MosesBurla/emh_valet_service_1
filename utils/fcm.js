const admin = require('firebase-admin');
const serviceAccount = require('../your-wish-c9e3a-firebase-adminsdk-1zpw2-79b04802cc.json');
const FCMToken = require('../models/FCMToken');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Generate and store FCM access token
 */
const generateAndStoreAccessToken = async () => {
  try {
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
const sendFCMNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: data
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
const sendBulkFCMNotifications = async (tokens, title, body, data = {}) => {
  try {
    const messages = tokens.map(token => ({
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: data
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
