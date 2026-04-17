const mysql = require('../config/mysql');
const crypto = require('crypto');
const { toSqlDate } = require('../utils/dateUtils');

const fmt = (row) => {
    if (!row) return null;
    return {
        _id:                  row.id,
        number:               row.number,
        capacity:             row.capacity,
        status:               row.status,
        tenantId:             row.tenant_id || null,
        currentOrderId:       row.current_order_id || null,
        lockedBy:             row.locked_by || null,
        reservedAt:           row.reserved_at || null,
        reservationExpiresAt: row.reservation_expires_at || null,
        createdAt:            row.created_at,
        updatedAt:            row.updated_at,
    };
};

const Table = {
    async getTableMap(tenantId) {
        const all = await this.findAll(tenantId);
        const map = {};
        all.forEach(t => map[t._id] = t.number);
        return map;
    },

    clearMapCache() {
        // No-op — no cache layer on tables
    },

    async findAll(tenantId) {
        const [rows] = tenantId
            ? await mysql.query('SELECT * FROM tables WHERE tenant_id = ? ORDER BY number ASC', [tenantId])
            : await mysql.query('SELECT * FROM tables ORDER BY number ASC');
        return rows.map(fmt);
    },

    async findById(id) {
        try {
            const [rows] = await mysql.query('SELECT * FROM tables WHERE id = ? LIMIT 1', [id]);
            return fmt(rows[0]);
        } catch (error) {
            return null;
        }
    },

    async numberExists(number, tenantId) {
        const [rows] = tenantId
            ? await mysql.query('SELECT id FROM tables WHERE number = ? AND tenant_id = ? LIMIT 1', [number, tenantId])
            : await mysql.query('SELECT id FROM tables WHERE number = ? LIMIT 1', [number]);
        return rows.length > 0;
    },

    async create({ number, capacity, tenantId }) {
        const id = crypto.randomUUID();
        await mysql.query(
            'INSERT INTO tables (id, number, capacity, status, tenant_id) VALUES (?, ?, ?, "available", ?)',
            [id, String(number), parseInt(capacity), tenantId || null]
        );
        return this.findById(id);
    },

    async updateById(id, updates) {
        const fieldMap = {
            status:               'status',
            currentOrderId:       'current_order_id',
            lockedBy:             'locked_by',
            reservedAt:           'reserved_at',
            reservationExpiresAt: 'reservation_expires_at',
        };
        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(updates)) {
            const col = fieldMap[key] || key;
            updateKeys.push(`\`${col}\` = ?`);
            updateValues.push(val === undefined ? null : val);
        }

        if (updateKeys.length === 0) return this.findById(id);

        updateValues.push(id);
        await mysql.query(`UPDATE tables SET ${updateKeys.join(', ')} WHERE id = ?`, updateValues);
        return this.findById(id);
    },

    async atomicReserve(id, lockedBy) {
        try {
            const [rows] = await mysql.query('SELECT * FROM tables WHERE id = ? AND status = "available" LIMIT 1', [id]);
            if (!rows.length) return null;

            const mySqlDate = toSqlDate();
            await mysql.query(
                'UPDATE tables SET status = "reserved", locked_by = ?, reserved_at = ? WHERE id = ?',
                [lockedBy, mySqlDate, id]
            );
            return this.findById(id);
        } catch (error) {
            console.error('[Table.atomicReserve] Error:', error.message);
            return null;
        }
    },

    async deleteById(id) {
        await mysql.query('DELETE FROM tables WHERE id = ?', [id]);
    },

    async findExpiredReservations(cutoff) {
        const [rows] = await mysql.query(
            'SELECT * FROM tables WHERE status = "reserved" AND reserved_at < ? AND current_order_id IS NULL',
            [cutoff instanceof Date ? toSqlDate(cutoff) : cutoff]
        );
        return rows.map(fmt);
    },
};

module.exports = Table;
