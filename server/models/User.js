const mysql = require('../config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const fmt = (row) => row ? {
    _id:          row.id,
    username:     row.username,
    password:     row.password_hash,
    name:         row.name || null,
    role:         row.role,
    tenantId:     row.tenant_id || null,
    image:        row.image || null,
    isVerified:   row.is_verified === 1,
    lastLoginAt:  row.last_login_at || null,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
} : null;

const User = {
    async findOne({ username }) {
        const [rows] = await mysql.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
        return fmt(rows[0]);
    },

    async findById(id, excludePassword = false) {
        try {
            const [rows] = await mysql.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
            const formatted = fmt(rows[0]);
            if (excludePassword && formatted) {
                delete formatted.password;
            }
            return formatted;
        } catch (error) {
            return null;
        }
    },

    async findByRole(role) {
        const [rows] = await mysql.query('SELECT * FROM users WHERE role = ? ORDER BY id ASC', [role]);
        return rows.map(fmt);
    },

    async usernameExists(username) {
        const [rows] = await mysql.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
        return rows.length > 0;
    },

    async create({ username, password, role, name, image, tenantId }) {
        const salt   = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        const id = crypto.randomUUID();

        // superadmin is a system-level user with no tenant (tenantId stays null)
        const resolvedTenantId = (role === 'superadmin') ? null : (tenantId || 1);

        await mysql.query(
            'INSERT INTO users (id, username, password_hash, role, name, image, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, username, hashed, role, name || null, image || null, 0, resolvedTenantId]
        );
        return { _id: id, username, role, name: name || null, tenantId: resolvedTenantId };
    },

    async updatePassword(id, newPassword) {
        const salt   = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);
        await mysql.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, id]);
    },
};

module.exports = User;
