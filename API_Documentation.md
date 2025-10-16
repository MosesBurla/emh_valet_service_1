# Valet Parking App API Documentation

## Overview

This document provides comprehensive API documentation for the Valet Parking Management System. The API uses JWT-based authentication and follows RESTful conventions.

**Base URL:** `http://localhost:5000/api`

**Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Models](#models)
3. [Admin Operations](#admin-operations)
4. [Driver Operations](#driver-operations)
5. [Valet Supervisor Operations](#valet-supervisor-operations)
6. [Parking Location Supervisor Operations](#parking-location-supervisor-operations)
7. [Error Responses](#error-responses)

---

## Authentication

All endpoints (except registration and login) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Register User

**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+9999999993",
  "email": "john@example.com",
  "role": "driver",
  "licenseDetails": {
    "licenseNumber": "DL123456789",
    "expiryDate": "2025-12-31"
  },
  "defaultLocation": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your phone number with OTP.",
  "userId": "user_id_here",
  "requiresVerification": true
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "User already exists with this phone number"
}
```

### Send OTP

**POST** `/auth/send-otp`

**Request Body:**
```json
{
  "phone": "+9999999993"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionInfo": "otp_sent"
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "User not found. Please register first."
}
```

### Verify OTP

**POST** `/auth/verify-otp`

**Request Body:**
```json
{
  "phone": "+9999999993",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "phone": "+9999999993",
    "role": "driver",
    "photoUrl": "photo_url",
    "rating": 4.5,
    "status": "approved"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "message": "Invalid OTP"
}
```

### Login (Legacy)

**POST** `/auth/login`

**Request Body:**
```json
{
  "phone": "+9999999993",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent to your phone number",
  "requiresVerification": true
}
```

---

## Models

### User Model

```javascript
{
  name: String (required),
  phone: String (required, unique),
  email: String (unique, sparse),
  photoUrl: String,
  password: String (optional - uses OTP for login),
  role: String (enum: ['admin', 'driver', 'valet_supervisor', 'parking_location_supervisor'], required),
  status: String (enum: ['pending', 'approved'], default: 'pending'),
  licenseDetails: Object,
  defaultLocation: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Request Model

```javascript
{
  vehicleId: ObjectId (ref: 'Vehicle', required),
  driverId: ObjectId (ref: 'User'),
  parkDriverId: ObjectId (ref: 'User'),
  pickupDriverId: ObjectId (ref: 'User'),
  createdBy: ObjectId (ref: 'User', required),
  type: String (enum: ['park', 'pickup'], required),
  status: String (enum: ['pending', 'accepted', 'completed', 'verified', 'handed_over', 'self_parked', 'self_pickup'], default: 'pending'),
  locationFrom: { lat: Number, lng: Number },
  locationTo: { lat: Number, lng: Number },
  completionTime: Date,
  handoverTime: Date,
  verificationTime: Date,
  isSelfParked: Boolean (default: false),
  isSelfPickup: Boolean (default: false),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model

```javascript
{
  ownerName: String (required),
  ownerPhone: String (required),
  make: String (required),
  model: String (required),
  number: String (required, unique),
  color: String,
  photoUrl: String,
  status: String (enum: ['available', 'parked', 'in-progress'], default: 'available'),
  isVerified: Boolean (default: false),
  verifiedBy: ObjectId (ref: 'User'),
  verifiedAt: Date,
  createdBy: ObjectId (ref: 'User', required),
  createdAt: Date,
  updatedAt: Date
}
```

### ParkingLocation Model

```javascript
{
  name: String (required),
  address: String (required),
  geolocation: { lat: Number, lng: Number },
  capacity: Number (required),
  createdAt: Date,
  updatedAt: Date
}
```

### History Model

```javascript
{
  requestId: ObjectId (ref: 'Request', required),
  vehicleId: ObjectId (ref: 'Vehicle', required),
  parkDriverId: ObjectId (ref: 'User'),
  pickupDriverId: ObjectId (ref: 'User'),
  action: String (required), // 'park_request', 'pickup_request', 'accepted', 'completed', 'verified', 'handed_over', 'self_parked', 'self_pickup'
  details: {
    requestType: String,
    carNumber: String,
    ownerName: String,
    ownerPhone: String,
    parkDriverName: String,
    pickupDriverName: String,
    location: String,
    notes: String
  },
  timestamp: Date (default: Date.now),
  performedBy: ObjectId (ref: 'User', required),
  createdAt: Date,
  updatedAt: Date
}
```

### Feedback Model

```javascript
{
  requestId: ObjectId (ref: 'Request', required),
  driverId: ObjectId (ref: 'User', required),
  ownerId: ObjectId (ref: 'User'),
  rating: Number (min: 1, max: 5, required),
  comments: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Admin Operations

### Get Pending Registrations

**GET** `/admin/pending-registrations`

**Query Parameters:**
- `role` (optional): Filter by role
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)

**Response (200):**
```json
[
  {
    "_id": "user_id",
    "name": "John Doe",
    "phone": "+9999999993",
    "email": "john@example.com",
    "role": "driver",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Approve User

**POST** `/admin/approve-user/:userId`

**Request Body:**
```json
{
  "role": "driver"
}
```

**Response (200):**
```json
{
  "msg": "User approved successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "role": "driver",
    "status": "approved"
  }
}
```

### Get All Users

**GET** `/admin/get-all-users`

**Query Parameters:**
- `role` (optional): Filter by role
- `status` (optional): Filter by status (default: 'approved')

**Response (200):**
```json
[
  {
    "_id": "user_id",
    "name": "John Doe",
    "phone": "+9999999993",
    "email": "john@example.com",
    "role": "driver",
    "status": "approved",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Statistics

**GET** `/admin/statistics`

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "overview": {
    "totalUsers": 150,
    "totalRequests": 500,
    "totalVehicles": 300,
    "totalParked": 45,
    "avgRating": 4.2,
    "avgCompletionTime": 25.5
  },
  "usersByRole": [
    { "_id": "driver", "count": 80 },
    { "_id": "valet_supervisor", "count": 20 }
  ],
  "requestsByStatus": [
    { "_id": "completed", "count": 450 },
    { "_id": "pending", "count": 50 }
  ],
  "vehiclesByStatus": [
    { "_id": "available", "count": 200 },
    { "_id": "parked", "count": 45 }
  ],
  "dailyStats": [
    { "_id": "2024-01-15", "count": 20, "park": 12, "pickup": 8 }
  ],
  "feedbackStats": {
    "avgRating": 4.2,
    "totalFeedback": 100
  },
  "period": "2024-01-01 to 2024-12-31"
}
```

### Get System History

**GET** `/admin/history`

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)
- `dateTo` (optional): End date (YYYY-MM-DD)
- `date` (optional): Single date (YYYY-MM-DD)
- `type` (optional): Filter by request type
- `action` (optional): Filter by action
- `userId` (optional): Filter by user ID
- `vehicleId` (optional): Filter by vehicle ID
- `searchBy` (optional): 'vehicle' or 'driver'
- `searchValue` (optional): Search value
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "history": [
    {
      "_id": "history_id",
      "requestId": "request_id",
      "vehicleId": {
        "_id": "vehicle_id",
        "number": "ABC123",
        "make": "Toyota",
        "model": "Camry"
      },
      "action": "park_request",
      "details": {
        "requestType": "park",
        "carNumber": "ABC123",
        "ownerName": "John Doe",
        "parkDriverName": "Driver Name"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "performedBy": {
        "_id": "user_id",
        "name": "Driver Name"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Export History (CSV)

**GET** `/admin/export-history`

**Query Parameters:**
- `format` (optional): 'csv' or 'json' (default: 'json')
- `dateFrom` (optional): Start date (YYYY-MM-DD)

**Response:** File download (CSV or JSON format)

### Get System Health

**GET** `/admin/system-health`

**Response (200):**
```json
{
  "users": {
    "total": 150,
    "active": 140,
    "pending": 10
  },
  "vehicles": {
    "total": 300,
    "parked": 45
  },
  "requests": {
    "total": 500,
    "active": 25
  },
  "systemStatus": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Edit User

**PUT** `/admin/edit-user/:userId`

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "driver",
  "licenseDetails": {
    "licenseNumber": "DL987654321",
    "expiryDate": "2026-12-31"
  }
}
```

**Response (200):**
```json
{
  "_id": "user_id",
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "driver",
  "licenseDetails": {
    "licenseNumber": "DL987654321",
    "expiryDate": "2026-12-31"
  }
}
```

### Add Parking Location

**POST** `/admin/add-parking-location`

**Request Body:**
```json
{
  "name": "Downtown Parking",
  "address": "123 Main St, Downtown",
  "geolocation": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "capacity": 100
}
```

**Response (201):**
```json
{
  "_id": "location_id",
  "name": "Downtown Parking",
  "address": "123 Main St, Downtown",
  "geolocation": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "capacity": 100,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Edit Parking Location

**PUT** `/admin/edit-parking-location/:locationId`

**Request Body:**
```json
{
  "name": "Updated Parking Location",
  "address": "456 Updated St",
  "capacity": 150
}
```

**Response (200):**
```json
{
  "_id": "location_id",
  "name": "Updated Parking Location",
  "address": "456 Updated St",
  "capacity": 150
}
```

### Delete Parking Location

**DELETE** `/admin/delete-parking-location/:locationId`

**Response (200):**
```json
{
  "msg": "Location deleted"
}
```

### Get Parking Locations

**GET** `/admin/parking-locations`

**Response (200):**
```json
[
  {
    "_id": "location_id",
    "name": "Downtown Parking",
    "address": "123 Main St, Downtown",
    "geolocation": {
      "lat": 40.7128,
      "lng": -74.0060
    },
    "capacity": 100
  }
]
```

---

## Driver Operations

### Get Incoming Requests

**GET** `/driver/incoming-requests`

**Response (200):**
```json
[
  {
    "_id": "req_123",
    "type": "park",
    "status": "pending",
    "vehicleId": {
      "_id": "veh_123",
      "number": "ABC123",
      "make": "Toyota",
      "model": "Camry",
      "ownerName": "John Doe"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Accept Request

**POST** `/driver/accept-request/:requestId`

**Response (200):**
```json
{
  "msg": "Request accepted successfully",
  "request": {
    "_id": "req_123",
    "status": "accepted",
    "driverId": "driver_id"
  }
}
```

### Mark Vehicle as Parked

**POST** `/driver/mark-parked/:requestId`

**Response (200):**
```json
{
  "msg": "Vehicle marked as parked",
  "request": {
    "_id": "req_123",
    "type": "park",
    "status": "completed",
    "vehicleId": "veh_123",
    "parkDriverId": "driver_123"
  },
  "vehicle": {
    "_id": "veh_123",
    "number": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "ownerName": "John Doe",
    "status": "parked"
  }
}
```

### Mark Vehicle as Handed Over

**POST** `/driver/mark-handed-over/:requestId`

**Response (200):**
```json
{
  "msg": "Vehicle handed over successfully",
  "request": {
    "_id": "req_123",
    "status": "handed_over"
  }
}
```

### Get Driver History

**GET** `/driver/history`

**Query Parameters:**
- `dateFrom` (optional): Start date (YYYY-MM-DD)

**Response (200):**
```json
[
  {
    "_id": "req_123",
    "type": "park",
    "status": "completed",
    "vehicleId": {
      "_id": "veh_123",
      "number": "ABC123",
      "make": "Toyota",
      "model": "Camry"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Driver Statistics

**GET** `/driver/stats`

**Response (200):**
```json
{
  "totalRequests": 50,
  "completedRequests": 48,
  "pendingRequests": 2,
  "rating": 4.5,
  "todayRequests": 5
}
```

---

## Valet Supervisor Operations

### Create Park Request

**POST** `/supervisor/create-park-request`

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "customerName": "Jane Smith",
  "licensePlate": "XYZ789",
  "make": "Honda",
  "model": "Civic",
  "color": "Red"
}
```

**Response (201):**
```json
{
  "msg": "Park request created successfully",
  "parkRequest": {
    "_id": "park_123",
    "type": "park",
    "status": "pending",
    "vehicleId": "veh_123",
    "createdAt": "2024-01-15T14:30:00Z"
  },
  "vehicle": {
    "_id": "veh_123",
    "number": "XYZ789",
    "make": "Honda",
    "model": "Civic",
    "ownerName": "Jane Smith",
    "status": "in-progress"
  }
}
```

### Create Pickup Request

**POST** `/supervisor/create-pickup-request`

**Request Body:**
```json
{
  "vehicleId": "VEHICLE_ID_HERE",
  "locationFrom": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "notes": "Customer requested pickup for their parked vehicle"
}
```

**Response (201):**
```json
{
  "msg": "Pickup request created successfully",
  "pickupRequest": {
    "_id": "pickup_123",
    "type": "pickup",
    "status": "pending",
    "vehicleId": "veh_123",
    "locationFrom": {
      "lat": 40.7128,
      "lng": -74.0060
    },
    "notes": "Customer requested pickup for their parked vehicle",
    "createdAt": "2024-01-15T14:30:00Z"
  },
  "vehicle": {
    "_id": "veh_123",
    "number": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "ownerName": "John Doe",
    "status": "in-progress"
  }
}
```

### Get Parked Vehicles

**GET** `/supervisor/parked-vehicles`

**Response (200):**
```json
[
  {
    "_id": "veh_123",
    "number": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "ownerName": "John Doe",
    "status": "parked",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

### Get Dashboard Statistics

**GET** `/supervisor/dashboard-stats`

**Response (200):**
```json
{
  "todayRequests": 15,
  "pendingRequests": 3,
  "completedRequests": 12,
  "totalVehicles": 45,
  "availableDrivers": 8
}
```

---

## Parking Location Supervisor Operations

### Verify Park Request

**POST** `/supervisor/verify-park-request`

**Request Body:**
```json
{
  "carNumber": "ABC123"
}
```

**Response (200):**
```json
{
  "msg": "Park request verified",
  "vehicle": {
    "_id": "veh_123",
    "number": "ABC123",
    "make": "Toyota",
    "model": "Camry",
    "ownerName": "John Doe",
    "isVerified": true
  }
}
```

### Mark Self Pickup

**POST** `/supervisor/mark-self-pickup/:vehicleId`

**Response (200):**
```json
{
  "msg": "Vehicle marked for self pickup",
  "vehicle": {
    "_id": "veh_123",
    "status": "available"
  }
}
```

---

## Error Responses

### Common Error Response Format

```json
{
  "success": false,
  "message": "Error description"
}
```

### Error Status Codes

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Invalid or missing authentication
- **403 Forbidden**: Access denied for this resource
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Specific Error Messages

- `"User already exists with this phone number"` - Registration with existing phone
- `"User not found"` - User doesn't exist
- `"Account pending approval"` - User not yet approved
- `"Invalid OTP"` - Wrong OTP provided
- `"OTP expired or not found"` - OTP expired or doesn't exist
- `"Phone number and OTP are required"` - Missing required fields

---

## Integration Notes

1. **OTP Default**: For development, use OTP `123456` for all phone numbers
2. **Phone Format**: Use international format with country code (e.g., `+1234567890`)
3. **Date Format**: Use ISO 8601 format (`YYYY-MM-DD`) for date parameters
4. **Pagination**: Use `page` and `limit` query parameters for paginated responses
5. **File Exports**: Use `format=csv` parameter for CSV exports, otherwise JSON format
6. **Search**: Use `searchBy` and `searchValue` for filtering history records

---

## Development Setup

1. **Environment Variables**:
   ```env
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/valet_app
   ```

2. **Default OTP**: `123456` (for development only)

3. **SMS Integration**: Uncomment SMS sending code in controllers when SMS service is configured

---

This documentation covers all available API endpoints and their usage. For any additional features or modifications, refer to the source code or contact the development team.
