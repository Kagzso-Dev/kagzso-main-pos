const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');
const ExcelJS = require('exceljs');
const mysql = require('../config/mysql');
const Tenant = require('../models/Tenant');

const CREDENTIALS_PATH = path.resolve(
    __dirname, '..',
    process.env.GOOGLE_CREDENTIALS_PATH || './config/google-credentials.json'
);

const getDrive = () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
};

const getOrCreateFolder = async (drive, name, parentId) => {
    const safeName = name.replace(/'/g, "\\'");
    const { data } = await drive.files.list({
        q: `name='${safeName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    if (data.files.length > 0) return data.files[0].id;
    const { data: created } = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id',
        supportsAllDrives: true,
    });
    return created.id;
};

const buildExcelBuffer = async (tenantId) => {
    const [orders, orderItems, payments, menuItems, staff, categories] = await Promise.all([
        mysql.query(
            `SELECT o.id, o.order_number, o.order_status, o.order_type, o.total_amount,
                    t.number AS table_number, o.created_at
             FROM orders o LEFT JOIN \`tables\` t ON t.id = o.table_id
             WHERE o.tenant_id = ? ORDER BY o.created_at DESC`,
            [tenantId]
        ),
        mysql.query(
            `SELECT oi.order_id, oi.name AS item_name, oi.quantity, oi.price AS unit_price,
                    (oi.quantity * oi.price) AS line_total
             FROM order_items oi INNER JOIN orders o ON o.id = oi.order_id
             WHERE o.tenant_id = ? ORDER BY oi.order_id`,
            [tenantId]
        ),
        mysql.query(
            `SELECT p.id, p.order_id, p.amount, p.payment_method, p.created_at
             FROM payments p INNER JOIN orders o ON o.id = p.order_id
             WHERE o.tenant_id = ? ORDER BY p.created_at DESC`,
            [tenantId]
        ),
        mysql.query(
            `SELECT m.name, c.name AS category, m.price, m.availability AS status
             FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id
             WHERE m.tenant_id = ? ORDER BY c.name, m.name`,
            [tenantId]
        ),
        mysql.query(
            `SELECT username, name, role, created_at FROM users WHERE tenant_id = ? ORDER BY role, username`,
            [tenantId]
        ),
        mysql.query(
            `SELECT name, color, status FROM categories WHERE tenant_id = ? ORDER BY name`,
            [tenantId]
        ),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Kagzso POS';
    wb.created = new Date();

    const addSheet = (name, columns, dataRows) => {
        const ws = wb.addWorksheet(name);
        ws.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 20 }));
        ws.getRow(1).eachCell((cell) => {
            cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { horizontal: 'center' };
        });
        dataRows.forEach((row) => ws.addRow(row));
    };

    addSheet('Orders',
        [
            { key: 'id',           label: 'Order ID',   width: 38 },
            { key: 'order_number', label: 'Order No',   width: 12 },
            { key: 'order_status', label: 'Status',     width: 14 },
            { key: 'order_type',   label: 'Type',       width: 12 },
            { key: 'table_number', label: 'Table No',   width: 10 },
            { key: 'total_amount', label: 'Total (Rs)', width: 14 },
            { key: 'created_at',   label: 'Created At', width: 22 },
        ],
        orders[0].map((r) => ({
            id: r.id, order_number: r.order_number, order_status: r.order_status,
            order_type: r.order_type, table_number: r.table_number ?? '-',
            total_amount: Number(r.total_amount), created_at: r.created_at,
        }))
    );

    addSheet('Order Items',
        [
            { key: 'order_id',   label: 'Order ID',   width: 38 },
            { key: 'item_name',  label: 'Item',        width: 24 },
            { key: 'quantity',   label: 'Qty',         width: 8  },
            { key: 'unit_price', label: 'Unit Price',  width: 14 },
            { key: 'line_total', label: 'Line Total',  width: 14 },
        ],
        orderItems[0].map((r) => ({
            order_id: r.order_id, item_name: r.item_name,
            quantity: r.quantity, unit_price: Number(r.unit_price),
            line_total: Number(r.line_total),
        }))
    );

    addSheet('Payments',
        [
            { key: 'id',             label: 'Payment ID',  width: 38 },
            { key: 'order_id',       label: 'Order ID',    width: 38 },
            { key: 'amount',         label: 'Amount (Rs)', width: 14 },
            { key: 'payment_method', label: 'Method',      width: 14 },
            { key: 'created_at',     label: 'Created At',  width: 22 },
        ],
        payments[0].map((r) => ({
            id: r.id, order_id: r.order_id, amount: Number(r.amount),
            payment_method: r.payment_method, created_at: r.created_at,
        }))

    );

    addSheet('Menu Items',
        [
            { key: 'name',     label: 'Item Name',  width: 26 },
            { key: 'category', label: 'Category',   width: 20 },
            { key: 'price',    label: 'Price (Rs)', width: 14 },
            { key: 'status',   label: 'Status',     width: 12 },
        ],
        menuItems[0].map((r) => ({
            name: r.name, category: r.category || '-',
            price: Number(r.price), status: r.status,
        }))
    );

    addSheet('Staff',
        [
            { key: 'username',   label: 'Username',  width: 20 },
            { key: 'name',       label: 'Name',      width: 22 },
            { key: 'role',       label: 'Role',      width: 14 },
            { key: 'created_at', label: 'Joined At', width: 22 },
        ],
        staff[0].map((r) => ({
            username: r.username, name: r.name || '-',
            role: r.role, created_at: r.created_at,
        }))
    );

    addSheet('Categories',
        [
            { key: 'name',   label: 'Category', width: 22 },
            { key: 'color',  label: 'Color',    width: 12 },
            { key: 'status', label: 'Status',   width: 12 },
        ],
        categories[0].map((r) => ({ name: r.name, color: r.color, status: r.status }))
    );

    return wb.xlsx.writeBuffer();
};

const runBackup = async (tenantId) => {
    try {
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!rootFolderId) {
            console.error('[Backup] GOOGLE_DRIVE_FOLDER_ID not set in .env');
            return;
        }

        const restaurant = await Tenant.findById(tenantId);
        if (!restaurant) {
            console.error(`[Backup] Tenant ${tenantId} not found`);
            return;
        }

        const drive = getDrive();
        const now   = new Date();
        const year  = String(now.getFullYear());
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day   = String(now.getDate()).padStart(2, '0');
        const hour  = String(now.getHours()).padStart(2, '0');

        // Folder path: POS Backups / tenant-slug / year / month / day
        const tenantFolder = await getOrCreateFolder(drive, restaurant.slug || `tenant-${tenantId}`, rootFolderId);
        const yearFolder   = await getOrCreateFolder(drive, year,  tenantFolder);
        const monthFolder  = await getOrCreateFolder(drive, month, yearFolder);
        const dayFolder    = await getOrCreateFolder(drive, day,   monthFolder);

        const excelRaw = await buildExcelBuffer(tenantId);
        const buffer   = Buffer.isBuffer(excelRaw) ? excelRaw : Buffer.from(excelRaw);
        const filename = `${restaurant.slug}_${year}-${month}-${day}_${hour}00.xlsx`;

        await drive.files.create({
            requestBody: {
                name: filename,
                parents: [dayFolder],
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                body: Readable.from(buffer),
            },
            supportsAllDrives: true,
        });

        // Update lastBackupAt in settings
        const [rows] = await mysql.query(
            'SELECT backup_schedule_config FROM settings WHERE tenant_id = ? LIMIT 1',
            [tenantId]
        );
        const raw  = rows[0]?.backup_schedule_config;
        const cfg  = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        await mysql.query(
            'UPDATE settings SET backup_schedule_config = ? WHERE tenant_id = ?',
            [JSON.stringify({ ...cfg, lastBackupAt: now.toISOString() }), tenantId]
        );

        console.log(`[Backup] ✅ ${restaurant.name} → Drive/${restaurant.slug}/${year}/${month}/${day}/${filename}`);
    } catch (err) {
        console.error(`[Backup] ❌ Tenant ${tenantId}:`, err.message, err.response?.data || '');
    }
};

module.exports = { runBackup };
