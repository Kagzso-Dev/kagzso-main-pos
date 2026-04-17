require('dotenv').config();
const mysql = require('./config/mysql');

async function migrate() {
    try {
        console.log('--- STARTING SCHEMA MIGRATION ---');

        // 0. MULTI-TENANCY SUPPORT
        console.log('Setting up multi-tenancy core tables...');
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                plan VARCHAR(50) DEFAULT 'trial',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS restaurants_config (
                tenant_id INT PRIMARY KEY,
                table_count INT DEFAULT 10,
                enabled_modules JSON,
                FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            )
        `);
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(36) PRIMARY KEY,
                tenant_id INT,
                user_id VARCHAR(36),
                title VARCHAR(255),
                message TEXT,
                type VARCHAR(50),
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            )
        `);

        // Check if primary restaurant exists
        const [tenants] = await mysql.query('SELECT id FROM restaurants WHERE id = 1');
        if (tenants.length === 0) {
            console.log('Initializing primary restaurant (id=1)...');
            await mysql.query('INSERT INTO restaurants (id, name, slug, plan) VALUES (1, "Primary", "primary", "pro")');
            await mysql.query('INSERT INTO restaurants_config (tenant_id, table_count, enabled_modules) VALUES (1, 15, \'["orders", "kot", "billing"]\')');
        }

        const tenantTables = [
            'users', 'categories', 'menu_items', 'tables', 'orders', 
            'counters', 'settings', 'daily_analytics', 'payments', 
            'payment_audits'
        ];

        for (const tableName of tenantTables) {
            const [cols] = await mysql.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE "tenant_id"`);
            if (cols.length === 0) {
                console.log(`Adding tenant_id to ${tableName}...`);
                await mysql.query(`ALTER TABLE \`${tableName}\` ADD COLUMN tenant_id INT AFTER id`);
                // If counters, it's part of PK
                if (tableName === 'counters') {
                     await mysql.query('ALTER TABLE counters DROP PRIMARY KEY, ADD PRIMARY KEY (counter_key, tenant_id)');
                }
                // Backfill existing data
                await mysql.query(`UPDATE \`${tableName}\` SET tenant_id = 1 WHERE tenant_id IS NULL`);
                // Add FK
                await mysql.query(`ALTER TABLE \`${tableName}\` ADD FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE`);
            }
        }

        // 1. Fix Tables schema
        console.log('Checking tables for number type conversion...');
        const [numCol] = await mysql.query('SHOW COLUMNS FROM tables LIKE "number"');
        if (numCol.length > 0 && numCol[0].Type.toLowerCase().includes('int')) {
            console.log('Converting tables.number to VARCHAR for alphanumeric support...');
            await mysql.query('ALTER TABLE tables MODIFY COLUMN number VARCHAR(50) NOT NULL');
        }

        console.log('Checking tables for reservation_expires_at...');
        const [tableCols] = await mysql.query('SHOW COLUMNS FROM tables LIKE "reservation_expires_at"');
        if (tableCols.length === 0) {
            console.log('Adding reservation_expires_at to tables...');
            await mysql.query('ALTER TABLE tables ADD COLUMN reservation_expires_at DATETIME AFTER status');
        }

        // 2. Fix Payments schema
        console.log('Checking payments for change_amount and discount fields...');
        const paymentColsToAdd = [
            { name: 'change_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'discount', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'discount_label', type: 'VARCHAR(255) DEFAULT ""' }
        ];
        for (const col of paymentColsToAdd) {
            const [exists] = await mysql.query(`SHOW COLUMNS FROM payments LIKE "${col.name}"`);
            if (exists.length === 0) {
                console.log(`Adding column ${col.name} to payments...`);
                await mysql.query(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // 3. Fix Settings schema
        const settingsColsToAdd = [
            { name: 'pending_color', type: 'VARCHAR(7) DEFAULT "#fcb336"' },
            { name: 'accepted_color', type: 'VARCHAR(7) DEFAULT "#8b5cf6"' },
            { name: 'preparing_color', type: 'VARCHAR(7) DEFAULT "#f59e0b"' },
            { name: 'ready_color', type: 'VARCHAR(7) DEFAULT "#10b981"' },
            { name: 'dashboard_view', type: 'VARCHAR(50) DEFAULT "all"' },
            { name: 'menu_view', type: 'VARCHAR(50) DEFAULT "grid"' },
            { name: 'mobile_menu_view', type: 'VARCHAR(50) DEFAULT "grid"' },
            { name: 'dine_in_enabled', type: 'BOOLEAN DEFAULT 1' },
            { name: 'table_map_enabled', type: 'BOOLEAN DEFAULT 1' },
            { name: 'takeaway_enabled', type: 'BOOLEAN DEFAULT 1' },
            { name: 'waiter_service_enabled', type: 'BOOLEAN DEFAULT 1' },
            { name: 'enforce_menu_view', type: 'BOOLEAN DEFAULT 0' },
            { name: 'cashier_offer_enabled', type: 'BOOLEAN DEFAULT 0' },
            { name: 'cashier_offer_label', type: 'VARCHAR(255) DEFAULT ""' },
            { name: 'cashier_offer_discount', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'cashier_qr_upload_enabled', type: 'BOOLEAN DEFAULT 1' },
            { name: 'sgst', type: 'DECIMAL(5,2) DEFAULT 2.5' },
            { name: 'cgst', type: 'DECIMAL(5,2) DEFAULT 2.5' }
        ];

        for (const col of settingsColsToAdd) {
            const [exists] = await mysql.query(`SHOW COLUMNS FROM settings LIKE "${col.name}"`);
            if (exists.length === 0) {
                console.log(`Adding column ${col.name} to settings...`);
                await mysql.query(`ALTER TABLE settings ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // 4. Fix Analytics schema (Expansion)
        console.log('Checking daily_analytics for expansion columns...');
        const analyticsColsToAdd = [
            { name: 'dine_in_revenue', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'takeaway_revenue', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'total_tax', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'total_discount', type: 'DECIMAL(15,2) DEFAULT 0' },
            { name: 'items_sold', type: 'INT DEFAULT 0' }
        ];
        for (const col of analyticsColsToAdd) {
            const [exists] = await mysql.query(`SHOW COLUMNS FROM daily_analytics LIKE "${col.name}"`);
            if (exists.length === 0) {
                console.log(`Adding column ${col.name} to daily_analytics...`);
                await mysql.query(`ALTER TABLE daily_analytics ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // 5. Fix Orders schema
        console.log('Checking orders for sgst and cgst...');
        const orderColsToAdd = [
            { name: 'sgst', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'cgst', type: 'DECIMAL(10,2) DEFAULT 0' }
        ];
        for (const col of orderColsToAdd) {
            const [exists] = await mysql.query(`SHOW COLUMNS FROM orders LIKE "${col.name}"`);
            if (exists.length === 0) {
                console.log(`Adding column ${col.name} to orders...`);
                await mysql.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        console.log('--- MIGRATION SUCCESSFUL ---');
    } catch (err) {
        console.error('--- MIGRATION FAILED ---');
        console.error(err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
