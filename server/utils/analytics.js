const mysql = require('../config/mysql');
const crypto = require('crypto');

// Debounce handle — collapses bursts of mutations into one aggregation pass
let _debounceTimer = null;

/**
 * Recalculates and updates the daily_analytics table for the current date.
 * Debounced: multiple calls within 10 s are collapsed into a single MySQL query.
 */
const updateDailyAnalytics = () => {
    if (_debounceTimer) return; // already scheduled
    _debounceTimer = setTimeout(async () => {
        _debounceTimer = null;
        await _runUpdate();
    }, 10_000);
};

const _runUpdate = async () => {
    try {
        const now = new Date();
        const isoDate = now.toISOString().slice(0, 10);
        const startOfDay = `${isoDate} 00:00:00`;
        const endOfDay   = `${isoDate} 23:59:59`;

        // Fetch all orders for today
        const [orders] = await mysql.query(
            'SELECT * FROM orders WHERE created_at BETWEEN ? AND ?',
            [startOfDay, endOfDay]
        );

        const stats = {
            total_orders: orders.length,
            completed_orders: 0,
            cancelled_orders: 0,
            revenue: 0,
            dine_in_orders: 0,
            takeaway_orders: 0,
            avg_order_value: 0
        };

        orders.forEach(order => {
            if (order.order_status === 'completed') stats.completed_orders++;
            if (order.order_status === 'cancelled') stats.cancelled_orders++;
            if (order.payment_status === 'paid')    stats.revenue += parseFloat(order.final_amount || 0);
            if (order.order_type === 'dine-in')     stats.dine_in_orders++;
            else if (order.order_type === 'takeaway') stats.takeaway_orders++;
        });

        if (stats.completed_orders > 0) {
            stats.avg_order_value = stats.revenue / stats.completed_orders;
        } else if (stats.total_orders > 0) {
            stats.avg_order_value = stats.revenue / stats.total_orders;
        }

        stats.revenue = Math.round(stats.revenue * 100) / 100;
        stats.avg_order_value = Math.round(stats.avg_order_value * 100) / 100;

        // Find if a record for today already exists
        const [existing] = await mysql.query('SELECT id FROM daily_analytics WHERE date = ? LIMIT 1', [isoDate]);

        if (existing.length > 0) {
            await mysql.query(
                `UPDATE daily_analytics SET total_orders=?, completed_orders=?, cancelled_orders=?, revenue=?, avg_order_value=?, dine_in_orders=?, takeaway_orders=? WHERE id=?`,
                [stats.total_orders, stats.completed_orders, stats.cancelled_orders, stats.revenue, stats.avg_order_value, stats.dine_in_orders, stats.takeaway_orders, existing[0].id]
            );
        } else {
            const id = crypto.randomUUID();
            await mysql.query(
                `INSERT INTO daily_analytics (id, date, total_orders, completed_orders, cancelled_orders, revenue, avg_order_value, dine_in_orders, takeaway_orders) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, isoDate, stats.total_orders, stats.completed_orders, stats.cancelled_orders, stats.revenue, stats.avg_order_value, stats.dine_in_orders, stats.takeaway_orders]
            );
        }
    } catch (error) {
        console.error('[Analytics] Failed to update daily analytics:', error.message);
    }
};

module.exports = { updateDailyAnalytics };
