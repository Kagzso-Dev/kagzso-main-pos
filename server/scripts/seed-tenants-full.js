/**
 * Seeds restaurants 2–5 with users, settings, categories, menu items, and tables.
 * Called both from seeder.js (after fresh seed) and standalone via seed-tenants.js.
 */

const categoriesData = [
    { name: 'Starters',     color: '#f97316', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80', description: 'Flavorful appetizers to start your meal.' },
    { name: 'Main Course',  color: '#10b981', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a0c41ed?auto=format&fit=crop&w=800&q=80', description: 'Our signature hearty dishes.' },
    { name: 'Biryani',      color: '#eab308', image: 'https://images.unsplash.com/photo-1633945274405-b6c80a9cd0e2?auto=format&fit=crop&w=800&q=80', description: 'Fragrant rice cooked with spices.' },
    { name: 'Tandoor',      color: '#dc2626', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', description: 'Authentic charcoal grilled delights.' },
    { name: 'Chinese',      color: '#8b5cf6', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80', description: 'Indo-Chinese fusion favorites.' },
    { name: 'South Indian', color: '#22c55e', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', description: 'Traditional South Indian delicacies.' },
    { name: 'Breads',       color: '#a855f7', image: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', description: 'Freshly baked Indian breads.' },
    { name: 'Salads',       color: '#2dd4bf', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', description: 'Fresh and crunchy sides.' },
    { name: 'Beverages',    color: '#3b82f6', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', description: 'Refreshing drinks and shakes.' },
    { name: 'Desserts',     color: '#ec4899', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80', description: 'Sweet ending to your meal.' },
];

const menuItems = [
    { name: 'Chicken 65',           cat: 'Starters',     veg: 0, img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:180},{name:'Full',price:320}] },
    { name: 'Chicken Lollipop',     cat: 'Starters',     veg: 0, img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', variants: [{name:'6 Pcs',price:220},{name:'10 Pcs',price:350}] },
    { name: 'Paneer Tikka',         cat: 'Starters',     veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:180},{name:'Full',price:320}] },
    { name: 'Gobi Manchurian',      cat: 'Starters',     veg: 1, img: 'https://images.unsplash.com/photo-1617201834921-2e931b74542d?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:140},{name:'Full',price:240}] },
    { name: 'Hara Bhara Kabab',     cat: 'Starters',     veg: 1, img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80', variants: [{name:'6 Pcs',price:150},{name:'10 Pcs',price:240}] },
    { name: 'Butter Chicken',       cat: 'Main Course',  veg: 0, img: 'https://images.unsplash.com/photo-1603894584144-67295841498b?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:240},{name:'Full',price:450}] },
    { name: 'Kadai Chicken',        cat: 'Main Course',  veg: 0, img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:220},{name:'Full',price:420}] },
    { name: 'Mutton Gravy',         cat: 'Main Course',  veg: 0, img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:320},{name:'Full',price:580}] },
    { name: 'Paneer Butter Masala', cat: 'Main Course',  veg: 1, img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:180},{name:'Full',price:340}] },
    { name: 'Dal Makhani',          cat: 'Main Course',  veg: 1, img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:150},{name:'Full',price:280}] },
    { name: 'Dal Tadka',            cat: 'Main Course',  veg: 1, img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:130},{name:'Full',price:240}] },
    { name: 'Veg Korma',            cat: 'Main Course',  veg: 1, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:160},{name:'Full',price:300}] },
    { name: 'Chicken Biryani',      cat: 'Biryani',      veg: 0, img: 'https://images.unsplash.com/photo-1589302168068-9a4e6ef1930a?auto=format&fit=crop&w=800&q=80', variants: [{name:'Single',price:180},{name:'Full',price:320},{name:'Family',price:580}] },
    { name: 'Mutton Biryani',       cat: 'Biryani',      veg: 0, img: 'https://images.unsplash.com/photo-1563379091339-01449341aa7e?auto=format&fit=crop&w=800&q=80', variants: [{name:'Single',price:250},{name:'Full',price:450}] },
    { name: 'Veg Biryani',          cat: 'Biryani',      veg: 1, img: 'https://images.unsplash.com/photo-1596797038530-2c39fa81b487?auto=format&fit=crop&w=800&q=80', variants: [{name:'Single',price:140},{name:'Full',price:240}] },
    { name: 'Egg Biryani',          cat: 'Biryani',      veg: 0, img: 'https://images.unsplash.com/photo-1644331574889-498c4710f225?auto=format&fit=crop&w=800&q=80', variants: [{name:'Single',price:150},{name:'Full',price:260}] },
    { name: 'Tandoori Chicken',     cat: 'Tandoor',      veg: 0, img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:240},{name:'Full',price:450}] },
    { name: 'Afghani Chicken',      cat: 'Tandoor',      veg: 0, img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:260},{name:'Full',price:480}] },
    { name: 'Chicken Tikka',        cat: 'Tandoor',      veg: 0, img: 'https://images.unsplash.com/photo-1599481238640-4c1288750d7a?auto=format&fit=crop&w=800&q=80', variants: [{name:'6 Pcs',price:220},{name:'12 Pcs',price:400}] },
    { name: 'Paneer Tikka Tandoor', cat: 'Tandoor',      veg: 1, img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', variants: [{name:'6 Pcs',price:200},{name:'12 Pcs',price:360}] },
    { name: 'Veg Fried Rice',       cat: 'Chinese',      veg: 1, img: 'https://images.unsplash.com/photo-1512058560366-cd2429555614?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:120},{name:'Full',price:200}] },
    { name: 'Chicken Fried Rice',   cat: 'Chinese',      veg: 0, img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:150},{name:'Full',price:260}] },
    { name: 'Hakka Noodles',        cat: 'Chinese',      veg: 1, img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:120},{name:'Full',price:200}] },
    { name: 'Schezwan Noodles',     cat: 'Chinese',      veg: 1, img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', variants: [{name:'Half',price:140},{name:'Full',price:240}] },
    { name: 'Masala Dosa',          cat: 'South Indian', veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', price: 120 },
    { name: 'Idli',                 cat: 'South Indian', veg: 1, img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', variants: [{name:'2 Pcs',price:60},{name:'4 Pcs',price:100}] },
    { name: 'Vada',                 cat: 'South Indian', veg: 1, img: 'https://images.unsplash.com/photo-1621510456681-229ef554413b?auto=format&fit=crop&w=800&q=80', variants: [{name:'2 Pcs',price:70},{name:'4 Pcs',price:120}] },
    { name: 'Pongal',               cat: 'South Indian', veg: 1, img: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', price: 100 },
    { name: 'Butter Naan',          cat: 'Breads',       veg: 1, img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', price: 50 },
    { name: 'Garlic Naan',          cat: 'Breads',       veg: 1, img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', price: 70 },
    { name: 'Tandoori Roti',        cat: 'Breads',       veg: 1, img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', price: 25 },
    { name: 'Chapati',              cat: 'Breads',       veg: 1, img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', price: 20 },
    { name: 'Green Salad',          cat: 'Salads',       veg: 1, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', price: 120 },
    { name: 'Kachumber Salad',      cat: 'Salads',       veg: 1, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', price: 110 },
    { name: 'Coke',                 cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', variants: [{name:'250ml',price:40},{name:'750ml',price:80},{name:'1.25L',price:120}] },
    { name: 'Pepsi',                cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1516743618621-af97d8b53ac5?auto=format&fit=crop&w=800&q=80', variants: [{name:'250ml',price:40},{name:'750ml',price:80}] },
    { name: 'Mango Lassi',          cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1546173159-315724a9d669?auto=format&fit=crop&w=800&q=80', price: 100 },
    { name: 'Tea',                  cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1544787210-2211d64b1840?auto=format&fit=crop&w=800&q=80', price: 30 },
    { name: 'Coffee',               cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', price: 40 },
    { name: 'Fresh Lime Juice',     cat: 'Beverages',    veg: 1, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', price: 60 },
    { name: 'Gulab Jamun',          cat: 'Desserts',     veg: 1, img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', variants: [{name:'2 Pcs',price:80},{name:'5 Pcs',price:180}] },
    { name: 'Ice Cream',            cat: 'Desserts',     veg: 1, img: 'https://images.unsplash.com/photo-1501443762994-32cf4da996f0?auto=format&fit=crop&w=800&q=80', variants: [{name:'Single',price:80},{name:'Double',price:140}] },
    { name: 'Rasmalai',             cat: 'Desserts',     veg: 1, img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', variants: [{name:'2 Pcs',price:100},{name:'4 Pcs',price:180}] },
    { name: 'Chocolate Brownie',    cat: 'Desserts',     veg: 1, img: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=800&q=80', price: 180 },
    { name: 'Carrot Halwa',         cat: 'Desserts',     veg: 1, img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', price: 140 },
];

const tableConfigs = [
    ...['1','2','3','4','5','6','7','8','9'].map(n => ({ n, c: 4 })),
    { n: '1A', c: 2 }, { n: '1B', c: 2 },
    { n: '2A', c: 2 }, { n: '2B', c: 2 },
    { n: '10', c: 6 }, { n: '11', c: 6 }, { n: '12', c: 8 },
];

const extraRestaurants = [
    { id: 2, name: 'Skyline Grill',  slug: 'skyline-grill' },
    { id: 3, name: 'Zen Sushi',      slug: 'zen-sushi' },
    { id: 4, name: 'Rustic Pizza',   slug: 'rustic-pizza' },
    { id: 5, name: 'Urban Brews',    slug: 'urban-brews' },
];

async function run(mysql, bcrypt, crypto) {
    for (const r of extraRestaurants) {
        // Restaurant + config
        await mysql.query('INSERT IGNORE INTO restaurants (id, name, slug, plan, is_active) VALUES (?, ?, ?, ?, 1)', [r.id, r.name, r.slug, 'pro']);
        await mysql.query('INSERT IGNORE INTO restaurants_config (tenant_id, table_count, enabled_modules) VALUES (?, ?, ?)', [r.id, 16, JSON.stringify(['orders','kot','billing'])]);

        // Settings
        const [se] = await mysql.query('SELECT id FROM settings WHERE tenant_id = ? LIMIT 1', [r.id]);
        if (!se.length) {
            await mysql.query(
                'INSERT INTO settings (tenant_id, restaurant_name, currency, currency_symbol, sgst, cgst) VALUES (?, ?, ?, ?, ?, ?)',
                [r.id, r.name, 'INR', '₹', 2.5, 2.5]
            );
        }

        // Counter
        await mysql.query('INSERT IGNORE INTO counters (counter_key, tenant_id, sequence_value) VALUES (?, ?, ?)', ['tokenNumber_global', r.id, 0]);

        // Users: admin, waiter, kitchen, cashier
        for (const role of ['admin', 'waiter', 'kitchen', 'cashier']) {
            const username = role + r.id;
            const password = role + r.id + '123';
            const hashed = await bcrypt.hash(password, 10);
            await mysql.query(
                'INSERT IGNORE INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, 1, ?)',
                [crypto.randomUUID(), username, hashed, role, username, r.id]
            );
        }

        // Categories
        const catMap = {};
        for (const c of categoriesData) {
            const cid = crypto.randomUUID();
            await mysql.query(
                'INSERT INTO categories (id, name, description, image, color, status, tenant_id) VALUES (?, ?, ?, ?, ?, "active", ?)',
                [cid, c.name, c.description, c.image, c.color, r.id]
            );
            catMap[c.name] = cid;
        }

        // Menu items
        for (const item of menuItems) {
            const mid = crypto.randomUUID();
            const variantsJson = item.variants ? JSON.stringify(item.variants) : null;
            const price = item.price || (item.variants ? item.variants[0].price : 0);
            await mysql.query(
                'INSERT INTO menu_items (id, name, price, category_id, image, is_veg, variants, availability, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
                [mid, item.name, parseFloat(price), catMap[item.cat], item.img, item.veg, variantsJson, r.id]
            );
        }

        // Tables
        for (const t of tableConfigs) {
            await mysql.query(
                'INSERT INTO tables (id, number, capacity, status, tenant_id) VALUES (?, ?, ?, "available", ?)',
                [crypto.randomUUID(), t.n, t.c, r.id]
            );
        }

        console.log(`  Tenant ${r.id} (${r.name}): users + ${categoriesData.length} categories + ${menuItems.length} items + ${tableConfigs.length} tables`);
    }
}

module.exports = { run };
