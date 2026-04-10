const mysql = require('../config/mysql');

/**
 * @desc    Calculate revenue growth (today vs yesterday)
 * @route   GET /api/dashboard/growth
 * @access  Private (admin only)
 */
const getGrowth = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const [todayRows] = await mysql.query(
            'SELECT final_amount FROM orders WHERE payment_status = "paid" AND DATE(created_at) = ?',
            [todayStr]
        );
        const [yesterdayRows] = await mysql.query(
            'SELECT final_amount FROM orders WHERE payment_status = "paid" AND DATE(created_at) = ?',
            [yesterdayStr]
        );

        const todayRevenue = todayRows.reduce((sum, r) => sum + parseFloat(r.final_amount || 0), 0);
        const yesterdayRevenue = yesterdayRows.reduce((sum, r) => sum + parseFloat(r.final_amount || 0), 0);

        let growth = 0;
        if (yesterdayRevenue === 0 && todayRevenue > 0) {
            growth = 100;
        } else if (yesterdayRevenue > 0) {
            growth = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        }

        res.json({
            growth: Math.round(growth * 10) / 10,
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            todayCount: todayRows.length,
            yesterdayCount: yesterdayRows.length,
            period: 'daily',
        });
    } catch (error) {
        console.error('[dashboardController] getGrowth error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get today's order stats
 * @route   GET /api/dashboard/stats
 * @access  Private (admin only)
 */
const getStats = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().slice(0, 10);

        const [todayRows] = await mysql.query('SELECT order_status, final_amount FROM orders WHERE DATE(created_at) = ?', [todayStr]);
        const [totalCountRow] = await mysql.query('SELECT COUNT(*) as total FROM orders');

        const activeStatuses = ['pending', 'accepted', 'preparing', 'ready'];
        let active = 0, completed = 0, cancelled = 0, revenue = 0;

        todayRows.forEach(row => {
            if (activeStatuses.includes(row.order_status)) active++;
            if (row.order_status === 'completed') {
                completed++;
                revenue += parseFloat(row.final_amount || 0);
            }
            if (row.order_status === 'cancelled') cancelled++;
        });

        res.json({
            today: { active, completed, cancelled, revenue },
            allTime: totalCountRow[0].total,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getGrowth, getStats };
