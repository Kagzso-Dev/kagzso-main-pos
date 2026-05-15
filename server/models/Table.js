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

    async findById(id, tenantId) {
        try {
            const query = tenantId 
                ? 'SELECT * FROM tables WHERE id = ? AND tenant_id = ? LIMIT 1'
                : 'SELECT * FROM tables WHERE id = ? LIMIT 1';
            const params = tenantId ? [id, tenantId] : [id];
            const [rows] = await mysql.query(query, params);
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
        return this.findById(id, tenantId);
    },

    async updateById(id, updates, tenantId) {
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
            if (fieldMap[key]) {
                const col = fieldMap[key];
                updateKeys.push(`\`${col}\` = ?`);
                updateValues.push(val === undefined ? null : val);
            }
        }
        if (updateKeys.length === 0) return this.findById(id, tenantId);
        const whereClause = tenantId ? 'WHERE id = ? AND tenant_id = ?' : 'WHERE id = ?';
        updateValues.push(id);
        if (tenantId) updateValues.push(tenantId);
        await mysql.query(`UPDATE tables SET ${updateKeys.join(', ')} ${whereClause}`, updateValues);
        return this.findById(id, tenantId);
    },

    async atomicReserve(id, lockedBy, tenantId) {
        try {
            const query = tenantId 
                ? 'SELECT * FROM tables WHERE id = ? AND tenant_id = ? AND status = "available" LIMIT 1'
                : 'SELECT * FROM tables WHERE id = ? AND status = "available" LIMIT 1';
            const params = tenantId ? [id, tenantId] : [id];
            const [rows] = await mysql.query(query, params);
            if (!rows.length) return null;
            const mySqlDate = toSqlDate();
            const updateQuery = tenantId
                ? 'UPDATE tables SET status = "reserved", locked_by = ?, reserved_at = ? WHERE id = ? AND tenant_id = ?'
                : 'UPDATE tables SET status = "reserved", locked_by = ?, reserved_at = ? WHERE id = ?';
            const updateParams = tenantId ? [lockedBy, mySqlDate, id, tenantId] : [lockedBy, mySqlDate, id];
            await mysql.query(updateQuery, updateParams);
            return this.findById(id, tenantId);
        } catch (error) {
            console.error('[Table.atomicReserve] Error:', error.message);
            return null;
        }
    },

    async deleteById(id, tenantId) {
        if (tenantId) {
            await mysql.query('DELETE FROM tables WHERE id = ? AND tenant_id = ?', [id, tenantId]);
        } else {
            await mysql.query('DELETE FROM tables WHERE id = ?', [id]);
        }
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
