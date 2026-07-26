const mysql = require('../config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ExcelJS = require('exceljs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Setting = require('../models/Setting');
const { emitNotification } = require('./notificationController');
const { invalidateCache } = require('../utils/cache');

/**
 * Super Admin Controller
 * Manages restaurants (tenants) and system-wide settings
 */

// ─── RESTAURANTS ────────────────────────────────────────────────────────────

// GET /api/superadmin/restaurants
const getRestaurants = async (_req, res) => {
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
        // 1. Restaurant row — inside transaction
        const [result] = await connection.query(
            'INSERT INTO restaurants (name, slug, plan) VALUES (?, ?, ?)',
            [name, slug.toLowerCase(), plan || 'pro']
        );
        const tenantId = result.insertId;

        // 2. Restaurant config
        await connection.query(
            'INSERT INTO restaurants_config (tenant_id, table_count, enabled_modules) VALUES (?, ?, ?)',
            [tenantId, 10, JSON.stringify(['orders', 'kot', 'billing'])]
        );

        // 3. Settings
        await connection.query(
            'INSERT INTO settings (tenant_id, restaurant_name, currency, currency_symbol, sgst, cgst) VALUES (?, ?, ?, ?, ?, ?)',
            [tenantId, name, 'INR', '₹', 2.5, 2.5]
        );

        // 4. Counter
        await connection.query(
            'INSERT IGNORE INTO counters (counter_key, tenant_id, sequence_value) VALUES (?, ?, ?)',
            ['tokenNumber_global', tenantId, 0]
        );

        // 5. Auto-create staff — credentials: role + tenantId + '123'
        const roles = ['admin', 'waiter', 'kitchen', 'cashier'];
        const createdUsers = [];
        for (const role of roles) {
            const username = `${role}${tenantId}`;
            const password = `${role}${tenantId}123`;
            const hashed   = await bcrypt.hash(password, 10);
            await connection.query(
                'INSERT INTO users (id, username, password_hash, plain_password, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
                [crypto.randomUUID(), username, hashed, password, role, username, tenantId]
            );
            createdUsers.push({ role, username, password });
        }

        await connection.commit();

        const restaurant = await Tenant.findById(tenantId);
        res.status(201).json({ ...restaurant, autoCreatedStaff: createdUsers });
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
const getSystemStats = async (_req, res) => {
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
            'SELECT id, username, role, name, is_verified, last_login_at, created_at, plain_password FROM users WHERE tenant_id = ? ORDER BY role, username',
            [tenantId]
        );
        res.json(rows.map((r) => ({
            _id: r.id, username: r.username, role: r.role, name: r.name,
            plainPassword: r.plain_password,
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
        const hashed = await bcrypt.hash(password, 10);
        await mysql.query('UPDATE users SET password_hash = ?, plain_password = ? WHERE id = ? AND tenant_id = ?', [hashed, password, userId, tenantId]);
        res.json({ message: `Password updated for "${rows[0].username}"` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/superadmin/restaurants/:id/staff/:userId/username
const updateStaffUsername = async (req, res) => {
    try {
        const { id: tenantId, userId } = req.params;
        const clean = (req.body.username || '').trim().toLowerCase();
        if (clean.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters' });
        }
        const [rows] = await mysql.query(
            'SELECT id FROM users WHERE id = ? AND tenant_id = ? LIMIT 1',
            [userId, tenantId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Staff member not found' });
        const [taken] = await mysql.query(
            'SELECT id FROM users WHERE username = ? AND tenant_id = ? AND id != ? LIMIT 1',
            [clean, tenantId, userId]
        );
        if (taken.length > 0) return res.status(400).json({ message: 'Username already taken' });
        await mysql.query('UPDATE users SET username = ? WHERE id = ? AND tenant_id = ?', [clean, userId, tenantId]);
        res.json({ message: `Username updated to "${clean}"`, username: clean });
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

// ─── ORDER STATUSES ─────────────────────────────────────────────────────────

// GET /api/superadmin/restaurants/:id/settings
const getTenantSettings = async (req, res) => {
    try {
        await ensureOrderStatusesCol();
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        const settings = await Setting.get(req.params.id);
        res.json({
            orderStatusesConfig: settings.orderStatusesConfig,
            dineInEnabled:       settings.dineInEnabled,
            takeawayEnabled:     settings.takeawayEnabled,
            tableMapEnabled:     settings.tableMapEnabled,
            kotPrintEnabled:     settings.kotPrintEnabled,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ensure order_statuses_config column exists (auto-migration)
let _orderStatusesColChecked = false;
const ensureOrderStatusesCol = async () => {
    if (_orderStatusesColChecked) return;
    const [cols] = await mysql.query('SHOW COLUMNS FROM settings LIKE "order_statuses_config"');
    if (cols.length === 0) {
        await mysql.query('ALTER TABLE settings ADD COLUMN order_statuses_config JSON');
        console.log('[migration] Added order_statuses_config column to settings');
    }
    _orderStatusesColChecked = true;
};

// PATCH /api/superadmin/restaurants/:id/order-statuses
const updateTenantOrderStatuses = async (req, res) => {
    try {
        await ensureOrderStatusesCol();

        const tenantId = req.params.id;
        const { key, enabled } = req.body;

        const validKeys = ['pending', 'accepted', 'preparing', 'ready', 'payment', 'completed', 'cancelled'];
        if (!validKeys.includes(key) || typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Valid key and enabled (boolean) are required' });
        }

        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const current = await Setting.get(tenantId);
        const updated = { ...current.orderStatusesConfig, [key]: enabled };
        await Setting.update({ orderStatusesConfig: updated }, tenantId);

        const io = req.app.get('io');
        if (io) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            emitNotification(io, parseInt(tenantId), 'admin', {
                title: `Order Status ${enabled ? 'Enabled' : 'Disabled'}`,
                message: `"${label}" order status has been ${enabled ? 'enabled' : 'disabled'} by Super Admin.`,
                type: 'SYSTEM_ALERT',
            });
        }

        res.json({ orderStatusesConfig: updated });
    } catch (error) {
        console.error('[updateTenantOrderStatuses]', error.message);
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/superadmin/restaurants/:id/feature-settings
const updateTenantFeatureSettings = async (req, res) => {
    try {
        const tenantId = req.params.id;
        const { key, enabled } = req.body;

        const validKeys = ['dineInEnabled', 'takeawayEnabled', 'tableMapEnabled', 'kotPrintEnabled'];
        if (!validKeys.includes(key) || typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'Valid key and enabled (boolean) are required' });
        }

        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        await Setting.update({ [key]: enabled }, tenantId);
        const updated = await Setting.get(tenantId);

        const io = req.app.get('io');
        if (io) {
            // Push updated settings to the restaurant's dashboard in real-time
            io.to(`${tenantId}:restaurant_main`).emit('settings-updated', updated);

            const labels = { dineInEnabled: 'Dine-In', takeawayEnabled: 'Takeaway', tableMapEnabled: 'Table Map', kotPrintEnabled: 'KOT Print' };
            emitNotification(io, parseInt(tenantId), 'admin', {
                title: `${labels[key]} ${enabled ? 'Enabled' : 'Disabled'}`,
                message: `${labels[key]} has been ${enabled ? 'enabled' : 'disabled'} by Super Admin.`,
                type: 'SYSTEM_ALERT',
            });
        }

        res.json({
            dineInEnabled:   updated.dineInEnabled,
            takeawayEnabled: updated.takeawayEnabled,
            tableMapEnabled: updated.tableMapEnabled,
            kotPrintEnabled: updated.kotPrintEnabled,
        });
    } catch (error) {
        console.error('[updateTenantFeatureSettings]', error.message);
        res.status(500).json({ message: error.message });
    }
};

// ─── BACKUP SCHEDULE ────────────────────────────────────────────────────────

let _backupScheduleColChecked = false;
const ensureBackupScheduleCol = async () => {
    if (_backupScheduleColChecked) return;
    const [cols] = await mysql.query('SHOW COLUMNS FROM settings LIKE "backup_schedule_config"');
    if (cols.length === 0) {
        await mysql.query('ALTER TABLE settings ADD COLUMN backup_schedule_config JSON');
        console.log('[migration] Added backup_schedule_config column to settings');
    }
    _backupScheduleColChecked = true;
};

const DEFAULT_BACKUP_SCHEDULE = { backupEnabled: false, frequency: 'daily', time: '02:00', lastBackupAt: null };

// GET /api/superadmin/restaurants/:id/backup-schedule
const getBackupSchedule = async (req, res) => {
    try {
        await ensureBackupScheduleCol();
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        const [rows] = await mysql.query('SELECT backup_schedule_config FROM settings WHERE tenant_id = ? LIMIT 1', [req.params.id]);
        const raw = rows[0]?.backup_schedule_config;
        const schedule = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : DEFAULT_BACKUP_SCHEDULE;
        res.json({ ...DEFAULT_BACKUP_SCHEDULE, ...schedule });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/superadmin/restaurants/:id/backup-schedule
const updateBackupSchedule = async (req, res) => {
    try {
        await ensureBackupScheduleCol();
        const tenantId = req.params.id;
        const { backupEnabled, frequency, time } = req.body;

        const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
        if (frequency !== undefined && !validFrequencies.includes(frequency)) {
            return res.status(400).json({ message: 'frequency must be hourly, daily, weekly, monthly, or yearly' });
        }

        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const [rows] = await mysql.query('SELECT backup_schedule_config FROM settings WHERE tenant_id = ? LIMIT 1', [tenantId]);
        const raw = rows[0]?.backup_schedule_config;
        const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : DEFAULT_BACKUP_SCHEDULE;

        const updated = {
            ...DEFAULT_BACKUP_SCHEDULE,
            ...existing,
            ...(backupEnabled !== undefined && { backupEnabled: Boolean(backupEnabled) }),
            ...(frequency !== undefined && { frequency }),
            ...(time !== undefined && { time }),
        };

        await mysql.query('UPDATE settings SET backup_schedule_config = ? WHERE tenant_id = ?', [JSON.stringify(updated), tenantId]);

        // Update live cron job without restart
        const { refreshTenantSchedule } = require('../services/cronScheduler');
        refreshTenantSchedule(tenantId, updated);

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── EXPORT TENANT DATA (Excel) ─────────────────────────────────────────────

// GET /api/superadmin/restaurants/:id/export
const exportTenantData = async (req, res) => {
    const tenantId = req.params.id;
    try {
        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const [orders, orderItems, payments, menuItems, staff, categories] = await Promise.all([
            mysql.query(
                `SELECT o.id, o.order_number, o.order_status, o.order_type, o.total_amount,
                        t.number AS table_number, o.created_at
                 FROM orders o
                 LEFT JOIN \`tables\` t ON t.id = o.table_id
                 WHERE o.tenant_id = ? ORDER BY o.created_at DESC`,
                [tenantId]
            ),
            mysql.query(
                `SELECT oi.order_id, oi.name AS item_name, oi.quantity, oi.price AS unit_price,
                        (oi.quantity * oi.price) AS line_total
                 FROM order_items oi
                 INNER JOIN orders o ON o.id = oi.order_id
                 WHERE o.tenant_id = ? ORDER BY oi.order_id`,
                [tenantId]
            ),
            mysql.query(
                `SELECT p.id, p.order_id, p.amount, p.payment_method, p.created_at
                 FROM payments p
                 INNER JOIN orders o ON o.id = p.order_id
                 WHERE o.tenant_id = ? ORDER BY p.created_at DESC`,
                [tenantId]
            ),
            mysql.query(
                `SELECT m.name, c.name AS category, m.price, m.availability AS status
                 FROM menu_items m
                 LEFT JOIN categories c ON c.id = m.category_id
                 WHERE m.tenant_id = ? ORDER BY c.name, m.name`,
                [tenantId]
            ),
            mysql.query(
                `SELECT username, name, role, created_at FROM users WHERE tenant_id = ? ORDER BY role, username`,
                [tenantId]
            ),
            mysql.query(
                `SELECT name, color, status FROM categories WHERE tenant_id = ? ORDER BY name`,
                [tenantId]
            ),
        ]);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Kagzso POS';
        wb.created = new Date();

        const addSheet = (name, columns, dataRows) => {
            const ws = wb.addWorksheet(name);
            ws.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 20 }));
            ws.getRow(1).eachCell((cell) => {
                cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                cell.alignment = { horizontal: 'center' };
            });
            dataRows.forEach((row) => ws.addRow(row));
            return ws;
        };

        // Sheet 1 — Orders
        addSheet('Orders',
            [
                { key: 'id',           label: 'Order ID',   width: 38 },
                { key: 'order_number', label: 'Order No',   width: 12 },
                { key: 'order_status', label: 'Status',     width: 14 },
                { key: 'order_type',   label: 'Type',       width: 12 },
                { key: 'table_number', label: 'Table No',   width: 10 },
                { key: 'total_amount', label: 'Total (Rs)', width: 14 },
                { key: 'created_at',   label: 'Created At', width: 22 },
            ],
            orders[0].map((r) => ({
                id: r.id, order_number: r.order_number, order_status: r.order_status,
                order_type: r.order_type, table_number: r.table_number ?? '-',
                total_amount: Number(r.total_amount), created_at: r.created_at,
            }))
        );

        // Sheet 2 — Order Items
        addSheet('Order Items',
            [
                { key: 'order_id',   label: 'Order ID',    width: 38 },
                { key: 'item_name',  label: 'Item',        width: 24 },
                { key: 'quantity',   label: 'Qty',         width: 8 },
                { key: 'unit_price', label: 'Unit Price',  width: 14 },
                { key: 'line_total', label: 'Line Total',  width: 14 },
            ],
            orderItems[0].map((r) => ({
                order_id: r.order_id, item_name: r.item_name,
                quantity: r.quantity, unit_price: Number(r.unit_price),
                line_total: Number(r.line_total),
            }))
        );

        // Sheet 3 — Payments
        addSheet('Payments',
            [
                { key: 'id',             label: 'Payment ID',    width: 38 },
                { key: 'order_id',       label: 'Order ID',      width: 38 },
                { key: 'amount',         label: 'Amount (Rs)',   width: 14 },
                { key: 'payment_method', label: 'Method',        width: 14 },
                { key: 'created_at',     label: 'Created At',    width: 22 },
            ],
            payments[0].map((r) => ({
                id: r.id, order_id: r.order_id, amount: Number(r.amount),
                payment_method: r.payment_method, created_at: r.created_at,
            }))
        );

        // Sheet 4 — Menu Items
        addSheet('Menu Items',
            [
                { key: 'name',     label: 'Item Name', width: 26 },
                { key: 'category', label: 'Category',  width: 20 },
                { key: 'price',    label: 'Price (Rs)', width: 14 },
                { key: 'status',   label: 'Status',    width: 12 },
            ],
            menuItems[0].map((r) => ({
                name: r.name, category: r.category || '-',
                price: Number(r.price), status: r.status,
            }))
        );

        // Sheet 5 — Staff
        addSheet('Staff',
            [
                { key: 'username',   label: 'Username',   width: 20 },
                { key: 'name',       label: 'Name',       width: 22 },
                { key: 'role',       label: 'Role',       width: 14 },
                { key: 'created_at', label: 'Joined At',  width: 22 },
            ],
            staff[0].map((r) => ({
                username: r.username, name: r.name || '-',
                role: r.role, created_at: r.created_at,
            }))
        );

        // Sheet 6 — Categories
        addSheet('Categories',
            [
                { key: 'name',   label: 'Category', width: 22 },
                { key: 'color',  label: 'Color',    width: 12 },
                { key: 'status', label: 'Status',   width: 12 },
            ],
            categories[0].map((r) => ({ name: r.name, color: r.color, status: r.status }))
        );

        const slug = restaurant.slug || `tenant-${tenantId}`;
        const date = new Date().toISOString().slice(0, 10);
        const filename = `${slug}_export_${date}.xlsx`;
        const tmpPath = path.join(os.tmpdir(), `kagzso_${tenantId}_${Date.now()}.xlsx`);

        await wb.xlsx.writeFile(tmpPath);

        res.download(tmpPath, filename, (err) => {
            fs.unlink(tmpPath, () => {});
            if (err && !res.headersSent) {
                console.error('[Export] send error:', err);
            }
        });
    } catch (error) {
        console.error('[Export]', error);
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

// POST /api/superadmin/restaurants/:id/backup/run-now
const runBackupNow = async (req, res) => {
    try {
        const restaurant = await Tenant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const { runBackup } = require('../services/backupService');
        runBackup(req.params.id); // fire-and-forget — don't await so response is instant
        res.json({ message: `Backup started for "${restaurant.name}"` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── BULK MENU UPLOAD ───────────────────────────────────────────────────────

// POST /api/superadmin/restaurants/:id/menu/bulk-upload
const bulkUploadMenu = async (req, res) => {
    const tenantId = req.params.id;
    try {
        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        if (!req.file)   return res.status(400).json({ message: 'Excel file is required' });

        // Parse uploaded Excel buffer
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);
        const ws = wb.worksheets[0];
        if (!ws) return res.status(400).json({ message: 'No worksheet found in file' });

        // Read header row — normalize to lowercase
        const headers = [];
        ws.getRow(1).eachCell((cell) => headers.push(String(cell.value || '').trim().toLowerCase()));

        const col = (name) => headers.indexOf(name); // returns 0-based index
        if (col('name') === -1 || col('category') === -1 || col('price') === -1) {
            return res.status(400).json({ message: 'Excel must have columns: name, category, price' });
        }

        // Collect valid data rows
        const rows = [];
        ws.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const get = (colName) => {
                const idx = col(colName);
                return idx === -1 ? null : row.getCell(idx + 1).value;
            };
            const name     = String(get('name') || '').trim();
            const category = String(get('category') || '').trim();
            const price    = parseFloat(get('price')) || 0;
            if (!name || !category || price <= 0) return;

            const availRaw = String(get('availability') || '').toLowerCase();
            const vegRaw   = String(get('is_veg') || '').toLowerCase();

            rows.push({
                name,
                category,
                price,
                description:  String(get('description') || '').trim() || null,
                availability: !['no', 'false', '0', 'inactive'].includes(availRaw),
                isVeg:        ['yes', 'true', '1', 'veg'].includes(vegRaw),
            });
        });

        if (rows.length === 0) {
            return res.status(400).json({ message: 'No valid rows found. Check name, category, price columns.' });
        }

        // Load existing categories for this tenant
        const [existingCats] = await mysql.query(
            'SELECT id, name FROM categories WHERE tenant_id = ?', [tenantId]
        );
        const catMap = {};
        existingCats.forEach((c) => { catMap[c.name.toLowerCase()] = c.id; });

        // Auto-create missing categories
        const catColors = ['#f97316', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
        const uniqueCats = [...new Set(rows.map((r) => r.category))];
        let newCats = 0;
        for (const catName of uniqueCats) {
            if (!catMap[catName.toLowerCase()]) {
                const catId = crypto.randomUUID();
                const color = catColors[Object.keys(catMap).length % catColors.length];
                await mysql.query(
                    'INSERT INTO categories (id, name, color, status, is_active, tenant_id) VALUES (?, ?, ?, "active", 1, ?)',
                    [catId, catName, color, tenantId]
                );
                catMap[catName.toLowerCase()] = catId;
                newCats++;
            }
        }

        // Insert menu items
        let inserted = 0;
        let skipped  = 0;
        for (const row of rows) {
            const categoryId = catMap[row.category.toLowerCase()];
            if (!categoryId) { skipped++; continue; }
            try {
                await mysql.query(
                    `INSERT INTO menu_items
                     (id, name, description, price, category_id, availability, is_active, is_veg, tenant_id)
                     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                    [crypto.randomUUID(), row.name, row.description, row.price,
                     categoryId, row.availability ? 1 : 0, row.isVeg ? 1 : 0, tenantId]
                );
                inserted++;
            } catch (err) {
                skipped++;
            }
        }

        invalidateCache('menu', tenantId);
        invalidateCache('categories', tenantId);

        const io = req.app.get('io');
        if (io) {
            io.to(`${tenantId}:restaurant_main`).emit('menu-updated', { action: 'bulk-upload' });
        }

        res.json({
            message: `Bulk upload complete — ${inserted} items added, ${skipped} skipped`,
            inserted,
            skipped,
            newCategories: newCats,
            total: rows.length,
        });
    } catch (error) {
        console.error('[BulkUpload]', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── RESTORE TENANT DATA (from Excel backup) ────────────────────────────────

// POST /api/superadmin/restaurants/:id/restore
const restoreTenantData = async (req, res) => {
    const tenantId = req.params.id;
    try {
        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        if (!req.file)   return res.status(400).json({ message: 'Excel file is required' });

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);

        // Find sheet by name (case-insensitive)
        const getSheet = (name) =>
            wb.worksheets.find((ws) => ws.name.toLowerCase().trim() === name.toLowerCase());

        // Parse a worksheet into array of plain objects keyed by lowercase header label
        const parseSheet = (ws) => {
            if (!ws) return [];
            const headers = {};
            ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
                headers[col] = String(cell.value ?? '').trim().toLowerCase();
            });
            const rows = [];
            ws.eachRow((row, rowNum) => {
                if (rowNum === 1) return;
                const obj = {};
                row.eachCell({ includeEmpty: true }, (cell, col) => {
                    const h = headers[col];
                    if (h) obj[h] = cell.value;
                });
                // skip fully empty rows
                if (Object.values(obj).some((v) => v !== null && v !== undefined && v !== '')) {
                    rows.push(obj);
                }
            });
            return rows;
        };

        const categoriesRows = parseSheet(getSheet('Categories'));
        const menuRows       = parseSheet(getSheet('Menu Items'));
        const ordersRows     = parseSheet(getSheet('Orders'));
        const itemsRows      = parseSheet(getSheet('Order Items'));
        const paymentsRows   = parseSheet(getSheet('Payments'));
        const staffRows      = parseSheet(getSheet('Staff'));

        const stats = { categories: 0, menuItems: 0, orders: 0, orderItems: 0, payments: 0, staff: 0, skipped: 0 };

        // ── 1. Categories ──────────────────────────────────────────────────────
        const catNameToId = {};
        // Preload existing categories so we don't duplicate
        const [existingCats] = await mysql.query('SELECT id, name FROM categories WHERE tenant_id = ?', [tenantId]);
        existingCats.forEach((c) => { catNameToId[c.name.toLowerCase()] = c.id; });

        for (const row of categoriesRows) {
            const name   = String(row['category'] || row['name'] || '').trim();
            const color  = String(row['color']    || '#6366f1').trim();
            const status = String(row['status']   || 'active').trim();
            if (!name) { stats.skipped++; continue; }

            if (!catNameToId[name.toLowerCase()]) {
                const id = crypto.randomUUID();
                await mysql.query(
                    'INSERT IGNORE INTO categories (id, name, color, status, is_active, tenant_id) VALUES (?, ?, ?, ?, 1, ?)',
                    [id, name, color, status, tenantId]
                );
                catNameToId[name.toLowerCase()] = id;
                stats.categories++;
            }
        }

        // ── 2. Menu Items ──────────────────────────────────────────────────────
        for (const row of menuRows) {
            const name     = String(row['item name'] || row['name'] || '').trim();
            const catName  = String(row['category']  || '').trim();
            const price    = parseFloat(row['price (rs)'] || row['price'] || 0);
            const statusRaw = String(row['status'] || 'active').toLowerCase();
            if (!name || price <= 0) { stats.skipped++; continue; }

            const categoryId   = catNameToId[catName.toLowerCase()] || null;
            const availability = !['inactive', 'no', 'false', '0'].includes(statusRaw) ? 1 : 0;

            try {
                const [r] = await mysql.query(
                    `INSERT IGNORE INTO menu_items (id, name, price, category_id, availability, is_active, is_veg, tenant_id)
                     VALUES (?, ?, ?, ?, ?, 1, 0, ?)`,
                    [crypto.randomUUID(), name, price, categoryId, availability, tenantId]
                );
                if (r.affectedRows > 0) stats.menuItems++;
                else stats.skipped++;
            } catch { stats.skipped++; }
        }

        // ── 3. Orders ──────────────────────────────────────────────────────────
        for (const row of ordersRows) {
            const id          = String(row['order id']  || '').trim();
            const orderNumber = String(row['order no']  || '').trim();
            const orderStatus = String(row['status']    || 'completed').trim();
            const orderType   = String(row['type']      || 'dine-in').trim();
            const total       = parseFloat(row['total (rs)'] || row['total'] || 0);
            const createdAt   = row['created at'] instanceof Date
                ? row['created at']
                : new Date(row['created at'] || Date.now());

            if (!id || !orderNumber) { stats.skipped++; continue; }

            try {
                const [r] = await mysql.query(
                    `INSERT IGNORE INTO orders
                     (id, order_number, order_type, order_status, payment_status,
                      total_amount, final_amount, kot_status, tenant_id, created_at)
                     VALUES (?, ?, ?, ?, 'paid', ?, ?, 'Closed', ?, ?)`,
                    [id, orderNumber, orderType, orderStatus, total, total, tenantId, createdAt]
                );
                if (r.affectedRows > 0) stats.orders++;
                else stats.skipped++;
            } catch { stats.skipped++; }
        }

        // ── 4. Order Items ─────────────────────────────────────────────────────
        for (const row of itemsRows) {
            const orderId  = String(row['order id'] || '').trim();
            const name     = String(row['item']     || '').trim();
            const qty      = parseInt(row['qty']    || 1);
            const price    = parseFloat(row['unit price'] || 0);
            if (!orderId || !name) { stats.skipped++; continue; }

            try {
                await mysql.query(
                    `INSERT INTO order_items (id, order_id, name, price, quantity, status, is_newly_added)
                     VALUES (?, ?, ?, ?, ?, 'DONE', 0)`,
                    [crypto.randomUUID(), orderId, name, price, qty]
                );
                stats.orderItems++;
            } catch { stats.skipped++; }
        }

        // ── 5. Payments ────────────────────────────────────────────────────────
        for (const row of paymentsRows) {
            const id        = String(row['payment id'] || '').trim();
            const orderId   = String(row['order id']   || '').trim();
            const amount    = parseFloat(row['amount (rs)'] || row['amount'] || 0);
            const method    = String(row['method'] || 'cash').trim();
            const createdAt = row['created at'] instanceof Date
                ? row['created at']
                : new Date(row['created at'] || Date.now());
            if (!id || !orderId) { stats.skipped++; continue; }

            try {
                const [r] = await mysql.query(
                    `INSERT IGNORE INTO payments
                     (id, order_id, payment_method, amount, amount_received, change_amount, created_at)
                     VALUES (?, ?, ?, ?, ?, 0, ?)`,
                    [id, orderId, method, amount, amount, createdAt]
                );
                if (r.affectedRows > 0) stats.payments++;
                else stats.skipped++;
            } catch { stats.skipped++; }
        }

        // ── 6. Staff ───────────────────────────────────────────────────────────
        const validRoles = ['admin', 'waiter', 'kitchen', 'cashier'];
        for (const row of staffRows) {
            const username = String(row['username'] || '').trim().toLowerCase();
            const name     = String(row['name']     || '').trim();
            const role     = String(row['role']     || '').trim().toLowerCase();
            if (!username || !validRoles.includes(role)) { stats.skipped++; continue; }

            const [exists] = await mysql.query(
                'SELECT id FROM users WHERE username = ? AND tenant_id = ? LIMIT 1',
                [username, tenantId]
            );
            if (exists.length > 0) { stats.skipped++; continue; }

            const defaultPw = `${username}123`;
            const hashed    = await bcrypt.hash(defaultPw, 10);
            try {
                await mysql.query(
                    `INSERT IGNORE INTO users (id, username, password_hash, plain_password, role, name, is_verified, tenant_id)
                     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
                    [crypto.randomUUID(), username, hashed, defaultPw, role, name || username, tenantId]
                );
                stats.staff++;
            } catch { stats.skipped++; }
        }

        invalidateCache('menu',       tenantId);
        invalidateCache('categories', tenantId);

        res.json({
            message: 'Restore completed successfully',
            restored: stats,
            note: 'Staff passwords set to username + "123". Change them in the Staff panel.',
        });
    } catch (error) {
        console.error('[Restore]', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── SCHEMA EXPORT ──────────────────────────────────────────────────────────

// GET /api/superadmin/schema/export
const exportSchema = async (_req, res) => {
    try {
        const [tables] = await mysql.query('SHOW TABLES');
        const tableKey = Object.keys(tables[0])[0]; // e.g. "Tables_in_yourdb"

        const lines = [
            `-- ============================================================`,
            `-- Kagzso POS — Full Database Schema`,
            `-- Exported: ${new Date().toISOString()}`,
            `-- ============================================================`,
            '',
            'SET FOREIGN_KEY_CHECKS = 0;',
            '',
        ];

        for (const row of tables) {
            const tableName = row[tableKey];
            const [[createRow]] = await mysql.query(`SHOW CREATE TABLE \`${tableName}\``);
            const createSql = createRow['Create Table'];

            // Convert to IF NOT EXISTS so it is safe to re-run
            const safeSql = createSql.replace(
                /^CREATE TABLE `/,
                'CREATE TABLE IF NOT EXISTS `'
            );

            lines.push(`-- Table: ${tableName}`);
            lines.push(`${safeSql};`);
            lines.push('');
        }

        lines.push('SET FOREIGN_KEY_CHECKS = 1;');

        const sqlContent = lines.join('\n');
        const date = new Date().toISOString().slice(0, 10);
        const filename = `kagzso_schema_${date}.sql`;

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(sqlContent);
    } catch (error) {
        console.error('[SchemaExport]', error);
        res.status(500).json({ message: error.message });
    }
};

// ─── SCHEMA IMPORT (run .sql file) ──────────────────────────────────────────

// POST /api/superadmin/schema/run
const runSchema = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'SQL file is required' });

    const sql = req.file.buffer.toString('utf8');

    // Split into individual statements, drop empty lines and comments
    const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

    // Whitelist — only safe structural statements allowed
    const ALLOWED = /^(CREATE TABLE|ALTER TABLE|SET FOREIGN_KEY_CHECKS|CREATE INDEX|CREATE UNIQUE INDEX)/i;

    const results = { executed: 0, skipped: 0, errors: [] };
    const conn = await mysql.getConnection();
    try {
        for (const stmt of statements) {
            const trimmed = stmt.replace(/^\/\*.*?\*\//s, '').trim();
            if (!trimmed) continue;

            if (!ALLOWED.test(trimmed)) {
                results.skipped++;
                continue;
            }

            try {
                await conn.query(trimmed);
                results.executed++;
            } catch (err) {
                // ER_TABLE_EXISTS_ERROR (1050) is fine — table already exists
                if (err.errno === 1050) {
                    results.skipped++;
                } else {
                    results.errors.push({ stmt: trimmed.slice(0, 80) + '…', error: err.message });
                }
            }
        }

        res.json({
            message: 'Schema run complete',
            ...results,
            note: results.errors.length
                ? 'Some statements failed — check errors array'
                : 'All statements executed successfully',
        });
    } finally {
        conn.release();
    }
};

// ─── FULL DB DUMP (schema + data, phpMyAdmin-style) ─────────────────────────

// Escape a JS value into a safe SQL literal
const toSqlLiteral = (v) => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number')  return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (v instanceof Date)
        return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (Buffer.isBuffer(v)) return `0x${v.toString('hex')}`;
    return `'${String(v)
        .replace(/\\/g, '\\\\')
        .replace(/'/g,  "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\0/g, '\\0')}'`;
};

// GET /api/superadmin/db/export
const exportFullDB = async (_req, res) => {
    try {
        const [tables] = await mysql.query('SHOW TABLES');
        if (!tables.length) return res.status(400).json({ message: 'No tables found' });
        const tableKey = Object.keys(tables[0])[0];

        const date     = new Date().toISOString().slice(0, 10);
        const filename = `kagzso_db_${date}.sql`;
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const out = (line) => res.write(line + '\n');

        out(`-- ============================================================`);
        out(`-- Kagzso POS — Full Database Dump`);
        out(`-- Exported: ${new Date().toISOString()}`);
        out(`-- ============================================================`);
        out('');
        out('SET FOREIGN_KEY_CHECKS = 0;');
        out('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
        out('SET time_zone = "+00:00";');
        out('');

        for (const row of tables) {
            const t = row[tableKey];
            out(`-- --------------------------------------------------------`);
            out(`-- Table: \`${t}\``);
            out(`-- --------------------------------------------------------`);
            out('');

            // Structure
            const [[cr]] = await mysql.query(`SHOW CREATE TABLE \`${t}\``);
            const ddl = cr['Create Table'].replace(
                /^CREATE TABLE `/,
                'CREATE TABLE IF NOT EXISTS `'
            );
            out(`${ddl};`);
            out('');

            // Data — stream 200 rows at a time to avoid memory spikes
            const [dataRows] = await mysql.query(`SELECT * FROM \`${t}\``);
            if (dataRows.length > 0) {
                const cols = Object.keys(dataRows[0]).map((c) => `\`${c}\``).join(', ');
                const CHUNK = 200;
                for (let i = 0; i < dataRows.length; i += CHUNK) {
                    const vals = dataRows.slice(i, i + CHUNK)
                        .map((r) => `(${Object.values(r).map(toSqlLiteral).join(', ')})`)
                        .join(',\n');
                    out(`INSERT IGNORE INTO \`${t}\` (${cols}) VALUES`);
                    out(`${vals};`);
                }
                out('');
            }
        }

        out('SET FOREIGN_KEY_CHECKS = 1;');
        res.end();
    } catch (error) {
        console.error('[FullDBExport]', error);
        if (!res.headersSent) res.status(500).json({ message: error.message });
        else res.end();
    }
};

// POST /api/superadmin/db/import
const importFullDB = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'SQL file is required' });

    const sql = req.file.buffer.toString('utf8');

    // Create a one-off connection with multipleStatements so the whole dump
    // can be executed in a single call (same as phpMyAdmin behaviour)
    const mysql2 = require('mysql2/promise');
    const conn   = await mysql2.createConnection({
        host:               process.env.MYSQL_HOST,
        port:               parseInt(process.env.MYSQL_PORT || '3306'),
        user:               process.env.MYSQL_USER,
        password:           process.env.MYSQL_PASSWORD,
        database:           process.env.MYSQL_DATABASE,
        multipleStatements: true,
        charset:            'utf8mb4',
        ssl:                { rejectUnauthorized: false },
    });

    try {
        await conn.query(sql);
        res.json({ message: 'Database imported successfully', size: `${(req.file.size / 1024).toFixed(1)} KB` });
    } catch (error) {
        console.error('[FullDBImport]', error);
        res.status(500).json({
            message: error.message,
            hint:    'Check that the .sql file is a valid MySQL dump',
        });
    } finally {
        await conn.end();
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
};
