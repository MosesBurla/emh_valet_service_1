const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbacMiddleware');
const commonController = require('../controllers/commonController');

router.use(protect);
router.get('/parking-locations', commonController.getParkingLocations);
router.get('/vehicles/search', commonController.searchVehicles);

module.exports = router;
