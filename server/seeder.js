require('dotenv').config();
const mysql = require('./config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const hash = (pwd) => bcrypt.hash(pwd, 10);

const createTables = async () => {
    // Order matters for drops due to FKs
    const tablesToDrop = [
        'payment_audits', 'payments', 'daily_analytics', 'order_items', 
        'orders', 'menu_items', 'categories', 'tables', 'settings', 'users', 'counters',
        'restaurants_config', 'restaurants', 'notifications'
    ];

    await mysql.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of tablesToDrop) {
        await mysql.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
    await mysql.query('SET FOREIGN_KEY_CHECKS = 1');

    const queries = [
        `CREATE TABLE IF NOT EXISTS restaurants (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            plan VARCHAR(50) DEFAULT 'trial',
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS restaurants_config (
            tenant_id INT PRIMARY KEY,
            table_count INT DEFAULT 10,
            enabled_modules JSON,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50) NOT NULL,
            tenant_id INT,
            image TEXT,
            is_verified BOOLEAN DEFAULT 0,
            last_login_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
             FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            color VARCHAR(7),
            status VARCHAR(50) DEFAULT 'active',
            tenant_id INT,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS menu_items (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category_id VARCHAR(36),
            tenant_id INT,
            image TEXT,
            availability BOOLEAN DEFAULT 1,
            is_veg BOOLEAN DEFAULT 0,
            variants JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS tables (
            id VARCHAR(36) PRIMARY KEY,
            number VARCHAR(50) NOT NULL,
            capacity INT DEFAULT 4,
            status VARCHAR(50) DEFAULT 'available',
            tenant_id INT,
            current_order_id VARCHAR(36),
            reserved_at DATETIME,
            locked_by VARCHAR(255),
            reservation_expires_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(36) PRIMARY KEY,
            order_number VARCHAR(50),
            token_number INT,
            order_type VARCHAR(50) DEFAULT 'dine-in',
            table_id VARCHAR(36),
            tenant_id INT,
            customer_name VARCHAR(255),
            customer_phone VARCHAR(20),
            order_status VARCHAR(50) DEFAULT 'pending',
            payment_status VARCHAR(50) DEFAULT 'unpaid',
            payment_method VARCHAR(50),
            kot_status VARCHAR(50) DEFAULT 'Open',
            total_amount DECIMAL(10,2),
            sgst DECIMAL(10,2) DEFAULT 0,
            cgst DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            discount_label VARCHAR(255),
            final_amount DECIMAL(10,2),
            waiter_id VARCHAR(36),
            prep_started_at DATETIME,
            is_partially_ready BOOLEAN DEFAULT 0,
            ready_at DATETIME,
            completed_at DATETIME,
            payment_at DATETIME,
            paid_at DATETIME,
            cancelled_by VARCHAR(50),
            cancel_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS order_items (
            id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL,
            menu_item_id VARCHAR(36),
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            quantity INT NOT NULL,
            notes TEXT,
            variant JSON,
            status VARCHAR(50) DEFAULT 'PENDING',
            cancelled_at DATETIME,
            cancelled_by VARCHAR(50),
            cancel_reason TEXT,
            is_newly_added BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS counters (
            counter_key VARCHAR(100),
            tenant_id INT,
            sequence_value INT DEFAULT 0,
            PRIMARY KEY (counter_key, tenant_id),
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            tenant_id INT,
            restaurant_name VARCHAR(255),
            address TEXT,
            currency VARCHAR(10) DEFAULT 'INR',
            currency_symbol VARCHAR(5) DEFAULT '₹',
            tax_rate DECIMAL(5,2) DEFAULT 0,
            sgst DECIMAL(5,2) DEFAULT 2.5,
            cgst DECIMAL(5,2) DEFAULT 2.5,
            gst_number VARCHAR(50),
            pending_color VARCHAR(7) DEFAULT '#fcb336',
            accepted_color VARCHAR(7) DEFAULT '#8b5cf6',
            preparing_color VARCHAR(7) DEFAULT '#f59e0b',
            ready_color VARCHAR(7) DEFAULT '#10b981',
            payment_color VARCHAR(7) DEFAULT '#140731',
            dashboard_view VARCHAR(50) DEFAULT 'all',
            menu_view VARCHAR(50) DEFAULT 'grid',
            mobile_menu_view VARCHAR(50) DEFAULT 'grid',
            dine_in_enabled BOOLEAN DEFAULT 1,
            table_map_enabled BOOLEAN DEFAULT 1,
            takeaway_enabled BOOLEAN DEFAULT 1,
            waiter_service_enabled BOOLEAN DEFAULT 1,
            enforce_menu_view BOOLEAN DEFAULT 0,
            cashier_offer_enabled BOOLEAN DEFAULT 0,
            cashier_offer_label VARCHAR(255) DEFAULT "",
            cashier_offer_discount DECIMAL(10,2) DEFAULT 0,
            cashier_qr_upload_enabled BOOLEAN DEFAULT 1,
            standard_qr_url TEXT,
            standard_qr_file_id VARCHAR(255),
            secondary_qr_url TEXT,
            secondary_qr_file_id VARCHAR(255),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS daily_analytics (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id INT,
            date DATE NOT NULL,
            total_orders INT DEFAULT 0,
            completed_orders INT DEFAULT 0,
            cancelled_orders INT DEFAULT 0,
            revenue DECIMAL(15,2) DEFAULT 0,
            avg_order_value DECIMAL(10,2) DEFAULT 0,
            dine_in_orders INT DEFAULT 0,
            takeaway_orders INT DEFAULT 0,
            dine_in_revenue DECIMAL(15,2) DEFAULT 0,
            takeaway_revenue DECIMAL(15,2) DEFAULT 0,
            total_tax DECIMAL(15,2) DEFAULT 0,
            total_discount DECIMAL(15,2) DEFAULT 0,
            items_sold INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY (date, tenant_id),
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL,
            tenant_id INT,
            payment_method VARCHAR(50),
            transaction_id VARCHAR(255),
            amount DECIMAL(10,2) NOT NULL,
            amount_received DECIMAL(10,2),
            \`change\` DECIMAL(10,2),
            change_amount DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            discount_label VARCHAR(255),
            cashier_id VARCHAR(36),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS payment_audits (
            id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36),
            tenant_id INT,
            payment_id VARCHAR(36),
            action VARCHAR(100) NOT NULL,
            status VARCHAR(50),
            amount DECIMAL(10,2),
            payment_method VARCHAR(50),
            performed_by VARCHAR(36),
            performed_by_role VARCHAR(50),
            ip_address VARCHAR(45),
            user_agent TEXT,
            error_message TEXT,
            error_code VARCHAR(100),
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            tenant_id INT,
            user_id VARCHAR(36),
            title VARCHAR(255),
            message TEXT,
            type VARCHAR(50),
            is_read BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tenant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )`
    ];

    for (const query of queries) {
        await mysql.query(query);
    }
    console.log('Tables verified and schemas initialized multi-tenant.');
};

const importData = async () => {
    try {
        await createTables();
        const tenantId = 1;

        // ── Restaurant (Tenant 1) ────────────────────────────────────────────
        console.log('Creating primary restaurant...');
        await mysql.query(
            'INSERT INTO restaurants (id, name, slug, plan) VALUES (?, ?, ?, ?)',
            [tenantId, 'Primary Restaurant', 'primary', 'pro']
        );
        await mysql.query(
            'INSERT INTO restaurants_config (tenant_id, table_count, enabled_modules) VALUES (?, ?, ?)',
            [tenantId, 16, JSON.stringify(['orders', 'kot', 'billing', 'inventory'])]
        );

        // ── Superadmin (system-level, no tenant) ─────────────────────────────
        console.log('Creating superadmin...');
        await mysql.query(
            'INSERT INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), 'superadmin', await hash('super@admin123'), 'superadmin', 'Super Admin', 1, null]
        );
        console.log('SUCCESS: Superadmin created. username=superadmin password=super@admin123');

        // ── Users ────────────────────────────────────────────────────────────
        console.log('Creating staff...');
        const staff = [
            { id: crypto.randomUUID(), username: 'admin',   passwordHash: await hash('admin123'),   role: 'admin',   name: 'Admin' },
            { id: crypto.randomUUID(), username: 'waiter',  passwordHash: await hash('waiter123'),  role: 'waiter',  name: 'Waiter' },
            { id: crypto.randomUUID(), username: 'kitchen', passwordHash: await hash('kitchen123'), role: 'kitchen', name: 'Kitchen' },
            { id: crypto.randomUUID(), username: 'cashier', passwordHash: await hash('cashier123'), role: 'cashier', name: 'Cashier' },
        ];

        for (const u of staff) {
            await mysql.query(
                'INSERT INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [u.id, u.username, u.passwordHash, u.role, u.name, 1, tenantId]
            );
        }
        console.log('SUCCESS: Users created.');

        // ── Settings ─────────────────────────────────────────────────────────
        console.log('Creating settings...');
        await mysql.query(
            'INSERT INTO settings (tenant_id, restaurant_name, address, currency, currency_symbol, tax_rate, sgst, cgst, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tenantId, 'KAGZSO RESTAURANT', '123 Main St, Food City', 'INR', '₹', 0, 2.5, 2.5, 'GST33KAGZSO007']
        );

        // ── Counters ─────────────────────────────────────────────────────────
        await mysql.query('INSERT INTO counters (counter_key, tenant_id, sequence_value) VALUES (?, ?, ?)', ['tokenNumber_global', tenantId, 120]);

        // ── Categories ───────────────────────────────────────────────────────
        console.log('Creating categories with images...');
        const categoriesData = [
            { name: 'Starters', description: 'Flavorful appetizers to start your meal.', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80', color: '#f97316' },
            { name: 'Main Course', description: 'Our signature hearty dishes.', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a0c41ed?auto=format&fit=crop&w=800&q=80', color: '#10b981' },
            { name: 'Biryani', description: 'Fragrant long-grain rice cooked with spices.', image: 'https://images.unsplash.com/photo-1633945274405-b6c80a9cd0e2?auto=format&fit=crop&w=800&q=80', color: '#eab308' },
            { name: 'Tandoor', description: 'Authentic charcoal grilled delights.', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', color: '#dc2626' },
            { name: 'Chinese', description: 'Indo-Chinese fusion favorites.', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80', color: '#8b5cf6' },
            { name: 'South Indian', description: 'Traditional South Indian delicacies.', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', color: '#22c55e' },
            { name: 'Breads', description: 'Freshly baked Indian breads.', image: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', color: '#a855f7' },
            { name: 'Salads', description: 'Fresh and crunchy sides.', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', color: '#2dd4bf' },
            { name: 'Beverages', description: 'Refreshing drinks and shakes.', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', color: '#3b82f6' },
            { name: 'Desserts', description: 'Sweet ending to your perfect meal.', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80', color: '#ec4899' },
        ];

        const catMap = {};
        for (const c of categoriesData) {
            const cid = crypto.randomUUID();
            await mysql.query(
                'INSERT INTO categories (id, name, description, image, color, status, tenant_id) VALUES (?, ?, ?, ?, ?, "active", ?)',
                [cid, c.name, c.description, c.image, c.color, tenantId]
            );
            catMap[c.name] = cid;
        }

        // ── Menu Items ───────────────────────────────────────────────────────
        console.log('Creating full menu with mapped images...');
        const items = [
            // STARTERS
            { name: 'Chicken 65', cat: 'Starters', img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
            { name: 'Chicken Lollipop', cat: 'Starters', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 220 }, { name: '10 Pcs', price: 350 }] },
            { name: 'Chicken Wings', cat: 'Starters', img: 'https://images.unsplash.com/photo-1527477396000-e27163b281c2?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 200 }, { name: '12 Pcs', price: 380 }] },
            { name: 'Chilly Chicken', cat: 'Starters', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 190 }, { name: 'Full', price: 340 }] },
            { name: 'Paneer 65', cat: 'Starters', img: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 280 }] },
            { name: 'Paneer Tikka', cat: 'Starters', img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
            { name: 'Gobi Manchurian', cat: 'Starters', img: 'https://images.unsplash.com/photo-1617201834921-2e931b74542d?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 240 }] },
            { name: 'Hara Bhara Kabab', cat: 'Starters', img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '6 Pcs', price: 150 }, { name: '10 Pcs', price: 240 }] },
            
            // MAIN COURSE
            { name: 'Butter Chicken', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1603894584144-67295841498b?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 240 }, { name: 'Full', price: 450 }] },
            { name: 'Kadai Chicken', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 220 }, { name: 'Full', price: 420 }] },
            { name: 'Mutton Gravy', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 320 }, { name: 'Full', price: 580 }] },
            { name: 'Paneer Butter Masala', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
            { name: 'Kadai Paneer', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
            { name: 'Dal Makhani', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 280 }] },
            { name: 'Dal Tadka', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 240 }] },
            { name: 'Veg Korma', cat: 'Main Course', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 300 }] },

            // BIRYANI
            { name: 'Chicken Biryani', cat: 'Biryani', img: 'https://images.unsplash.com/photo-1589302168068-9a4e6ef1930a?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 180 }, { name: 'Full', price: 320 }, { name: 'Family Pack', price: 580 }] },
            { name: 'Mutton Biryani', cat: 'Biryani', img: 'https://images.unsplash.com/photo-1563379091339-01449341aa7e?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 250 }, { name: 'Full', price: 450 }, { name: 'Family Pack', price: 850 }] },
            { name: 'Veg Biryani', cat: 'Biryani', img: 'https://images.unsplash.com/photo-1596797038530-2c39fa81b487?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Single', price: 140 }, { name: 'Full', price: 240 }] },
            { name: 'Egg Biryani', cat: 'Biryani', img: 'https://images.unsplash.com/photo-1644331574889-498c4710f225?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 150 }, { name: 'Full', price: 260 }] },

            // TANDOOR
            { name: 'Tandoori Chicken', cat: 'Tandoor', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 240 }, { name: 'Full', price: 450 }] },
            { name: 'Afghani Chicken', cat: 'Tandoor', img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
            { name: 'Chicken Tikka', cat: 'Tandoor', img: 'https://images.unsplash.com/photo-1599481238640-4c1288750d7a?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 220 }, { name: '12 Pcs', price: 400 }] },
            { name: 'Paneer Tikka Tandoor', cat: 'Tandoor', img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '6 Pcs', price: 200 }, { name: '12 Pcs', price: 360 }] },
            
            // CHINESE
            { name: 'Veg Fried Rice', cat: 'Chinese', img: 'https://images.unsplash.com/photo-1512058560366-cd2429555614?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 200 }] },
            { name: 'Chicken Fried Rice', cat: 'Chinese', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 260 }] },
            { name: 'Hakka Noodles', cat: 'Chinese', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 200 }] },
            { name: 'Schezwan Noodles', cat: 'Chinese', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 240 }] },

            // SOUTH INDIAN
            { name: 'Masala Dosa', cat: 'South Indian', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', veg: 1, price: 120 },
            { name: 'Idli', cat: 'South Indian', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 60 }, { name: '4 Pcs', price: 100 }] },
            { name: 'Vada', cat: 'South Indian', img: 'https://images.unsplash.com/photo-1621510456681-229ef554413b?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 70 }, { name: '4 Pcs', price: 120 }] },
            { name: 'Pongal', cat: 'South Indian', img: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', veg: 1, price: 100 },

            // BREADS
            { name: 'Butter Naan', cat: 'Breads', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 50 },
            { name: 'Garlic Naan', cat: 'Breads', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 70 },
            { name: 'Tandoori Roti', cat: 'Breads', img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', veg: 1, price: 25 },
            
            // SALADS
            { name: 'Green Salad', cat: 'Salads', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 120 },
            { name: 'Kachumber Salad', cat: 'Salads', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 110 },
            
            // BEVERAGES
            { name: 'Coke', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '250ml', price: 40 }, { name: '750ml', price: 80 }, { name: '1.25L', price: 120 }] },
            { name: 'Pepsi', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1516743618621-af97d8b53ac5?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '250ml', price: 40 }, { name: '750ml', price: 80 }, { name: '1.25L', price: 120 }] },
            { name: 'Mango Lassi', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1546173159-315724a9d669?auto=format&fit=crop&w=800&q=80', veg: 1, price: 100 },
            { name: 'Tea', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1544787210-2211d64b1840?auto=format&fit=crop&w=800&q=80', veg: 1, price: 30 },
            { name: 'Coffee', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', veg: 1, price: 40 },
            { name: 'Fresh Lime Juice', cat: 'Beverages', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 60 },

            // DESSERTS
            { name: 'Chocolate Brownie', cat: 'Desserts', img: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=800&q=80', veg: 1, price: 180 },
            { name: 'Gulab Jamun', cat: 'Desserts', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 80 }, { name: '5 Pcs', price: 180 }] },
            { name: 'Ice Cream', cat: 'Desserts', img: 'https://images.unsplash.com/photo-1501443762994-32cf4da996f0?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Single Scoop', price: 80 }, { name: 'Double Scoop', price: 140 }] },
            { name: 'Rasmalai', cat: 'Desserts', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 100 }, { name: '4 Pcs', price: 180 }] },
            { name: 'Carrot Halwa', cat: 'Desserts', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 140 },
        ];

        for (const item of items) {
            const mid = crypto.randomUUID();
            const variantsJson = item.variants ? JSON.stringify(item.variants) : null;
            const price = item.price || (item.variants ? item.variants[0].price : 0);

            await mysql.query(
                'INSERT INTO menu_items (id, name, price, category_id, image, is_veg, variants, availability, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
                [mid, item.name, parseFloat(price), catMap[item.cat], item.img, item.veg, variantsJson, tenantId]
            );
        }
        console.log(`SUCCESS: ${items.length} menu items added.`);

        // ── Tables ───────────────────────────────────────────────────────────
        const tableConfigs = [
            // Standard numeric
            ...['1','2','3','4','5','6','7','8','9'].map(n => ({ n, c: 4 })),
            // Alphanumeric
            { n: '1A', c: 2 }, { n: '1B', c: 2 },
            { n: '2A', c: 2 }, { n: '2B', c: 2 },
            { n: '10', c: 6 }, { n: '11', c: 6 }, { n: '12', c: 8 }
        ];

        for (const t of tableConfigs) {
            await mysql.query(
                'INSERT INTO tables (id, number, capacity, status, tenant_id) VALUES (?, ?, ?, "available", ?)',
                [crypto.randomUUID(), t.n, t.c, tenantId]
            );
        }
        console.log(`SUCCESS: ${tableConfigs.length} tables created (Standard & Alphanumeric).`);

        console.log('\nTenant 1 seed complete. Seeding tenants 2–5...');
        await require('./scripts/seed-tenants-full').run(mysql, bcrypt, crypto);

        console.log('\nFULL SEED COMPLETE!\n');
    } catch (error) {
        console.error('--- SEED ERROR ---');
        console.error(error);
    } finally {
        process.exit(0);
    }
};

importData();
