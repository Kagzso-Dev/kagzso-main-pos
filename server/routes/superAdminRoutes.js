const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const {
    getRestaurants,
    getRestaurant,
    createRestaurant,
    updateRestaurant,
    toggleTenantStatus,
    deleteTenant,
    getSystemStats,
    getTenantStats,
    getTenantStaff,
    createTenantStaff,
    deleteTenantStaff,
    resetStaffPassword,
    updateStaffUsername,
    setupRestaurant,
    getTenantSettings,
    updateTenantOrderStatuses,
} = require('../controllers/superAdminController');

// All superadmin routes require login + superadmin role
router.use(protect, authorize('superadmin'));

router.get('/stats',                            getSystemStats);
router.get('/restaurants',                      getRestaurants);
router.post('/restaurants',                     createRestaurant);
router.get('/restaurants/:id',                  getRestaurant);
router.put('/restaurants/:id',                  updateRestaurant);
router.patch('/restaurants/:id/toggle',         toggleTenantStatus);
router.delete('/restaurants/:id',               deleteTenant);
router.get('/restaurants/:id/stats',            getTenantStats);
router.get('/restaurants/:id/settings',                  getTenantSettings);
router.patch('/restaurants/:id/order-statuses',          updateTenantOrderStatuses);
router.get('/restaurants/:id/staff',            getTenantStaff);
router.post('/restaurants/:id/staff',           createTenantStaff);
router.delete('/restaurants/:id/staff/:userId',          deleteTenantStaff);
router.patch('/restaurants/:id/staff/:userId/password',  resetStaffPassword);
router.patch('/restaurants/:id/staff/:userId/username',  updateStaffUsername);
router.post('/setup/:tenantId',                 setupRestaurant);

module.exports = router;
