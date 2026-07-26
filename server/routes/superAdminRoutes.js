const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');

const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /\.(xlsx|xls)$/i.test(file.originalname);
        cb(null, ok);
    },
});

const sqlUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = /\.sql$/i.test(file.originalname);
        cb(null, ok);
    },
});

const dbImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    fileFilter: (_req, file, cb) => {
        const ok = /\.sql$/i.test(file.originalname);
        cb(null, ok);
    },
});

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
    updateTenantFeatureSettings,
    getBackupSchedule,
    updateBackupSchedule,
    runBackupNow,
    exportTenantData,
    bulkUploadMenu,
    restoreTenantData,
    exportSchema,
    runSchema,
    exportFullDB,
    importFullDB,
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
router.patch('/restaurants/:id/feature-settings',        updateTenantFeatureSettings);
router.get('/restaurants/:id/backup-schedule',           getBackupSchedule);
router.patch('/restaurants/:id/backup-schedule',         updateBackupSchedule);
router.post('/restaurants/:id/backup/run-now',           runBackupNow);
router.get('/restaurants/:id/export',                    exportTenantData);
router.post('/restaurants/:id/menu/bulk-upload',         excelUpload.single('file'), bulkUploadMenu);
router.post('/restaurants/:id/restore',                  excelUpload.single('file'), restoreTenantData);
router.get('/restaurants/:id/staff',            getTenantStaff);
router.post('/restaurants/:id/staff',           createTenantStaff);
router.delete('/restaurants/:id/staff/:userId',          deleteTenantStaff);
router.patch('/restaurants/:id/staff/:userId/password',  resetStaffPassword);
router.patch('/restaurants/:id/staff/:userId/username',  updateStaffUsername);
router.post('/setup/:tenantId',                 setupRestaurant);

router.get('/schema/export',                    exportSchema);
router.post('/schema/run',                      sqlUpload.single('file'), runSchema);

router.get('/db/export',                        exportFullDB);
router.post('/db/import',                       dbImportUpload.single('file'), importFullDB);

module.exports = router;
