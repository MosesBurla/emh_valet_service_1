const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rbac = require('../middleware/rbacMiddleware');
const adminController = require('../controllers/adminController');

router.use(protect);
router.use(rbac(['admin']));

router.get('/pending-registrations', adminController.getPendingRegistrations);
router.get('/get-all-users', adminController.getAllUsers);
router.post('/approve-user/:id', adminController.approveUser);
router.post('/reject-user/:id', adminController.rejectUser);
router.put('/edit-user/:id', adminController.editUser);
router.post('/add-parking-location', adminController.addParkingLocation);
router.put('/edit-parking-location/:id', adminController.editParkingLocation);
router.delete('/delete-parking-location/:id', adminController.deleteParkingLocation);
router.get('/statistics', adminController.getStatistics);
router.get('/history', adminController.getComprehensiveHistory);
router.get('/export-history', adminController.exportHistory);
router.get('/system-health', adminController.getSystemHealth);
router.get('/parking-locations', adminController.getParkingLocations);

module.exports = router;
