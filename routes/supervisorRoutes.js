const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbacMiddleware');
const supervisorController = require('../controllers/supervisorController');

router.use(protect);

// Valet Supervisor routes (role: valet_supervisor)
router.post('/create-park-request', rbac(['valet_supervisor']), supervisorController.createParkRequest);
router.post('/create-pickup-request', rbac(['valet_supervisor']), supervisorController.createPickupRequest);

// Parking Location Supervisor routes (role: parking_location_supervisor)
router.post('/verify-park-request', rbac(['parking_location_supervisor']), supervisorController.verifyParkRequest);
router.post('/mark-self-pickup/:vehicleId', rbac(['parking_location_supervisor']), supervisorController.markSelfPickup);

// Common routes for both supervisor types
router.get('/parked-vehicles', rbac(['valet_supervisor', 'parking_location_supervisor']), supervisorController.getParkedVehicles);
router.get('/today-parked-vehicles', rbac(['valet_supervisor', 'parking_location_supervisor']), supervisorController.getTodayParkedVehicles);
router.get('/history', rbac(['valet_supervisor', 'parking_location_supervisor']), supervisorController.getHistory);
router.get('/dashboard-stats', rbac(['valet_supervisor', 'parking_location_supervisor']), supervisorController.getDashboardStats);

module.exports = router;
