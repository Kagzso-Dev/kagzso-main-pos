const mysql = require('../config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

/**
 * Super Admin Controller
 * Manages restaurants (tenants) and system-wide settings
 */

// ─── RESTAURANTS ────────────────────────────────────────────────────────────

// GET /api/superadmin/restaurants
const getRestaurants = async (req, res) => {
    try {
        const restaurants = await Tenant.findAll();
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/superadmin/restaurants/:id
const getRestaurant = async (req, res) => {
    try {
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/superadmin/restaurants
const createRestaurant = async (req, res) => {
    const { name, slug, plan } = req.body;
    if (!name || !slug) {
        return res.status(400).json({ message: 'Name and slug are required' });
    }

    const connection = await mysql.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Create restaurant row + config
        const restaurant = await Tenant.create({ name, slug, plan });
        const tenantId = restaurant.id;

        // 2. Settings
        await connection.query(
            'INSERT INTO settings (tenant_id, restaurant_name, currency, currency_symbol, sgst, cgst) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, name, 'INR', '₹', 2.5, 2.5]
        );

        // 3. Counter
        await connection.query(
            'INSERT IGNORE INTO counters (counter_key, tenant_id, sequence_value) VALUES (?, ?, ?)',
            ['tokenNumber_global', tenantId, 0]
        );

        // 4. Auto-create admin, waiter, kitchen, cashier
        // Credentials pattern: role + tenantId + '123'  (e.g. admin6 / admin6123)
        const roles = ['admin', 'waiter', 'kitchen', 'cashier'];
        const createdUsers = [];
        for (const role of roles) {
            const username = `${role}${tenantId}`;
            const password = `${role}${tenantId}123`;
            const hashed   = await bcrypt.hash(password, 10);
            await connection.query(
                'INSERT INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, 1, ?)',
                [crypto.randomUUID(), username, hashed, role, username, tenantId]
            );
            createdUsers.push({ role, username, password });
        }

        await connection.commit();

        res.status(201).json({
            ...restaurant,
            autoCreatedStaff: createdUsers,
        });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Slug already exists' });
        }
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// PUT /api/superadmin/restaurants/:id
const updateRestaurant = async (req, res) => {
    try {
        const { name, slug, plan } = req.body;
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        const updated = await Tenant.update(req.params.id, { name, slug, plan });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/superadmin/restaurants/:id/toggle
const toggleTenantStatus = async (req, res) => {
    try {
        if (parseInt(req.params.id) === 1) {
            return res.status(400).json({ message: 'Cannot deactivate the primary restaurant' });
        }
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        const updated = await Tenant.toggleStatus(req.params.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/superadmin/restaurants/:id
const deleteTenant = async (req, res) => {
    try {
        if (parseInt(req.params.id) === 1) {
            return res.status(400).json({ message: 'Cannot delete the primary restaurant' });
        }
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        await Tenant.deleteCascade(req.params.id);
        res.json({ message: `Restaurant "${restaurant.name}" and all its data have been deleted` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── STATS ──────────────────────────────────────────────────────────────────

// GET /api/superadmin/stats
const getSystemStats = async (req, res) => {
    try {
        const stats = await Tenant.getSystemStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/superadmin/restaurants/:id/stats
const getTenantStats = async (req, res) => {
    try {
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        const stats = await Tenant.getStats(req.params.id);
        res.json({ restaurant, stats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── STAFF ──────────────────────────────────────────────────────────────────

// GET /api/superadmin/restaurants/:id/staff
const getTenantStaff = async (req, res) => {
    try {
        const tenantId = req.params.id;
        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const [rows] = await mysql.query(
            'SELECT id, username, role, name, is_verified, last_login_at, created_at FROM users WHERE tenant_id = ? ORDER BY role, username',
            [tenantId]
        );
        res.json(rows.map((r) => ({
            _id: r.id, username: r.username, role: r.role, name: r.name,
            isVerified: r.is_verified === 1, lastLoginAt: r.last_login_at, createdAt: r.created_at,
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/superadmin/restaurants/:id/staff
const createTenantStaff = async (req, res) => {
    try {
        const tenantId = req.params.id;
        const { username, password, role, name } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'username, password, and role are required' });
        }
        const validRoles = ['admin', 'waiter', 'kitchen', 'cashier'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
        }

        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const exists = await User.usernameExists(username, tenantId);
        if (exists) return res.status(400).json({ message: 'Username already taken for this restaurant' });

        const user = await User.create({ username, password, role, name: name || username, tenantId });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/superadmin/restaurants/:id/staff/:userId/password
const resetStaffPassword = async (req, res) => {
    try {
        const { id: tenantId, userId } = req.params;
        const { password } = req.body;
        if (!password || password.length < 4) {
            return res.status(400).json({ message: 'Password must be at least 4 characters' });
        }
        const [rows] = await mysql.query(
            'SELECT id, username FROM users WHERE id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Staff member not found' });
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(password, 10);
        await mysql.query('UPDATE users SET password_hash = ? WHERE id = ? AND tenant_id = ?', [hashed, userId, tenantId]);
        res.json({ message: `Password updated for "${rows[0].username}"` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/superadmin/restaurants/:id/staff/:userId
const deleteTenantStaff = async (req, res) => {
    try {
        const { id: tenantId, userId } = req.params;
        const [rows] = await mysql.query(
            'SELECT id, username FROM users WHERE id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Staff member not found' });
        await mysql.query('DELETE FROM users WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
        res.json({ message: `User "${rows[0].username}" removed` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── SETUP ──────────────────────────────────────────────────────────────────

// POST /api/superadmin/setup/:tenantId
const setupRestaurant = async (req, res) => {
    const { tenantId } = req.params;
    const { adminUsername, adminPassword } = req.body;

    if (!adminUsername || !adminPassword) {
        return res.status(400).json({ message: 'Admin credentials required for setup' });
    }

    const connection = await mysql.getConnection();
    await connection.beginTransaction();

    try {
        const [restaurants] = await connection.query('SELECT id FROM restaurants WHERE id = ?', [tenantId]);
        if (restaurants.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        const [existing] = await connection.query(
            'SELECT id FROM users WHERE username = ? AND tenant_id = ? LIMIT 1',
            [adminUsername, tenantId]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Username already taken for this restaurant' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(adminPassword, salt);
        await connection.query(
            'INSERT INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), adminUsername, hashed, 'admin', 'Restaurant Admin', 1, tenantId]
        );

        // Settings — only if not already exists
        const [settingsExist] = await connection.query('SELECT id FROM settings WHERE tenant_id = ? LIMIT 1', [tenantId]);
        if (settingsExist.length === 0) {
            await connection.query(
                'INSERT INTO settings (tenant_id, dine_in_enabled, takeaway_enabled) VALUES (?, 1, 1)',
                [tenantId]
            );
        }

        // Starter categories — only if none exist
        const [catExist] = await connection.query('SELECT id FROM categories WHERE tenant_id = ? LIMIT 1', [tenantId]);
        if (catExist.length === 0) {
            const categories = [
                { name: 'Beverages', color: '#3b82f6' },
                { name: 'Main Course', color: '#f97316' },
                { name: 'Desserts', color: '#ec4899' },
            ];
            for (const cat of categories) {
                await connection.query(
                    'INSERT INTO categories (id, name, color, status, tenant_id) VALUES (?, ?, ?, "active", ?)',
                    [crypto.randomUUID(), cat.name, cat.color, tenantId]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Restaurant setup completed successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Setup error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

module.exports = {
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
    setupRestaurant,
};
