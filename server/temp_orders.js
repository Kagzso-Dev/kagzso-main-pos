const dotenv = require('dotenv');
dotenv.config();

const mysql = require('./config/mysql');
const crypto = require('crypto');

const seedOrders = async () => {
    console.log('Seeding sample orders for real-time dashboard testing...');
    
    // 1. Get some menu items
    const [items] = await mysql.query('SELECT id, name, price FROM menu_items LIMIT 10');
    if (items.length === 0) {
        console.error('No menu items found. Please run seeder first.');
        process.exit(1);
    }

    // 2. Get some tables
    const [tables] = await mysql.query('SELECT id, number FROM tables LIMIT 5');

    // 3. Helper to insert an order
    const insertOrder = async (type, tableId, itemsList) => {
        const orderId = crypto.randomUUID();
        const tokenNum = Math.floor(Math.random() * 900) + 100;
        const orderNum = `ORD-${Date.now().toString().slice(-6)}-${tokenNum}`;
        const total = itemsList.reduce((sum, item) => sum + parseFloat(item.price), 0);
        
        // Calculate GST (2.5% each)
        const sgst = (total * 0.025);
        const cgst = (total * 0.025);
        const final = total + sgst + cgst;
        
        await mysql.query(`
            INSERT INTO orders (id, order_number, token_number, order_type, table_id, order_status, kot_status, total_amount, sgst, cgst, final_amount)
            VALUES (?, ?, ?, ?, ?, 'pending', 'Open', ?, ?, ?, ?)
        `, [orderId, orderNum, tokenNum, type, tableId, total, sgst, cgst, final]);

        for (const item of itemsList) {
            await mysql.query(`
                INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, price, status)
                VALUES (?, ?, ?, ?, 1, ?, 'PENDING')
            `, [crypto.randomUUID(), orderId, item.id, item.name, item.price]);
        }
        
        if (type === 'dine-in' && tableId) {
            await mysql.query('UPDATE tables SET status = "occupied", current_order_id = ? WHERE id = ?', [orderId, tableId]);
        }
        return orderNum;
    };

    // Create 3 Dine-In Orders
    for (let i = 0; i < 3; i++) {
        const table = tables[i] || { id: null };
        const numItems = Math.floor(Math.random() * 3) + 1;
        const randomItems = items.sort(() => 0.5 - Math.random()).slice(0, numItems);
        const num = await insertOrder('dine-in', table.id, randomItems);
        console.log(`Created Dine-In Order: ${num} on Table ${table.number}`);
    }

    // Create 2 Takeaway Orders
    for (let i = 0; i < 2; i++) {
        const numItems = Math.floor(Math.random() * 3) + 1;
        const randomItems = items.sort(() => 0.5 - Math.random()).slice(0, numItems);
        const num = await insertOrder('takeaway', null, randomItems);
        console.log(`Created Takeaway Order: ${num}`);
    }

    console.log('Seeding complete! Check your Kitchen Dashboard now.');
    process.exit(0);
};

seedOrders().catch(err => {
    console.error(err);
    process.exit(1);
});
