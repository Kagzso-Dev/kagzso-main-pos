/**
 * dailyAnalytics.js (MySQL Only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility to aggregate order data from MySQL `orders` table and upsert
 * per-day snapshots into `daily_analytics`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mysql = require('../config/mysql');
const logger = require('./logger');
const crypto = require('crypto');

/**
 * Fetch all orders for a given UTC day.
 * @param {string} isoDate  - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
async function fetchOrdersForDate(isoDate) {
    const start = `${isoDate} 00:00:00`;
    const end   = `${isoDate} 23:59:59`;
    
    // In MySQL, created_at is a DATETIME column
    // We also select SUM(quantity) for all non-cancelled items in the order
    const [rows] = await mysql.query(
        `SELECT o.*, 
        COALESCE((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id AND status != "CANCELLED"), 0) as total_items
        FROM orders o 
        WHERE o.created_at BETWEEN ? AND ?`,
        [start, end]
    );
    return rows;
}

/**
 * Aggregate and upsert daily analytics for one specific date.
 * @param {string|Date|null} date  - 'YYYY-MM-DD', JS Date, or null for today
 * @returns {Promise<void>}
 */
async function refreshDailyAnalytics(date = null) {
    try {
        const isoDate = date
            ? (date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10))
            : new Date().toISOString().slice(0, 10);

        const orders = await fetchOrdersForDate(isoDate);

        let total_orders      = orders.length;
        let completed_orders  = 0;
        let cancelled_orders  = 0;
        let revenue           = 0;
        let dine_in_orders    = 0;
        let takeaway_orders   = 0;
        let dine_in_revenue   = 0;
        let takeaway_revenue  = 0;
        let total_tax         = 0;
        let total_discount    = 0;
        let items_sold        = 0;

        for (const o of orders) {
            if (o.order_status === 'completed')  completed_orders++;
            if (o.order_status === 'cancelled')  cancelled_orders++;
            
            // For revenue, tax, and discount, only count orders that were paid
            if (o.payment_status === 'paid') {
                const final = parseFloat(o.final_amount || 0);
                revenue += final;
                total_tax += (parseFloat(o.sgst || 0) + parseFloat(o.cgst || 0));
                total_discount += parseFloat(o.discount || 0);
                items_sold += parseInt(o.total_items || 0);

                if (o.order_type === 'dine-in') {
                    dine_in_revenue += final;
                } else if (o.order_type === 'takeaway') {
                    takeaway_revenue += final;
                }
            }

            if (o.order_type === 'dine-in')      dine_in_orders++;
            else if (o.order_type === 'takeaway') takeaway_orders++;
        }

        revenue = Math.round(revenue * 100) / 100;
        dine_in_revenue = Math.round(dine_in_revenue * 100) / 100;
        takeaway_revenue = Math.round(takeaway_revenue * 100) / 100;
        total_tax = Math.round(total_tax * 100) / 100;
        total_discount = Math.round(total_discount * 100) / 100;

        const denom = completed_orders || total_orders || 1;
        const avg_order_value = Math.round((revenue / denom) * 100) / 100;

        // Check for existing document in MySQL
        const [existing] = await mysql.query('SELECT id FROM daily_analytics WHERE date = ? LIMIT 1', [isoDate]);

        const payload = {
            total_orders,
            completed_orders,
            cancelled_orders,
            revenue,
            avg_order_value,
            dine_in_orders,
            takeaway_orders,
            dine_in_revenue,
            takeaway_revenue,
            total_tax,
            total_discount,
            items_sold
        };

        if (existing.length > 0) {
            const keys = Object.keys(payload);
            const updateArr = keys.map(k => `\`${k}\` = ?`).join(', ');
            await mysql.query(
                `UPDATE daily_analytics SET ${updateArr} WHERE id=?`,
                [...Object.values(payload), existing[0].id]
            );
        } else {
            const id = crypto.randomUUID();
            const keys = ['id', 'date', ...Object.keys(payload)];
            const placeholders = keys.map(() => '?').join(', ');
            await mysql.query(
                `INSERT INTO daily_analytics (${keys.join(', ')}) VALUES (${placeholders})`,
                [id, isoDate, ...Object.values(payload)]
            );
        }

        logger.debug(`[dailyAnalytics] Refreshed ${isoDate} — revenue: ${revenue}, items: ${items_sold}`);
    } catch (err) {
        console.error('[dailyAnalytics] refreshDailyAnalytics failed:', err.message);
    }
}

/**
 * Backfill `daily_analytics` for all dates that have orders but no analytics
 * row yet (or all dates if `forceAll` is true). Run on server startup.
 *
 * @param {boolean} forceAll
 * @returns {Promise<{processed: number, skipped: number}>}
 */
async function backfillDailyAnalytics(forceAll = false) {
    try {
        logger.debug(`[dailyAnalytics] Starting backfill (forceAll=${forceAll})…`);

        // Get existing analytics dates
        const [analyticsRows] = await mysql.query('SELECT date FROM daily_analytics');
        const existingDates = new Set(analyticsRows.map(r => r.date.toString().slice(0, 10)));

        // Discover all distinct order dates
        const [orderDateRows] = await mysql.query('SELECT DISTINCT DATE(created_at) as order_date FROM orders');
        const orderDates = new Set(orderDateRows.map(r => r.order_date.toISOString().slice(0, 10)));

        if (!orderDates.size) {
            logger.debug('[dailyAnalytics] No orders found — backfill skipped.');
            return { processed: 0, skipped: 0 };
        }

        let processed = 0;
        let skipped = 0;

        for (const isoDate of [...orderDates].sort()) {
            if (!forceAll && existingDates.has(isoDate)) {
                skipped++;
                continue;
            }
            await refreshDailyAnalytics(isoDate);
            processed++;
        }

        logger.debug(`[dailyAnalytics] Backfill complete — processed: ${processed}, skipped: ${skipped}`);
        return { processed, skipped };
    } catch (err) {
        console.error('[dailyAnalytics] backfillDailyAnalytics failed:', err.message);
        return { processed: 0, skipped: 0 };
    }
}

module.exports = { refreshDailyAnalytics, backfillDailyAnalytics };
