const mysql = require('../config/mysql');

const fmt = (row) => row ? {
    _id:          row.id,
    name:         row.name,
    slug:         row.slug,
    plan:         row.plan,
    isActive:     row.is_active === 1,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
} : null;

const Tenant = {
    // List all restaurants with user + order counts
    async findAll() {
        const [rows] = await mysql.query(`
            SELECT r.*,
                   COUNT(DISTINCT u.id)  AS user_count,
                   COUNT(DISTINCT o.id)  AS order_count
            FROM restaurants r
            LEFT JOIN users u ON u.tenant_id = r.id
            LEFT JOIN \`orders\` o ON o.tenant_id = r.id
            GROUP BY r.id
            ORDER BY r.id ASC
        `);
        return rows.map((row) => ({
            ...fmt(row),
            userCount:  parseInt(row.user_count  || 0),
            orderCount: parseInt(row.order_count || 0),
        }));
    },

    // Single restaurant detail with counts
    async findById(id) {
        const [rows] = await mysql.query(`
            SELECT r.*,
                   COUNT(DISTINCT u.id)  AS user_count,
                   COUNT(DISTINCT o.id)  AS order_count
            FROM restaurants r
            LEFT JOIN users u ON u.tenant_id = r.id
            LEFT JOIN \`orders\` o ON o.tenant_id = r.id
            WHERE r.id = ?
            GROUP BY r.id
            LIMIT 1
        `, [id]);
        if (!rows[0]) return null;
        return { ...fmt(rows[0]), userCount: parseInt(rows[0].user_count || 0), orderCount: parseInt(rows[0].order_count || 0) };
    },

    // Create restaurant + config row
    async create({ name, slug, plan }) {
        const [result] = await mysql.query(
            'INSERT INTO restaurants (name, slug, plan) VALUES (?, ?, ?)',
            [name, slug.toLowerCase(), plan || 'trial']
        );
        const id = result.insertId;
        await mysql.query(
            'INSERT INTO restaurants_config (tenant_id, table_count, enabled_modules) VALUES (?, ?, ?)',
            [id, 10, JSON.stringify(['orders', 'kot', 'billing'])]
        );
        return Tenant.findById(id);
    },

    // Update name / slug / plan / is_active
    async update(id, fields) {
        const allowed = ['name', 'slug', 'plan', 'is_active'];
        const sets = [];
        const vals = [];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                sets.push(`${key} = ?`);
                vals.push(fields[key]);
            }
        }
        if (sets.length === 0) return Tenant.findById(id);
        vals.push(id);
        await mysql.query(`UPDATE restaurants SET ${sets.join(', ')} WHERE id = ?`, vals);
        return Tenant.findById(id);
    },

    // Toggle is_active
    async toggleStatus(id) {
        await mysql.query('UPDATE restaurants SET is_active = NOT is_active WHERE id = ?', [id]);
        return Tenant.findById(id);
    },

    // Safe cascade delete — refuses to delete tenant 1 (flagship)
    async deleteCascade(id) {
        if (parseInt(id) === 1) {
            throw new Error('Cannot delete the primary restaurant (id=1)');
        }
        const conn = await mysql.getConnection();
        await conn.beginTransaction();
        try {
            // Delete in FK-safe order
            await conn.query('DELETE FROM payment_audits WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM payments WHERE tenant_id = ?', [id]);
            // order_items cascade with orders if FK is set; delete order_items first to be safe
            const [orders] = await conn.query('SELECT id FROM `orders` WHERE tenant_id = ?', [id]);
            if (orders.length > 0) {
                const orderIds = orders.map((o) => o.id);
                await conn.query(`DELETE FROM order_items WHERE order_id IN (${orderIds.map(() => '?').join(',')})`, orderIds);
            }
            await conn.query('DELETE FROM `orders` WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM daily_analytics WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM tables WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM menu_items WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM categories WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM settings WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM counters WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM notifications WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM users WHERE tenant_id = ?', [id]);
            // restaurants_config FK cascades, but delete explicitly for safety
            await conn.query('DELETE FROM restaurants_config WHERE tenant_id = ?', [id]);
            await conn.query('DELETE FROM restaurants WHERE id = ?', [id]);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // Per-tenant stats (revenue, order counts by status)
    async getStats(id) {
        const [[counts]] = await mysql.query(`
            SELECT
                COUNT(*)                                        AS total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) AS total_revenue
            FROM \`orders\`
            WHERE tenant_id = ?
        `, [id]);

        const [[userCounts]] = await mysql.query(`
            SELECT
                COUNT(*) AS total_users,
                SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END) AS admins,
                SUM(CASE WHEN role = 'waiter'  THEN 1 ELSE 0 END) AS waiters,
                SUM(CASE WHEN role = 'kitchen' THEN 1 ELSE 0 END) AS kitchen,
                SUM(CASE WHEN role = 'cashier' THEN 1 ELSE 0 END) AS cashiers
            FROM users
            WHERE tenant_id = ?
        `, [id]);

        return {
            orders: {
                total:     parseInt(counts.total_orders     || 0),
                completed: parseInt(counts.completed_orders || 0),
                pending:   parseInt(counts.pending_orders   || 0),
            },
            revenue: parseFloat(counts.total_revenue || 0),
            staff:   {
                total:    parseInt(userCounts.total_users || 0),
                admins:   parseInt(userCounts.admins      || 0),
                waiters:  parseInt(userCounts.waiters     || 0),
                kitchen:  parseInt(userCounts.kitchen     || 0),
                cashiers: parseInt(userCounts.cashiers    || 0),
            },
        };
    },

    // System-wide aggregate stats
    async getSystemStats() {
        const [[totals]] = await mysql.query(`
            SELECT
                (SELECT COUNT(*) FROM restaurants)          AS total_restaurants,
                (SELECT COUNT(*) FROM restaurants WHERE is_active = 1) AS active_restaurants,
                (SELECT COUNT(*) FROM users WHERE tenant_id IS NOT NULL) AS total_staff,
                (SELECT COUNT(*) FROM \`orders\`)               AS total_orders,
                (SELECT SUM(total_amount) FROM \`orders\` WHERE payment_status = 'paid') AS total_revenue
        `);
        return {
            restaurants: {
                total:  parseInt(totals.total_restaurants  || 0),
                active: parseInt(totals.active_restaurants || 0),
            },
            staff:   parseInt(totals.total_staff    || 0),
            orders:  parseInt(totals.total_orders   || 0),
            revenue: parseFloat(totals.total_revenue || 0),
        };
    },
};

module.exports = Tenant;
