# Valet Parking App Backend

A comprehensive valet parking management system designed for supervisors, admins, and drivers with role-based access control, real-time notifications, and complete workflow management.

## Features

### 👥 **Three-Role System**
- **Admin**: Complete system oversight, user management, analytics
- **Driver**: Request handling, vehicle parking/pickup operations
- **Supervisor**: Park request creation and vehicle verification (Valet & Parking Location roles)

### 📊 **Advanced Analytics**
- Comprehensive statistics dashboard
- Daily/weekly/monthly trends
- Role-based user distribution
- Request completion rates
- Export functionality (CSV/JSON)

### 📱 **Real-Time Notifications**
- WebSocket-based live updates
- Role-specific broadcasts
- Request status notifications
- Push notification support

### 🔒 **Security & Authentication**
- JWT-based authentication
- Role-based access control (RBAC)
- OTP verification support
- Secure password hashing

## Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (Atlas or local)
- npm or yarn

### Installation
1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd valet-parking-app-backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   # Create .env file
   MONGO_URI=mongodb://127.0.0.1:27017/valetparking
   MONGO_URI_ATLAS=mongodb+srv://username:password@cluster.mongodb.net/valetparking
   JWT_SECRET=your_super_secret_jwt_key
   PORT=5000
   ```

3. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Documentation

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration with role assignment |
| POST | `/login` | User authentication |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with OTP |

### Admin Routes (`/api/admin`) - Requires Admin Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pending-registrations` | Get pending user registrations |
| POST | `/approve-user/:id` | Approve user registration |
| POST | `/reject-user/:id` | Reject user registration |
| PUT | `/edit-user/:id` | Edit user details |
| GET | `/get-all-users` | Get all approved users |
| POST | `/add-parking-location` | Add new parking location |
| PUT | `/edit-parking-location/:id` | Edit parking location |
| DELETE | `/delete-parking-location/:id` | Delete parking location |
| GET | `/statistics` | Get comprehensive statistics |
| GET | `/history` | Get system history with filters |
| GET | `/export-history` | Export history (CSV/JSON) |
| GET | `/system-health` | Get system health metrics |

### Driver Routes (`/api/driver`) - Requires Driver Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/incoming-requests` | Get available requests |
| POST | `/accept-request/:id` | Accept a parking/pickup request |
| POST | `/mark-parked/:id` | Mark vehicle as parked |
| POST | `/mark-handed-over/:id` | Mark vehicle as handed over |
| GET | `/history` | Get driver's request history |
| GET | `/today-parked-vehicles` | Get today's parked vehicles |
| GET | `/stats` | Get driver statistics |
| GET | `/parking-locations` | Get available parking locations |

### Valet Supervisor Routes (`/api/supervisor`) - Requires Valet Supervisor Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-park-request` | Create new park request |
| GET | `/parked-vehicles` | Get parked vehicles |
| GET | `/today-parked-vehicles` | Get today's parked vehicles |
| GET | `/history` | Get parking history |
| GET | `/dashboard-stats` | Get dashboard statistics |

### Parking Location Supervisor Routes (`/api/supervisor`) - Requires Parking Location Supervisor Role
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verify-park-request` | Verify parked vehicle |
| POST | `/mark-self-pickup/:vehicleId` | Mark self-pickup |
| GET | `/parked-vehicles` | Get parked vehicles |
| GET | `/today-parked-vehicles` | Get today's parked vehicles |
| GET | `/history` | Get parking history |
| GET | `/dashboard-stats` | Get dashboard statistics |



## WebSocket Events

### Client → Server
- `authenticate`: Authenticate user connection
  ```json
  {
    "userId": "user_id",
    "role": "driver|admin|valet_supervisor|parking_location_supervisor"
  }
  ```

### Server → Client
- `new-park-request`: New park request broadcast
- `request-accepted`: Request accepted notification
- `park-completed`: Park completion notification
- `pickup-completed`: Pickup completion notification
- `vehicle-verified`: Vehicle verification notification
- `self-parked-created`: Self-parked vehicle notification
- `self-pickup-marked`: Self-pickup notification

## Data Models

### User Roles
- `admin`: System administrators
- `driver`: Valet drivers
- `valet_supervisor`: Valet location supervisors
- `parking_location_supervisor`: Parking location supervisors

### Request Status Flow
```
pending → accepted → completed → verified → handed_over
                    ↓
               self_parked → self_pickup
```

### Vehicle Status
- `available`: Ready for use
- `in-progress`: Request active
- `parked`: Vehicle parked

## Real-Time Features

### Live Updates
- Request status changes
- New request notifications
- Vehicle verification updates
- Driver assignment notifications

### Role-Based Broadcasting
- Drivers receive park/pickup requests
- Supervisors get completion notifications
- Admins receive system-wide updates

## Integration Points

### External Services (Ready for Integration)
- **SMS/OTP**: Twilio, AWS SNS
- **Push Notifications**: Firebase FCM, OneSignal
- **Email**: SendGrid, AWS SES
- **Maps**: Google Maps API
- **File Storage**: AWS S3, Cloudinary

## Development

### Project Structure
```
├── config/           # Database configuration
├── controllers/      # Route controllers
├── middleware/       # Authentication & RBAC
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utilities (socket, notifications)
└── server.js        # Server entry point
```

### Key Technologies
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Validation**: Express-validator

## Deployment

### Environment Variables
```bash
MONGO_URI=mongodb://localhost:27017/valetparking
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=production
```

### Production Considerations
- Enable HTTPS
- Configure CORS properly
- Set up database indexes
- Implement rate limiting
- Add request logging
- Configure monitoring

## API Examples

### Create Park Request (Valet Supervisor)
```bash
POST /api/supervisor/create-park-request
{
  "phoneNumber": "+1234567890",
  "customerName": "John Doe",
  "licensePlate": "ABC123",
  "make": "Toyota",
  "model": "Camry",
  "color": "Blue"
}
```

### Accept Request (Driver)
```bash
POST /api/driver/accept-request/60d5ecb74d2a2b001f647a8b
```

### Get Statistics (Admin)
```bash
GET /api/admin/statistics?dateFrom=2024-01-01&dateTo=2024-01-31
```

## Support

For issues and contributions, please refer to the project repository.

## License

ISC License
