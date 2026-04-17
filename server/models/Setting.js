const mysql = require('../config/mysql');

const fmt = (row) => row ? {
    _id:               row.id,
    tenantId:          row.tenant_id || null,
    restaurantName:    row.restaurant_name,
    address:           row.address || '',
    currency:          row.currency,
    currencySymbol:    row.currency_symbol,
    taxRate:           parseFloat(row.tax_rate),
    sgst:              parseFloat(row.sgst || 0),
    cgst:              parseFloat(row.cgst || 0),
    gstNumber:         row.gst_number,
    standardQrUrl:     row.standard_qr_url    || null,
    secondaryQrUrl:    row.secondary_qr_url   || null,
    standardQrFileId:  row.standard_qr_file_id  || null,
    secondaryQrFileId: row.secondary_qr_file_id || null,
    pendingColor:      row.pending_color    || '#3b82f6',
    acceptedColor:     row.accepted_color   || '#8b5cf6',
    preparingColor:    row.preparing_color  || '#f59e0b',
    readyColor:        row.ready_color      || '#10b981',
    paymentColor:      row.payment_color    || '#8b5cf6',
    dashboardView:     row.dashboard_view   || 'all',
    menuView:          row.menu_view        || 'grid',
    mobileMenuView:    row.mobile_menu_view || 'grid',
    dineInEnabled:        row.dine_in_enabled !== 0,
    tableMapEnabled:      row.table_map_enabled !== 0,
    takeawayEnabled:      row.takeaway_enabled !== 0,
    waiterServiceEnabled: row.waiter_service_enabled !== 0,
    enforceMenuView:      row.enforce_menu_view === 1,
    cashierOfferEnabled:  row.cashier_offer_enabled === 1,
    cashierOfferLabel:    row.cashier_offer_label || '',
    cashierOfferDiscount: parseFloat(row.cashier_offer_discount || 0),
    cashierQrUploadEnabled: row.cashier_qr_upload_enabled !== 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
} : null;

const fieldMap = {
    restaurantName:       'restaurant_name',
    address:              'address',
    currency:             'currency',
    currencySymbol:       'currency_symbol',
    taxRate:              'tax_rate',
    sgst:                 'sgst',
    cgst:                 'cgst',
    gstNumber:            'gst_number',
    pendingColor:         'pending_color',
    acceptedColor:        'accepted_color',
    preparingColor:       'preparing_color',
    readyColor:           'ready_color',
    paymentColor:         'payment_color',
    dashboardView:        'dashboard_view',
    menuView:             'menu_view',
    mobileMenuView:       'mobile_menu_view',
    dineInEnabled:        'dine_in_enabled',
    tableMapEnabled:      'table_map_enabled',
    takeawayEnabled:      'takeaway_enabled',
    waiterServiceEnabled: 'waiter_service_enabled',
    enforceMenuView:      'enforce_menu_view',
    cashierOfferEnabled:  'cashier_offer_enabled',
    cashierOfferLabel:    'cashier_offer_label',
    cashierOfferDiscount: 'cashier_offer_discount',
    cashierQrUploadEnabled: 'cashier_qr_upload_enabled',
    standardQrUrl:        'standard_qr_url',
    secondaryQrUrl:       'secondary_qr_url',
    standardQrFileId:     'standard_qr_file_id',
    secondaryQrFileId:    'secondary_qr_file_id',
};

const Setting = {
    async get(tenantId) {
        const [rows] = tenantId
            ? await mysql.query('SELECT * FROM settings WHERE tenant_id = ? LIMIT 1', [tenantId])
            : await mysql.query('SELECT * FROM settings LIMIT 1');

        if (rows[0]) return fmt(rows[0]);

        // Auto-create default settings row for this tenant
        await mysql.query(
            'INSERT INTO settings (tenant_id, restaurant_name, address, currency, currency_symbol, tax_rate, sgst, cgst, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tenantId || null, 'My Restaurant', '', 'INR', '₹', 0, 2.5, 2.5, '']
        );
        return this.get(tenantId);
    },

    async update(params, tenantId) {
        const current = await this.get(tenantId);
        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(params)) {
            const col = fieldMap[key] || key;
            if (val !== undefined) {
                updateKeys.push(`\`${col}\` = ?`);
                updateValues.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
            }
        }

        if (updateKeys.length > 0) {
            updateValues.push(current._id);
            await mysql.query(`UPDATE settings SET ${updateKeys.join(', ')} WHERE id = ?`, updateValues);
        }

        // Keep restaurants.name in sync when restaurantName changes
        if (params.restaurantName && tenantId) {
            await mysql.query(
                'UPDATE restaurants SET name = ? WHERE id = ?',
                [params.restaurantName, tenantId]
            );
        }

        return this.get(tenantId);
    },

    async updateQr({ type, fileId, url }, tenantId) {
        const data = {};
        if (type === 'standard') {
            data.standardQrFileId = fileId;
            data.standardQrUrl    = url;
        } else {
            data.secondaryQrFileId = fileId;
            data.secondaryQrUrl    = url;
        }
        return this.update(data, tenantId);
    },
};

module.exports = Setting;
