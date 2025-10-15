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
    // Here you would integrate with push notification services like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNS)
    // - OneSignal
    // - Pusher

    console.log(`Push notification to user ${userId}: ${title} - ${body}`);

    // For now, also send real-time notification as fallback
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

const sendRequestNotification = (request, type = 'new_request') => {
  try {
    const { getIO } = require('./socket');

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

    // Broadcast to all drivers for new requests
    if (type === 'new_request') {
      getIO().emit('new-request', notificationData);
    } else if (type === 'new_pickup_request') {
      getIO().emit('new-pickup-request', notificationData);
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
