const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbacMiddleware');
const driverController = require('../controllers/driverController');

router.use(protect);
router.use(rbac(['driver']));

router.get('/incoming-requests', driverController.getIncomingRequests);
router.post('/accept-request/:id', driverController.acceptRequest);
router.post('/mark-parked/:id', driverController.markParked);
router.post('/mark-handed-over/:id', driverController.markHandedOver);
router.get('/history', driverController.getHistory);
router.get('/today-parked-vehicles', driverController.getTodayParkedVehicles);
router.get('/stats', driverController.getDriverStats);
router.get('/parking-locations', driverController.getParkingLocations);

module.exports = router;
