const mongoose = require('mongoose');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Request = require('./models/Request');
const History = require('./models/History');
const Feedback = require('./models/Feedback');
const ParkingLocation = require('./models/ParkingLocation');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Request.deleteMany({});
    await History.deleteMany({});
    await Feedback.deleteMany({});
    await ParkingLocation.deleteMany({});

    console.log('🧹 Cleared existing data');

    // 1. Create Parking Locations
    const parkingLocations = [
      {
        name: 'Downtown Parking Plaza',
        address: '123 Main St, Downtown City',
        geolocation: { lat: 40.7128, lng: -74.0060 },
        capacity: 500
      },
      {
        name: 'Airport Valet Services',
        address: '456 Airport Blvd, Aviation District',
        geolocation: { lat: 40.7589, lng: -73.9851 },
        capacity: 300
      },
      {
        name: 'Shopping Mall Parking',
        address: '789 Mall Ave, Retail District',
        geolocation: { lat: 40.7505, lng: -73.9934 },
        capacity: 800
      }
    ];

    const createdLocations = await ParkingLocation.insertMany(parkingLocations);
    console.log(`✅ Created ${createdLocations.length} parking locations`);

    // 2. Create Users with different roles (5 users only)
    const users = [
      // Admin
      {
        name: 'System Administrator',
        phone: '+9999999999',
        email: 'admin@valetapp.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        status: 'approved'
      },

      // Valet Supervisor
      {
        name: 'Mike Valet',
        phone: '+9999999991',
        email: 'mike.valet@valetapp.com',
        password: await bcrypt.hash('valet123', 10),
        role: 'valet_supervisor',
        status: 'approved'
      },

      // Parking Location Supervisor
      {
        name: 'Tom Parker',
        phone: '+9999999992',
        email: 'tom.parker@valetapp.com',
        password: await bcrypt.hash('parker123', 10),
        role: 'parking_location_supervisor',
        status: 'approved'
      },

      // Driver 1
      {
        name: 'John Driver',
        phone: '+9999999993',
        email: 'john.driver@valetapp.com',
        password: await bcrypt.hash('driver123', 10),
        role: 'driver',
        status: 'approved',
        licenseDetails: {
          number: 'DL123456789',
          expiry: new Date('2025-12-31'),
          photoUrl: 'https://example.com/license1.jpg'
        }
      },

      // Driver 2
      {
        name: 'Sarah Driver',
        phone: '+9999999994',
        email: 'sarah.driver@valetapp.com',
        password: await bcrypt.hash('driver123', 10),
        role: 'driver',
        status: 'approved',
        licenseDetails: {
          number: 'DL987654321',
          expiry: new Date('2025-11-30'),
          photoUrl: 'https://example.com/license2.jpg'
        }
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} users`);

    // 3. Create Vehicles (after users are created)
    const valetSupervisor = createdUsers.find(u => u.phone === '+9999999991');
    const parkingSupervisor = createdUsers.find(u => u.phone === '+9999999992');

    const vehicles = [
      {
        ownerName: 'Customer One',
        ownerPhone: '+1888888888',
        make: 'Toyota',
        model: 'Camry',
        number: 'ABC123',
        color: 'Blue',
        status: 'available',
        createdBy: valetSupervisor._id
      },
      {
        ownerName: 'Customer Two',
        ownerPhone: '+1999999999',
        make: 'Honda',
        model: 'Civic',
        number: 'XYZ789',
        color: 'Red',
        status: 'available',
        createdBy: valetSupervisor._id
      },
      {
        ownerName: 'Customer Three',
        ownerPhone: '+1777777777',
        make: 'Ford',
        model: 'Mustang',
        number: 'MUS456',
        color: 'Black',
        status: 'available',
        createdBy: valetSupervisor._id
      },
      {
        ownerName: 'Customer Four',
        ownerPhone: '+1666666666',
        make: 'BMW',
        model: 'X3',
        number: 'BMW001',
        color: 'White',
        status: 'available',
        createdBy: valetSupervisor._id
      }
    ];

    const createdVehicles = await Vehicle.insertMany(vehicles);
    console.log(`✅ Created ${createdVehicles.length} vehicles`);

    // 4. Create Park Requests
    const parkRequests = [
      {
        vehicleId: createdVehicles[0]._id,
        createdBy: valetSupervisor._id,
        type: 'park',
        status: 'completed',
        locationFrom: { lat: 40.7128, lng: -74.0060 },
        completionTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        parkDriverId: createdUsers.find(u => u.phone === '+9999999993')._id
      },
      {
        vehicleId: createdVehicles[1]._id,
        createdBy: valetSupervisor._id,
        type: 'park',
        status: 'verified',
        locationFrom: { lat: 40.7589, lng: -73.9851 },
        completionTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        parkDriverId: createdUsers.find(u => u.phone === '+9999999994')._id,
        verificationTime: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        vehicleId: createdVehicles[2]._id,
        createdBy: valetSupervisor._id,
        type: 'park',
        status: 'pending',
        locationFrom: { lat: 40.7505, lng: -73.9934 }
      },
      {
        vehicleId: createdVehicles[3]._id,
        createdBy: valetSupervisor._id,
        type: 'park',
        status: 'accepted',
        locationFrom: { lat: 40.7128, lng: -74.0060 },
        driverId: createdUsers.find(u => u.phone === '+9999999993')._id,
        acceptedAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      }
    ];

    const createdParkRequests = await Request.insertMany(parkRequests);
    console.log(`✅ Created ${createdParkRequests.length} park requests`);

    // 5. Create Pickup Requests
    const pickupRequests = [
      {
        vehicleId: createdVehicles[0]._id,
        createdBy: valetSupervisor._id,
        type: 'pickup',
        status: 'pending',
        locationTo: { lat: 40.7128, lng: -74.0060 }
      },
      {
        vehicleId: createdVehicles[1]._id,
        createdBy: valetSupervisor._id,
        type: 'pickup',
        status: 'accepted',
        locationTo: { lat: 40.7589, lng: -73.9851 },
        driverId: createdUsers.find(u => u.phone === '+9999999994')._id,
        acceptedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    ];

    const createdPickupRequests = await Request.insertMany(pickupRequests);
    console.log(`✅ Created ${createdPickupRequests.length} pickup requests`);

    // 6. Create Self-Parked Request (create a dummy owner first)
    const dummyOwner = new User({
      name: 'Self Parked Customer',
      phone: '+1555000000',
      email: 'selfparked@customer.com',
      password: await bcrypt.hash('dummy123', 10),
      role: 'driver',
      status: 'approved'
    });

    const savedDummyOwner = await dummyOwner.save();

    const selfParkedVehicle = new Vehicle({
      ownerName: 'Self Parked Customer',
      ownerPhone: '+1555000000',
      make: 'Tesla',
      model: 'Model 3',
      number: 'TESLA1',
      color: 'Silver',
      status: 'parked',
      isVerified: true,
      verifiedBy: parkingSupervisor._id,
      verifiedAt: new Date(Date.now() - 45 * 60 * 1000),
      createdBy: parkingSupervisor._id
    });

    const savedSelfParkedVehicle = await selfParkedVehicle.save();

    const selfParkedRequest = new Request({
      vehicleId: savedSelfParkedVehicle._id,
      createdBy: parkingSupervisor._id,
      type: 'park',
      status: 'self_parked',
      isSelfParked: true,
      locationFrom: { lat: 40.7505, lng: -73.9934 },
      notes: 'Customer self-parked'
    });

    await selfParkedRequest.save();
    console.log('✅ Created self-parked vehicle and request');

    // 7. Update Vehicle Statuses
    await Vehicle.findByIdAndUpdate(createdVehicles[0]._id, { status: 'parked' });
    await Vehicle.findByIdAndUpdate(createdVehicles[1]._id, { status: 'parked' });
    await Vehicle.findByIdAndUpdate(createdVehicles[2]._id, { status: 'in-progress' });
    await Vehicle.findByIdAndUpdate(createdVehicles[3]._id, { status: 'in-progress' });

    // 8. Create History Records
    const historyRecords = [
      {
        requestId: createdParkRequests[0]._id,
        vehicleId: createdVehicles[0]._id,
        parkDriverId: createdUsers.find(u => u.phone === '+9999999993')._id,
        action: 'park_request',
        details: {
          requestType: 'park',
          carNumber: 'ABC123',
          ownerName: 'Customer One',
          parkDriverName: 'John Driver',
          location: 'Downtown Parking Plaza'
        },
        performedBy: createdUsers.find(u => u.phone === '+9999999991')._id,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        requestId: createdParkRequests[0]._id,
        vehicleId: createdVehicles[0]._id,
        parkDriverId: createdUsers.find(u => u.phone === '+9999999993')._id,
        action: 'accepted',
        details: {
          requestType: 'park',
          carNumber: 'ABC123',
          ownerName: 'Customer One',
          parkDriverName: 'John Driver'
        },
        performedBy: createdUsers.find(u => u.phone === '+9999999993')._id,
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000)
      },
      {
        requestId: createdParkRequests[0]._id,
        vehicleId: createdVehicles[0]._id,
        parkDriverId: createdUsers.find(u => u.phone === '+9999999993')._id,
        action: 'completed',
        details: {
          requestType: 'park',
          carNumber: 'ABC123',
          ownerName: 'Customer One',
          parkDriverName: 'John Driver'
        },
        performedBy: createdUsers.find(u => u.phone === '+9999999993')._id,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        requestId: createdParkRequests[1]._id,
        vehicleId: createdVehicles[1]._id,
        parkDriverId: createdUsers.find(u => u.phone === '+9999999994')._id,
        action: 'verified',
        details: {
          requestType: 'park',
          carNumber: 'XYZ789',
          ownerName: 'Customer Two'
        },
        performedBy: createdUsers.find(u => u.phone === '+9999999992')._id,
        timestamp: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];

    await History.insertMany(historyRecords);
    console.log(`✅ Created ${historyRecords.length} history records`);

    // 9. Create Feedback
    const feedbackRecords = [
      {
        requestId: createdParkRequests[0]._id,
        driverId: createdUsers.find(u => u.phone === '+9999999993')._id,
        rating: 5,
        comments: 'Excellent service! Very professional driver.'
      },
      {
        requestId: createdParkRequests[1]._id,
        driverId: createdUsers.find(u => u.phone === '+9999999994')._id,
        rating: 4,
        comments: 'Good service, vehicle was handled carefully.'
      }
    ];

    await Feedback.insertMany(feedbackRecords);
    console.log(`✅ Created ${feedbackRecords.length} feedback records`);

    // 10. Create some pending requests for testing
    const pendingUsers = [
      {
        name: 'Pending Driver',
        phone: '+1234567890',
        email: 'pending.driver@example.com',
        password: await bcrypt.hash('pending123', 10),
        role: 'driver',
        status: 'pending',
        licenseDetails: {
          number: 'DL999999999',
          expiry: new Date('2025-10-31'),
          photoUrl: 'https://example.com/license_pending.jpg'
        }
      },
      {
        name: 'Pending Supervisor',
        phone: '+1234567891',
        email: 'pending.supervisor@example.com',
        password: await bcrypt.hash('pending123', 10),
        role: 'valet_supervisor',
        status: 'pending'
      }
    ];

    await User.insertMany(pendingUsers);
    console.log('✅ Created pending users for testing');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length + pendingUsers.length + 1}`);
    console.log(`   Vehicles: ${createdVehicles.length + 1}`);
    console.log(`   Requests: ${createdParkRequests.length + createdPickupRequests.length + 1}`);
    console.log(`   History Records: ${historyRecords.length}`);
    console.log(`   Feedback Records: ${feedbackRecords.length}`);
    console.log(`   Parking Locations: ${createdLocations.length}`);

    console.log('\n🔑 Test Credentials:');
    console.log('Admin: +9999999999 / admin123');
    console.log('Valet Supervisor: +9999999991 / valet123');
    console.log('Parking Supervisor: +9999999992 / parker123');
    console.log('Driver 1: +9999999993 / driver123');
    console.log('Driver 2: +9999999994 / driver123');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  const connectDB = require('./config/db');
  connectDB().then(() => {
    seedDatabase();
  });
}

module.exports = seedDatabase;
