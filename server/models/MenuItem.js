const mysql = require('../config/mysql');
const crypto = require('crypto');

const fmt = (row, catDoc = null) => {
    if (!row) return null;
    return {
        _id:          row.id,
        name:         row.name,
        description:  row.description,
        price:        parseFloat(row.price),
        category:     catDoc
            ? { _id: catDoc.id, name: catDoc.name, color: catDoc.color, status: catDoc.status, isActive: catDoc.is_active === 1 }
            : row.category_id,
        image:        row.image,
        availability: row.availability === 1,
        isActive:     row.is_active === 1,
        isVeg:        row.is_veg === 1,
        tenantId:     row.tenant_id || null,
        variants:     row.variants ? (typeof row.variants === 'string' ? JSON.parse(row.variants) : row.variants) : [],
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
    };
};

const MenuItem = {
    async findAll(tenantId) {
        const [itemsResp] = tenantId
            ? await mysql.query('SELECT * FROM menu_items WHERE tenant_id = ? ORDER BY name ASC', [tenantId])
            : await mysql.query('SELECT * FROM menu_items ORDER BY name ASC');

        const [catsResp] = tenantId
            ? await mysql.query('SELECT * FROM categories WHERE tenant_id = ?', [tenantId])
            : await mysql.query('SELECT * FROM categories');

        const catMap = {};
        catsResp.forEach(c => catMap[c.id] = c);
        return itemsResp.map(item => fmt(item, catMap[item.category_id]));
    },

    async findAvailable(tenantId) {
        const query = `
            SELECT m.*, c.name as cat_name, c.color as cat_color, c.status as cat_status, c.is_active as cat_is_active
            FROM menu_items m
            JOIN categories c ON m.category_id = c.id
            WHERE m.is_active = 1 
              AND c.is_active = 1
              ${tenantId ? 'AND m.tenant_id = ? AND c.tenant_id = ?' : ''}
            ORDER BY m.name ASC
        `;
        const [rows] = tenantId ? await mysql.query(query, [tenantId, tenantId]) : await mysql.query(query);

        return rows.map(row => fmt(row, {
            id: row.category_id,
            name: row.cat_name,
            color: row.cat_color,
            status: row.cat_status,
            is_active: row.cat_is_active
        }));
    },

    async findById(id, tenantId) {
        try {
            const [items] = tenantId
                ? await mysql.query('SELECT * FROM menu_items WHERE id = ? AND tenant_id = ? LIMIT 1', [id, tenantId])
                : await mysql.query('SELECT * FROM menu_items WHERE id = ? LIMIT 1', [id]);
            const item = items[0];
            if (!item) return null;

            let catDoc = null;
            if (item.category_id) {
                const [cats] = await mysql.query('SELECT * FROM categories WHERE id = ? LIMIT 1', [item.category_id]);
                catDoc = cats[0];
            }
            return fmt(item, catDoc);
        } catch (error) {
            return null;
        }
    },

    async create({ name, description, price, category, image, isVeg, availability, isActive, variants, tenantId }) {
        const id = crypto.randomUUID();
        await mysql.query(
            'INSERT INTO menu_items (id, name, description, price, category_id, image, availability, is_active, is_veg, variants, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, description || null, parseFloat(price), category, image || null, availability !== false ? 1 : 0, isActive !== false ? 1 : 0, isVeg !== false ? 1 : 0, variants?.length ? JSON.stringify(variants) : null, tenantId || null]
        );
        return this.findById(id);
    },

    async updateById(id, updates, tenantId) {
        const fieldMap = {
            name:         'name',
            description:  'description',
            price:        'price',
            category:     'category_id',
            image:        'image',
            availability: 'availability',
            isActive:     'is_active',
            isVeg:        'is_veg',
            variants:     'variants',
        };
        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(updates)) {
            if (key in fieldMap) {
                const col = fieldMap[key];
                if (col === 'price' && val !== undefined) {
                    updateValues.push(parseFloat(val));
                } else if (key === 'variants' && val !== undefined) {
                    updateValues.push(val?.length ? JSON.stringify(val) : null);
                } else if (key === 'availability' || key === 'isVeg' || key === 'isActive') {
                    updateValues.push(val ? 1 : 0);
                } else {
                    updateValues.push(val);
                }
                updateKeys.push(`\`${col}\` = ?`);
            }
        }

        if (updateKeys.length === 0) return this.findById(id, tenantId);

        const whereClause = tenantId ? 'WHERE id = ? AND tenant_id = ?' : 'WHERE id = ?';
        updateValues.push(id);
        if (tenantId) updateValues.push(tenantId);

        await mysql.query(`UPDATE menu_items SET ${updateKeys.join(', ')} ${whereClause}`, updateValues);
        return this.findById(id, tenantId);
    },

    async deleteById(id, tenantId) {
        if (tenantId) {
            await mysql.query('DELETE FROM menu_items WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        } else {
            await mysql.query('DELETE FROM menu_items WHERE id = ?', [id]);
        }
    },

    async validateBatch(ids, tenantId) {
        if (!ids || ids.length === 0) return [];
        const query = `
            SELECT m.id, m.name, m.is_active, c.is_active as cat_is_active
            FROM menu_items m
            JOIN categories c ON m.category_id = c.id
            WHERE m.id IN (?) 
              ${tenantId ? 'AND m.tenant_id = ? AND c.tenant_id = ?' : ''}
        `;
        const [rows] = tenantId 
            ? await mysql.query(query, [ids, tenantId, tenantId])
            : await mysql.query(query, [ids]);
        
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            isActive: r.is_active === 1 && r.cat_is_active === 1
        }));
    },
};

module.exports = MenuItem;
