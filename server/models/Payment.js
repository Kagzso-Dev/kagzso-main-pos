const mysql = require('../config/mysql');
const crypto = require('crypto');

const fmt = (row, cashierRow = null) => row ? {
    _id:            row.id,
    orderId:        row.order_id,
    paymentMethod:  row.payment_method,
    amount:         parseFloat(row.amount),
    amountReceived: parseFloat(row.amount_received),
    change:         parseFloat(row.change_amount || row.change || 0),
    discount:       parseFloat(row.discount || 0),
    discountLabel:  row.discount_label || '',
    cashierId:      cashierRow
        ? { _id: cashierRow.id, username: cashierRow.username, role: cashierRow.role }
        : row.cashier_id,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
} : null;

const Payment = {
    async findByOrderId(orderId) {
        try {
            const [rows] = await mysql.query('SELECT * FROM payments WHERE order_id = ? LIMIT 1', [orderId]);
            return fmt(rows[0]);
        } catch (error) {
            return null;
        }
    },

    async findByOrderIdWithCashier(orderId) {
        try {
            const [rows] = await mysql.query('SELECT * FROM payments WHERE order_id = ? LIMIT 1', [orderId]);
            const row = rows[0];
            if (!row) return null;

            let cashierRow = null;
            if (row.cashier_id) {
                const [cashiers] = await mysql.query('SELECT * FROM users WHERE id = ? LIMIT 1', [row.cashier_id]);
                cashierRow = cashiers[0];
            }
            return fmt(row, cashierRow);
        } catch (error) {
            return null;
        }
    },

    async create({ orderId, paymentMethod, amount, amountReceived, changeAmount, cashierId, discount, discountLabel }) {
        const id = crypto.randomUUID();
        await mysql.query(
            `INSERT INTO payments (id, order_id, payment_method, amount, amount_received, change_amount, cashier_id, discount, discount_label) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, orderId, paymentMethod, parseFloat(amount), parseFloat(amountReceived || 0), parseFloat(changeAmount || 0), cashierId || null, parseFloat(discount || 0), discountLabel || null]
        );
        return this.findByOrderId(orderId);
    },
};

module.exports = Payment;
