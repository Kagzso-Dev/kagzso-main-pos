const mysql = require('../config/mysql');
const crypto = require('crypto');

/**
 * PaymentAudit — append-only audit trail for all payment lifecycle events (MySQL Only).
 */
const PaymentAudit = {
    async create({
        orderId,
        paymentId,
        action,
        status,
        amount,
        paymentMethod,
        performedBy,
        performedByRole,
        ipAddress,
        userAgent,
        errorMessage,
        errorCode,
        metadata,
    }) {
        try {
            const id = crypto.randomUUID();
            await mysql.query(
                `INSERT INTO payment_audits (
                    id, order_id, payment_id, action, status, amount, payment_method, 
                    performed_by, performed_by_role, ip_address, user_agent, 
                    error_message, error_code, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    orderId || null,
                    paymentId || null,
                    action,
                    status,
                    amount ? parseFloat(amount) : null,
                    paymentMethod || null,
                    performedBy || null,
                    performedByRole || null,
                    ipAddress || null,
                    userAgent || null,
                    errorMessage || null,
                    errorCode || null,
                    metadata ? JSON.stringify(metadata) : null
                ]
            );
        } catch (error) {
            console.error('PaymentAudit creation failed:', error);
            // We usually don't want to throw here to avoid breaking the main payment flow
        }
    },
};

module.exports = PaymentAudit;
