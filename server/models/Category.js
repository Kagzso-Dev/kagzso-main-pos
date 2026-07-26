const mysql = require('../config/mysql');
const crypto = require('crypto');

const fmt = (row) => row ? {
    _id:         row.id,
    name:        row.name,
    description: row.description,
    color:       row.color,
    status:      row.status,
    isActive:    row.is_active === 1,
    image:       row.image || null,
    tenantId:    row.tenant_id || null,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
} : null;

const Category = {
    async findAll(tenantId) {
        const [rows] = tenantId
            ? await mysql.query('SELECT * FROM categories WHERE tenant_id = ? ORDER BY name ASC', [tenantId])
            : await mysql.query('SELECT * FROM categories ORDER BY name ASC');
        return rows.map(fmt);
    },

    async findActive(tenantId) {
        const [rows] = tenantId
            ? await mysql.query('SELECT * FROM categories WHERE is_active = 1 AND tenant_id = ? ORDER BY name ASC', [tenantId])
            : await mysql.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC');
        return rows.map(fmt);
    },

    async findById(id, tenantId) {
        try {
            const [rows] = tenantId
                ? await mysql.query('SELECT * FROM categories WHERE id = ? AND tenant_id = ? LIMIT 1', [id, tenantId])
                : await mysql.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [id]);
            return fmt(rows[0]);
        } catch (error) {
            return null;
        }
    },

    async create({ name, description, color, image, tenantId, isActive }) {
        const id = crypto.randomUUID();
        await mysql.query(
            'INSERT INTO categories (id, name, description, color, image, status, is_active, tenant_id) VALUES (?, ?, ?, ?, ?, "active", ?, ?)',
            [id, name, description || null, color || '#f97316', image || null, isActive !== false ? 1 : 0, tenantId || null]
        );
        return this.findById(id);
    },

    async updateById(id, updates, tenantId) {
        const allowed = ['name', 'description', 'color', 'status', 'image', 'isActive'];
        const fieldMap = {
            name: 'name',
            description: 'description',
            color: 'color',
            status: 'status',
            image: 'image',
            isActive: 'is_active'
        };
        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(updates)) {
            if (allowed.includes(key)) {
                updateKeys.push(`\`${fieldMap[key]}\` = ?`);
                updateValues.push(key === 'isActive' ? (val ? 1 : 0) : val);
            }
        }

        if (updateKeys.length === 0) return this.findById(id, tenantId);

        const whereClause = tenantId ? 'WHERE id = ? AND tenant_id = ?' : 'WHERE id = ?';
        updateValues.push(id);
        if (tenantId) updateValues.push(tenantId);

        await mysql.query(`UPDATE categories SET ${updateKeys.join(', ')} ${whereClause}`, updateValues);
        return this.findById(id, tenantId);
    },

    async deleteById(id, tenantId) {
        if (tenantId) {
            await mysql.query('DELETE FROM categories WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        } else {
            await mysql.query('DELETE FROM categories WHERE id = ?', [id]);
        }
    },
};

module.exports = Category;
