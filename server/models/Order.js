const mysql = require('../config/mysql');
const crypto = require('crypto');
const Counter = require('./Counter');

const fmtItem = (row) => ({
    _id: row.id,
    menuItemId: row.menu_item_id,
    name: row.name,
    price: parseFloat(row.price),
    quantity: row.quantity,
    notes: row.notes,
    variant: row.variant ? (typeof row.variant === 'string' ? JSON.parse(row.variant) : row.variant) : null,
    status: row.status,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    cancelledAt: row.cancelled_at,
    isNewlyAdded: row.is_newly_added === 1,
    addedAt: row.created_at,
    createdAt: row.created_at,
});

const fmtOrder = (row, items = [], tableNum = null) => ({
    _id: row.id,
    orderNumber: row.order_number,
    tokenNumber: row.token_number,
    orderType: row.order_type,
    tableId: row.table_id
        ? { _id: row.table_id, number: tableNum || '?' }
        : null,
    customerInfo: { name: row.customer_name || null, phone: row.customer_phone || null },
    items,
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    kotStatus: row.kot_status,
    totalAmount: parseFloat(row.total_amount),
    sgst: parseFloat(row.sgst || 0),
    cgst: parseFloat(row.cgst || 0),
    discount: parseFloat(row.discount || 0),
    discountLabel: row.discount_label || '',
    finalAmount: parseFloat(row.final_amount),
    waiterId: row.waiter_id,
    tenantId: row.tenant_id || null,
    prepStartedAt: row.prep_started_at,
    isPartiallyReady: row.is_partially_ready === 1,
    readyAt: row.ready_at,
    completedAt: row.completed_at,
    paymentAt: row.payment_at,
    paidAt: row.paid_at,
    cancelledBy: row.cancelled_by,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const loadItems = async (orderId) => {
    const [rows] = await mysql.query('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC', [orderId]);
    return rows.map(fmtItem);
};

const Order = {
    async findById(id, tenantId) {
        try {
            const query = tenantId 
                ? 'SELECT * FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1'
                : 'SELECT * FROM orders WHERE id = ? LIMIT 1';
            const params = tenantId ? [id, tenantId] : [id];
            const [orders] = await mysql.query(query, params);
            const order = orders[0];
            if (!order) return null;

            let tableNum = null;
            if (order.table_id) {
                const [tables] = await mysql.query('SELECT number FROM tables WHERE id = ? LIMIT 1', [order.table_id]);
                if (tables[0]) tableNum = tables[0].number;
            }
            const items = await loadItems(id);
            return fmtOrder(order, items, tableNum);
        } catch (error) {
            return null;
        }
    },

    async find(filter = {}, { skip = 0, limit = 50 } = {}) {
        const { where, values } = buildWhereClause(filter);
        const query = `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const [rows] = await mysql.query(query, [...values, parseInt(limit), parseInt(skip)]);
        
        if (rows.length === 0) return [];

        const [itemsResp] = await mysql.query('SELECT * FROM order_items WHERE order_id IN (?)', [rows.map(r => r.id)]);
        const [tables] = await mysql.query('SELECT id, number FROM tables');
        const tableMap = {};
        tables.forEach(t => tableMap[t.id] = t.number);

        const itemsByOrderId = {};
        itemsResp.forEach(item => {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        });

        return rows.map(row => fmtOrder(row, itemsByOrderId[row.id] || [], tableMap[row.table_id]));
    },

    async count(filter = {}) {
        const { where, values } = buildWhereClause(filter);
        const [rows] = await mysql.query(`SELECT COUNT(*) as count FROM orders ${where}`, values);
        return rows[0].count;
    },

    async create(data) {
        const orderType = data.orderType || 'dine-in';
        const totalAmount = Number(data.totalAmount) || 0;
        const sgst = Number(data.sgst) || 0;
        const cgst = Number(data.cgst) || 0;
        const discount = Number(data.discount) || 0;
        let finalAmount = Number(data.finalAmount) || (totalAmount - discount + sgst + cgst);

        const seq = await Counter.getNextSequence('tokenNumber_global');
        const orderNumber = `ORD-${seq}`;
        const orderId = crypto.randomUUID();

        // 18 Columns — All validated against schema (DESCRIBE orders)
        const sql = `
            INSERT INTO orders (
                id, order_number, token_number, order_type, table_id,
                customer_name, customer_phone, total_amount, sgst, cgst,
                discount, final_amount, waiter_id, order_status, payment_status,
                payment_method, kot_status, tenant_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, 'Open', ?)
        `;

        const values = [
            orderId, orderNumber, seq, orderType, data.tableId || null,
            data.customerInfo?.name || null, data.customerInfo?.phone || null,
            totalAmount, sgst, cgst, discount, finalAmount, data.waiterId || null,
            data.paymentMethod || null, data.tenantId || null
        ];

        await mysql.query(sql, values);

        const itemInserts = (data.items || []).map(item => {
            const itemId = crypto.randomUUID();
            return mysql.query(
                `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, notes, variant, status, is_newly_added) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)`,
                [itemId, orderId, item.menuItemId || null, item.name || 'Item', parseFloat(item.price || 0), parseInt(item.quantity), item.notes || null, item.variant ? JSON.stringify(item.variant) : null]
            );
        });

        await Promise.all(itemInserts);
        return this.findById(orderId);
    },

    async updateById(id, updates, tenantId) {
        const fieldMap = {
            orderNumber: 'order_number',
            orderStatus: 'order_status',
            paymentStatus: 'payment_status',
            paymentMethod: 'payment_method',
            kotStatus: 'kot_status',
            totalAmount: 'total_amount',
            sgst: 'sgst',
            cgst: 'cgst',
            discount: 'discount',
            discountLabel: 'discount_label',
            finalAmount: 'final_amount',
            prepStartedAt: 'prep_started_at',
            readyAt: 'ready_at',
            completedAt: 'completed_at',
            paymentAt: 'payment_at',
            paidAt: 'paid_at',
            cancelledBy: 'cancelled_by',
            cancelReason: 'cancel_reason',
            isPartiallyReady: 'is_partially_ready',
        };

        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(updates)) {
            // CRITICAL: Only allow updates if the key exists in our validated fieldMap
            if (fieldMap[key]) {
                updateKeys.push(`\`${fieldMap[key]}\` = ?`);
                updateValues.push(val === undefined ? null : val);
            }
        }

        if (updateKeys.length === 0) return this.findById(id, tenantId);
        
        updateValues.push(id);
        const whereClause = tenantId ? 'WHERE id = ? AND tenant_id = ?' : 'WHERE id = ?';
        if (tenantId) updateValues.push(tenantId);

        const query = `UPDATE orders SET ${updateKeys.join(', ')} ${whereClause}`;
        await mysql.query(query, updateValues);
        return this.findById(id, tenantId);
    },

    async atomicPaymentStatusUpdate(id, fromStatus, toStatus, tenantId) {
        const query = tenantId 
            ? 'UPDATE orders SET payment_status = ? WHERE id = ? AND payment_status = ? AND tenant_id = ?'
            : 'UPDATE orders SET payment_status = ? WHERE id = ? AND payment_status = ?';
        const params = tenantId ? [toStatus, id, fromStatus, tenantId] : [toStatus, id, fromStatus];
        const [result] = await mysql.query(query, params);
        if (result.affectedRows === 0) return null;
        return this.findById(id, tenantId);
    },

    async updateItemStatus(orderId, itemId, status, tenantId) {
        // Validate ownership
        const order = await this.findById(orderId, tenantId);
        if (!order) throw new Error('Order not found or unauthorized');

        await mysql.query('UPDATE order_items SET status = ? WHERE id = ? AND order_id = ?', [status, itemId, orderId]);
        return this.findById(orderId, tenantId);
    },

    async cancelItem(orderId, itemId, { cancelledBy, cancelReason }, tenantId) {
        // Validate ownership
        const order = await this.findById(orderId, tenantId);
        if (!order) throw new Error('Order not found or unauthorized');

        await mysql.query(
            'UPDATE order_items SET status = "CANCELLED", cancelled_by = ?, cancel_reason = ?, cancelled_at = ? WHERE id = ? AND order_id = ?',
            [cancelledBy, cancelReason, new Date().toISOString().slice(0, 19).replace('T', ' '), itemId, orderId]
        );
        return this.findById(orderId, tenantId);
    },

    async addItems(orderId, items, { totalAmount, sgst, cgst, finalAmount }, tenantId) {
        const query = tenantId 
            ? 'SELECT * FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1'
            : 'SELECT * FROM orders WHERE id = ? LIMIT 1';
        const params = tenantId ? [orderId, tenantId] : [orderId];
        const [orders] = await mysql.query(query, params);
        
        const orderInfo = orders[0];
        if (!orderInfo || ['completed', 'cancelled'].includes(orderInfo.order_status)) {
            throw new Error(`Cannot add items to ${orderInfo?.order_status || 'missing'} order`);
        }

        const itemInserts = items.map(item => {
            const itemId = crypto.randomUUID();
            return mysql.query(
                `INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, notes, variant, status, is_newly_added) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 1)`,
                [itemId, orderId, item.menuItemId || null, item.name || 'Item', parseFloat(item.price), parseInt(item.quantity), item.notes || null, item.variant ? JSON.stringify(item.variant) : null]
            );
        });

        await Promise.all(itemInserts);

        // Recalculate totals - use settings from database for tax rates
        const [allRows] = await mysql.query('SELECT * FROM order_items WHERE order_id = ? AND status != "CANCELLED"', [orderId]);
        const subtotalSum = allRows.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity)), 0);
        
        // Get tax rates from settings for this tenant
        const [settingsRows] = tenantId 
            ? await mysql.query('SELECT sgst, cgst FROM settings WHERE tenant_id = ? LIMIT 1', [tenantId])
            : await mysql.query('SELECT sgst, cgst FROM settings LIMIT 1');
            
        const sgstRate = parseFloat(settingsRows[0]?.sgst || 0) / 100;
        const cgstRate = parseFloat(settingsRows[0]?.cgst || 0) / 100;
        
        const discValue = parseFloat(orderInfo.discount) || 0;
        const discountedSubtotal = Math.max(0, subtotalSum - discValue);

        const newTotalSgst = parseFloat((discountedSubtotal * sgstRate).toFixed(2));
        const newTotalCgst = parseFloat((discountedSubtotal * cgstRate).toFixed(2));
        const newFinal = parseFloat((discountedSubtotal + newTotalSgst + newTotalCgst).toFixed(2));

        const updateQuery = tenantId 
            ? 'UPDATE orders SET total_amount = ?, sgst = ?, cgst = ?, final_amount = ?, kot_status = "Open", order_status = "pending" WHERE id = ? AND tenant_id = ?'
            : 'UPDATE orders SET total_amount = ?, sgst = ?, cgst = ?, final_amount = ?, kot_status = "Open", order_status = "pending" WHERE id = ?';
        
        const updateParams = tenantId 
            ? [subtotalSum, newTotalSgst, newTotalCgst, newFinal, orderId, tenantId]
            : [subtotalSum, newTotalSgst, newTotalCgst, newFinal, orderId];

        await mysql.query(updateQuery, updateParams);
        return this.findById(orderId, tenantId);
    },
    async getItemById(orderId, itemId, tenantId) {
        const query = tenantId 
            ? 'SELECT oi.* FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.order_id = ? AND oi.id = ? AND o.tenant_id = ? LIMIT 1'
            : 'SELECT * FROM order_items WHERE order_id = ? AND id = ? LIMIT 1';
        const params = tenantId ? [orderId, itemId, tenantId] : [orderId, itemId];
        const [rows] = await mysql.query(query, params);
        if (!rows[0]) return null;
        return fmtItem(rows[0]);
    },

    async search(q, limit = 30, tenantId = null) {
        const pattern = `%${q}%`;
        const tenantClause = tenantId ? 'AND o.tenant_id = ?' : '';
        const query = `
            SELECT o.*
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            WHERE (o.order_number LIKE ?
               OR o.customer_name LIKE ?
               OR t.number LIKE ?)
               ${tenantClause}
            ORDER BY o.created_at DESC
            LIMIT ?
        `;
        const params = tenantId
            ? [pattern, pattern, pattern, tenantId, parseInt(limit)]
            : [pattern, pattern, pattern, parseInt(limit)];
        const [rows] = await mysql.query(query, params);
        
        if (rows.length === 0) return [];

        const orderIds = rows.map(r => r.id);
        const [itemsResp] = await mysql.query('SELECT * FROM order_items WHERE order_id IN (?)', [orderIds]);
        const itemsByOrderId = {};
        itemsResp.forEach(item => {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        });

        const [tables] = await mysql.query('SELECT id, number FROM tables');
        const tableMap = {};
        tables.forEach(t => tableMap[t.id] = t.number);

        return rows.map(row => fmtOrder(row, itemsByOrderId[row.id] || [], tableMap[row.table_id]));
    },
};

function buildWhereClause(filter) {
    const conditions = [];
    const values = [];

    if (filter.kotStatus) {
        if (typeof filter.kotStatus === 'object' && filter.kotStatus.$ne) {
            conditions.push('kot_status != ?');
            values.push(filter.kotStatus.$ne);
        } else {
            conditions.push('kot_status = ?');
            values.push(filter.kotStatus);
        }
    }

    if (filter.orderStatus) {
        if (typeof filter.orderStatus === 'object' && filter.orderStatus.$in) {
            conditions.push('order_status IN (?)');
            values.push(filter.orderStatus.$in);
        } else {
            conditions.push('order_status = ?');
            values.push(filter.orderStatus);
        }
    }

    if (filter.paymentStatus) {
        conditions.push('payment_status = ?');
        values.push(filter.paymentStatus);
    }

    if (filter.tenantId) {
        conditions.push('tenant_id = ?');
        values.push(filter.tenantId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, values };
}

module.exports = Order;
