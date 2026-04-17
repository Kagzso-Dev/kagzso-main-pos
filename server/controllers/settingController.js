const Setting = require('../models/Setting');
const User = require('../models/User');
const { invalidateCache } = require('../utils/cache');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// GET /api/settings
const getSettings = async (req, res) => {
    try {
        res.json(await Setting.get(req.tenantId));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
    try {
        const settings = await Setting.update(req.body, req.tenantId);
        invalidateCache('settings');

        const io = req.app.get('io');
        if (io) {
            io.to(`${req.tenantId}:restaurant_main`).emit('settings-updated', settings);
        }

        res.json(settings);
    } catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/settings/change-password
const changePassword = async (req, res) => {
    try {
        const { userId, role, newPassword } = req.body;
        let targetUser;

        if (role) {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Only Admin can change staff passwords' });
            }
            const users = await User.findByRole(role);
            targetUser = users[0];
        } else {
            const idToUpdate = userId || req.userId;
            targetUser = await User.findById(idToUpdate);
            if (req.role !== 'admin' && String(req.userId) !== String(idToUpdate)) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.updatePassword(targetUser._id, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

// GET /api/settings/qr
const getQrSettings = async (req, res) => {
    try {
        const settings = await Setting.get(req.tenantId);
        res.json({
            standardQrUrl:  settings.standardQrUrl  || null,
            secondaryQrUrl: settings.secondaryQrUrl || null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QR settings' });
    }
};

// POST /api/settings/qr
const uploadQr = async (req, res) => {
    try {
        const type = req.body?.type;
        const file = req.file;

        if (!type || !['standard', 'secondary'].includes(type)) {
            return res.status(400).json({ message: 'Valid type (standard/secondary) is required' });
        }

        if (req.role === 'cashier' && type !== 'secondary') {
            return res.status(403).json({ message: 'Cashiers can only update Secondary QR' });
        }

        if (!file) {
            return res.status(400).json({ message: 'QR image file is required' });
        }

        const uploadName = `${type}_qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname) || '.png'}`;
        const publicImagesPath = path.join(__dirname, '../../client/public/images');

        if (!fs.existsSync(publicImagesPath)) {
            fs.mkdirSync(publicImagesPath, { recursive: true });
        }

        fs.writeFileSync(path.join(publicImagesPath, uploadName), file.buffer);

        const distImagesPath = path.join(__dirname, '../../client/dist/images');
        if (fs.existsSync(path.join(__dirname, '../../client/dist'))) {
            if (!fs.existsSync(distImagesPath)) fs.mkdirSync(distImagesPath, { recursive: true });
            fs.writeFileSync(path.join(distImagesPath, uploadName), file.buffer);
        }

        const url = `/images/${uploadName}`;
        const settings = await Setting.updateQr({ type, fileId: uploadName, url }, req.tenantId);
        invalidateCache('settings');

        const io = req.app.get('io');
        if (io) io.to(`${req.tenantId}:restaurant_main`).emit('settings-updated', settings);

        res.json({
            message: `${type} QR updated successfully`,
            url,
            standardQrUrl:  settings.standardQrUrl,
            secondaryQrUrl: settings.secondaryQrUrl,
        });
    } catch (error) {
        console.error('QR upload error:', error);
        res.status(500).json({ message: 'QR upload failed', error: error.message });
    }
};

module.exports = { getSettings, updateSettings, changePassword, getQrSettings, uploadQr };
