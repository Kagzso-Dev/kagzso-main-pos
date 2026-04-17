const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, changePassword, getQrSettings, uploadQr } = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { cacheMiddleware } = require('../utils/cache');

// ── Soft tenant extractor (no auth required, reads tenantId from JWT or header)
const extractTenant = (req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
            const raw = decoded.tenantId ?? req.headers['x-tenant-id'] ?? null;
            const parsed = raw !== null ? parseInt(raw, 10) : null;
            if (parsed && !isNaN(parsed)) req.tenantId = parsed;
        } catch {}
    }
    if (!req.tenantId) {
        const hdr = req.headers['x-tenant-id'];
        if (hdr) {
            const parsed = parseInt(hdr, 10);
            if (!isNaN(parsed) && parsed > 0) req.tenantId = parsed;
        }
    }
    next();
};

// ── Public Routes ──────────────────────────────────────────────
router.get('/', extractTenant, cacheMiddleware(60, 'settings'), getSettings);

// ── Protected Routes (Admin Only for most) ──────────────────────
router.use(protect);

router.put('/', authorize('admin'), updateSettings);
router.post('/change-password', authorize('admin'), changePassword);
router.get('/qr', getQrSettings);
router.post('/qr', authorize('admin', 'cashier'), upload.single('qr'), uploadQr);

module.exports = router;
