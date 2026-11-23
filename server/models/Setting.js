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
    kitchenEnabled:       row.kitchen_enabled !== 0,
    gstEnabled:           row.gst_enabled !== 0,
    enforceMenuView:      row.enforce_menu_view === 1,
    cashierOfferEnabled:  row.cashier_offer_enabled === 1,
    cashierOfferLabel:    row.cashier_offer_label || '',
    cashierOfferDiscount: parseFloat(row.cashier_offer_discount || 0),
    cashierQrUploadEnabled: row.cashier_qr_upload_enabled !== 0,
    kotPrintEnabled:       row.kot_print_enabled !== 0,
    soundConfig: {
        kitchenEnabled: true,
        kitchenVolume: 0.8,
        kitchenSound: 'chime',
        waiterEnabled: true,
        waiterVolume: 0.6,
        waiterSound: 'ting',
        ...(row.sound_config
            ? (typeof row.sound_config === 'string' ? JSON.parse(row.sound_config) : row.sound_config)
            : {}),
    },
    orderStatusesConfig: row.order_statuses_config || {
        pending: true, accepted: true, preparing: true,
        ready: true, payment: true, completed: true, cancelled: true,
    },
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
    kitchenEnabled:       'kitchen_enabled',
    gstEnabled:           'gst_enabled',
    enforceMenuView:      'enforce_menu_view',
    cashierOfferEnabled:  'cashier_offer_enabled',
    cashierOfferLabel:    'cashier_offer_label',
    cashierOfferDiscount: 'cashier_offer_discount',
    cashierQrUploadEnabled: 'cashier_qr_upload_enabled',
    kotPrintEnabled:      'kot_print_enabled',
    soundConfig:          'sound_config',
    orderStatusesConfig:  'order_statuses_config',
    standardQrUrl:        'standard_qr_url',
    secondaryQrUrl:       'secondary_qr_url',
    standardQrFileId:     'standard_qr_file_id',
    secondaryQrFileId:    'secondary_qr_file_id',
};

let _soundColChecked = false;
const ensureSoundConfigCol = async () => {
    if (_soundColChecked) return;
    try {
        const [cols] = await mysql.query('SHOW COLUMNS FROM settings LIKE "sound_config"');
        if (cols.length === 0) {
            await mysql.query('ALTER TABLE settings ADD COLUMN sound_config JSON');
        }
        _soundColChecked = true;
    } catch (e) {}
};

let _kitchenColChecked = false;
const ensureKitchenEnabledCol = async () => {
    if (_kitchenColChecked) return;
    try {
        const [cols] = await mysql.query('SHOW COLUMNS FROM settings LIKE "kitchen_enabled"');
        if (cols.length === 0) {
            await mysql.query('ALTER TABLE settings ADD COLUMN kitchen_enabled BOOLEAN DEFAULT 1');
            console.log('[migration] Added kitchen_enabled column to settings');
        }
        _kitchenColChecked = true;
    } catch (e) {}
};

let _gstColChecked = false;
const ensureGstEnabledCol = async () => {
    if (_gstColChecked) return;
    try {
        const [cols] = await mysql.query('SHOW COLUMNS FROM settings LIKE "gst_enabled"');
        if (cols.length === 0) {
            await mysql.query('ALTER TABLE settings ADD COLUMN gst_enabled BOOLEAN DEFAULT 1');
            console.log('[migration] Added gst_enabled column to settings');
        }
        _gstColChecked = true;
    } catch (e) {}
};

const Setting = {
    async get(tenantId) {
        await ensureSoundConfigCol();
        await ensureKitchenEnabledCol();
        await ensureGstEnabledCol();
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
        const effectiveGstEnabled = params.gstEnabled !== undefined ? params.gstEnabled : current?.gstEnabled;
        if (effectiveGstEnabled === false) {
            delete params.sgst;
            delete params.cgst;
            delete params.gstNumber;
        }

        const updateKeys = [];
        const updateValues = [];

        for (const [key, val] of Object.entries(params)) {
            const col = fieldMap[key] || key;
            if (val !== undefined) {
                updateKeys.push(`\`${col}\` = ?`);
                const serialized = typeof val === 'boolean' ? (val ? 1 : 0)
                    : (val !== null && typeof val === 'object') ? JSON.stringify(val)
                    : val;
                updateValues.push(serialized);
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
