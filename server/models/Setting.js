const mysql = require('../config/mysql');

const fmt = (row) => row ? {
    _id:               row.id,
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
    dineInEnabled:     row.dine_in_enabled !== 0, 
    tableMapEnabled:    row.table_map_enabled !== 0,
    takeawayEnabled:    row.takeaway_enabled !== 0,
    waiterServiceEnabled: row.waiter_service_enabled !== 0,
    enforceMenuView:    row.enforce_menu_view === 1,
    cashierOfferEnabled: row.cashier_offer_enabled === 1,
    cashierOfferLabel:   row.cashier_offer_label || '',
    cashierOfferDiscount: parseFloat(row.cashier_offer_discount || 0),
    cashierQrUploadEnabled: row.cashier_qr_upload_enabled !== 0,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
} : null;

const Setting = {
    async get() {
        const [rows] = await mysql.query('SELECT * FROM settings LIMIT 1');
        if (rows[0]) return fmt(rows[0]);

        // Default settings
        const defaultSettings = {
            restaurant_name: 'KAGSZO',
            address: '',
            currency: 'INR',
            currency_symbol: '₹',
            tax_rate: 5.0,
            gst_number: '',
        };
        await mysql.query('INSERT INTO settings (restaurant_name, address, currency, currency_symbol, tax_rate, gst_number) VALUES (?, ?, ?, ?, ?, ?)', 
            [defaultSettings.restaurant_name, defaultSettings.address, defaultSettings.currency, defaultSettings.currency_symbol, defaultSettings.tax_rate, defaultSettings.gst_number]);
        
        return this.get();
    },

    async update(params) {
        const fieldMap = {
            restaurantName: 'restaurant_name',
            address: 'address',
            currency: 'currency',
            currencySymbol: 'currency_symbol',
            taxRate: 'tax_rate',
            sgst: 'sgst',
            cgst: 'cgst',
            gstNumber: 'gst_number',
            pendingColor: 'pending_color',
            acceptedColor: 'accepted_color',
            preparingColor: 'preparing_color',
            readyColor: 'ready_color',
            paymentColor: 'payment_color',
            dashboardView: 'dashboard_view',
            menuView: 'menu_view',
            mobileMenuView: 'mobile_menu_view',
            dineInEnabled: 'dine_in_enabled',
            tableMapEnabled: 'table_map_enabled',
            takeawayEnabled: 'takeaway_enabled',
            waiterServiceEnabled: 'waiter_service_enabled',
            enforceMenuView: 'enforce_menu_view',
            cashierOfferEnabled: 'cashier_offer_enabled',
            cashierOfferLabel: 'cashier_offer_label',
            cashierOfferDiscount: 'cashier_offer_discount',
            cashierQrUploadEnabled: 'cashier_qr_upload_enabled',
            standardQrUrl: 'standard_qr_url',
            secondaryQrUrl: 'secondary_qr_url',
            standardQrFileId: 'standard_qr_file_id',
            secondaryQrFileId: 'secondary_qr_file_id'
        };

        const current = await this.get();
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
        return this.get();
    },

    async updateQr({ type, fileId, url }) {
        const data = {};
        if (type === 'standard') {
            data.standardQrFileId = fileId;
            data.standardQrUrl     = url;
        } else {
            data.secondaryQrFileId = fileId;
            data.secondaryQrUrl     = url;
        }
        return this.update(data);
    }
};

module.exports = Setting;
