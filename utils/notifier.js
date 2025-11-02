const { getIO, emitToUser } = require('./socket');

const sendOTP = (phone) => {
  console.log(`Sending OTP to ${phone}`);
  // Here you would integrate with actual SMS service like Twilio, AWS SNS, etc.
  // For now, just log the action
};

const notifyUser = (phone, message) => {
  console.log(`Notifying ${phone}: ${message}`);
  // Here you would integrate with actual notification service
  // For now, just log the action
};

const sendRealTimeNotification = (userId, event, data) => {
  try {
    emitToUser(userId, event, data);
    console.log(`Real-time notification sent to user ${userId}: ${event}`);
  } catch (error) {
    console.error('Error sending real-time notification:', error);
  }
};

const broadcastToRole = (role, event, data) => {
  try {
    const { emitToRole } = require('./socket');
    emitToRole(role, event, data);
    console.log(`Broadcast sent to role ${role}: ${event}`);
  } catch (error) {
    console.error('Error broadcasting to role:', error);
  }
};

const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const User = require('../models/User');
    const { sendFCMNotification } = require('./fcm');

    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log(`User ${userId} does not have FCM token or not found`);
      // Send real-time notification as fallback
      sendRealTimeNotification(userId, 'push_notification', {
        title,
        body,
        data,
        timestamp: new Date()
      });
      return;
    }

    // Send FCM notification
    await sendFCMNotification(user.fcmToken, title, body, data);

    // Also send real-time notification
    sendRealTimeNotification(userId, 'push_notification', {
      title,
      body,
      data,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const sendRequestNotification = async (request, type = 'new_request') => {
  try {
    const { getIO } = require('./socket');
    const User = require('../models/User');
    const { sendFCMNotification } = require('./fcm');

    const notificationData = {
      type,
      request: {
        id: request._id,
        type: request.type,
        status: request.status,
        createdAt: request.createdAt,
        locationFrom: request.locationFrom,
        notes: request.notes
      },
      vehicle: request.vehicle ? {
        number: request.vehicle.number,
        make: request.vehicle.make,
        model: request.vehicle.model,
        ownerName: request.vehicle.ownerName
      } : null,
      timestamp: new Date()
    };

    // Broadcast to all drivers/supervisors via socket
    if (type === 'new_request') {
      getIO().emit('new-request', notificationData);
    } else if (type === 'new_pickup_request') {
      getIO().emit('new-pickup-request', notificationData);
    }

    // Send push notifications to drivers and supervisors
    const drivers = await User.find({
      role: { $in: ['driver', 'valet_supervisor', 'parking_location_supervisor'] },
      status: 'approved',
      fcmToken: { $exists: true, $ne: null }
    });

    if (drivers.length > 0) {
      const title = type === 'new_request' ? 'New Park Request' : 'New Pickup Request';
      const body = type === 'new_request'
        ? `Park request for vehicle ${request.vehicle?.number || 'Unknown'}`
        : `Pickup request for vehicle ${request.vehicle?.number || 'Unknown'}`;

      // Send FCM notification to each driver/supervisor
      for (const driver of drivers) {
        try {
          await sendFCMNotification(driver.fcmToken, title, body, notificationData);
          console.log(`FCM notification sent to ${driver.name} (${driver.role})`);
        } catch (notificationError) {
          console.error(`Error sending FCM notification to ${driver.name}:`, notificationError);
        }
      }
    }

    console.log(`Request notification sent: ${type} for request ${request._id}`);
  } catch (error) {
    console.error('Error sending request notification:', error);
  }
};

module.exports = {
  sendOTP,
  notifyUser,
  sendRealTimeNotification,
  broadcastToRole,
  sendPushNotification,
  sendRequestNotification
};
