const dotenv = require('dotenv');
dotenv.config();
const crypto = require('crypto');
const mysql = require('../config/mysql');

const menuData = [
    {
        category: 'Starters',
        description: 'Flavorful appetizers to start your meal.',
        image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
        color: '#f97316',
        items: [
            { name: 'Chicken 65', img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
            { name: 'Chicken Lollipop', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 220 }, { name: '10 Pcs', price: 350 }] },
            { name: 'Chicken Wings', img: 'https://images.unsplash.com/photo-1527477396000-e27163b281c2?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 200 }, { name: '12 Pcs', price: 380 }] },
            { name: 'Chilly Chicken', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 190 }, { name: 'Full', price: 340 }] },
            { name: 'Chilli Chicken', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 190 }, { name: 'Full', price: 340 }] },
            { name: 'Dragon Chicken', img: 'https://images.unsplash.com/photo-1518492104633-130d0cc8462b?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 210 }, { name: 'Full', price: 380 }] },
            { name: 'Fish 65', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 240 }, { name: '12 Pcs', price: 450 }] },
            { name: 'Fish Tikka (6 pcs)', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 280 }] },
            { name: 'Prawn 65', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 280 }, { name: '12 Pcs', price: 520 }] },
            { name: 'Paneer 65', img: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 280 }] },
            { name: 'Paneer Tikka', img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 320 }] },
            { name: 'Gobi 65', img: 'https://images.unsplash.com/photo-1644331574889-498c4710f225?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 230 }] },
            { name: 'Gobi Manchurian', img: 'https://images.unsplash.com/photo-1617201834921-2e931b74542d?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 240 }] },
            { name: 'Hara Bhara Kabab', img: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '6 Pcs', price: 150 }, { name: '10 Pcs', price: 240 }] }
        ]
    },
    {
        category: 'Main Course',
        description: 'Our signature hearty dishes.',
        image: 'https://images.unsplash.com/photo-1588166524941-3bf61a0c41ed?auto=format&fit=crop&w=800&q=80',
        color: '#10b981',
        items: [
            { name: 'Butter Chicken', img: 'https://images.unsplash.com/photo-1603894584144-67295841498b?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 240 }, { name: 'Full', price: 450 }] },
            { name: 'Kadai Chicken', img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 220 }, { name: 'Full', price: 420 }] },
            { name: 'Chicken Curry', img: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 200 }, { name: 'Full', price: 380 }] },
            { name: 'Chicken Tikka Masala', img: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 230 }, { name: 'Full', price: 420 }] },
            { name: 'Chicken Biryani', img: 'https://images.unsplash.com/photo-1589302168068-9a4e6ef1930a?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 180 }, { name: 'Full', price: 320 }, { name: 'Family Pack', price: 580 }] },
            { name: 'Egg Fried Rice', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 0, price: 180 },
            { name: 'Chicken Noodles', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', veg: 0, price: 200 },
            { name: 'Mutton Gravy', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 320 }, { name: 'Full', price: 580 }] },
            { name: 'Mutton Chukka', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 340 }, { name: 'Full', price: 620 }] },
            { name: 'Mutton Biryani', img: 'https://images.unsplash.com/photo-1563379091339-01449341aa7e?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 250 }, { name: 'Full', price: 450 }, { name: 'Family Pack', price: 850 }] },
            { name: 'Paneer Butter Masala', img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
            { name: 'Kadai Paneer', img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
            { name: 'Kadhai Paneer', img: 'https://images.unsplash.com/photo-1626074353020-e3cce8a03291?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 340 }] },
            { name: 'Dal Makhani', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 280 }] },
            { name: 'Dal Tadka', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 240 }] },
            { name: 'Mix Veg', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 300 }] }
        ]
    },
    {
        category: 'Biryani',
        description: 'Fragrant long-grain rice cooked with spices.',
        image: 'https://images.unsplash.com/photo-1633945274405-b6c80a9cd0e2?auto=format&fit=crop&w=800&q=80',
        color: '#eab308',
        items: [
            { name: 'Chicken Biryani', img: 'https://images.unsplash.com/photo-1589302168068-9a4e6ef1930a?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 180 }, { name: 'Full', price: 320 }, { name: 'Family Pack', price: 580 }] },
            { name: 'Mutton Biryani', img: 'https://images.unsplash.com/photo-1563379091339-01449341aa7e?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 250 }, { name: 'Full', price: 450 }, { name: 'Family Pack', price: 850 }] },
            { name: 'Veg Biryani', img: 'https://images.unsplash.com/photo-1596797038530-2c39fa81b487?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Single', price: 140 }, { name: 'Full', price: 240 }] },
            { name: 'Egg Biryani', img: 'https://images.unsplash.com/photo-1644331574889-498c4710f225?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Single', price: 150 }, { name: 'Full', price: 260 }] },
            { name: 'Paneer Biryani', img: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Single', price: 160 }, { name: 'Full', price: 280 }] }
        ]
    },
    {
        category: 'Tandoor',
        description: 'Authentic charcoal grilled delights.',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        color: '#dc2626',
        items: [
            { name: 'Tandoori Chicken', img: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 240 }, { name: 'Full', price: 450 }] },
            { name: 'Afghani Chicken', img: 'https://images.unsplash.com/photo-1546241072-48010ad28c2c?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 260 }, { name: 'Full', price: 480 }] },
            { name: 'Chicken Tikka', img: 'https://images.unsplash.com/photo-1599481238640-4c1288750d7a?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 220 }, { name: '12 Pcs', price: 400 }] },
            { name: 'Fish Tikka', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 280 }, { name: '12 Pcs', price: 520 }] },
            { name: 'Fish Tikka (6 pcs)', img: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: '6 Pcs', price: 280 }] },
            { name: 'Paneer Tikka Tandoori', img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '6 Pcs', price: 200 }, { name: '12 Pcs', price: 360 }] },
            { name: 'Paneer Tikka', img: 'https://images.unsplash.com/photo-1567188040759-fbabd166fb3c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '6 Pcs', price: 180 }, { name: '12 Pcs', price: 320 }] }
        ]
    },
    {
        category: 'Chinese',
        description: 'Indo-Chinese fusion favorites.',
        image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
        color: '#8b5cf6',
        items: [
            { name: 'Veg Fried Rice', img: 'https://images.unsplash.com/photo-1512058560366-cd2429555614?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 200 }] },
            { name: 'Chicken Fried Rice', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 260 }] },
            { name: 'Egg Fried Rice', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 130 }, { name: 'Full', price: 220 }] },
            { name: 'Veg Noodles', img: 'https://images.unsplash.com/photo-1585032226654-7198e3ff8982?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 120 }, { name: 'Full', price: 200 }] },
            { name: 'Chicken Noodles', img: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=800&q=80', veg: 0, variants: [{ name: 'Half', price: 150 }, { name: 'Full', price: 260 }] },
            { name: 'Schezwan Noodles', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Half', price: 140 }, { name: 'Full', price: 240 }] }
        ]
    },
    {
        category: 'South Indian',
        description: 'Traditional South Indian delicacies.',
        image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80',
        color: '#22c55e',
        items: [
            { name: 'Masala Dosa', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', veg: 1, price: 120 },
            { name: 'Plain Dosa', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', veg: 1, price: 90 },
            { name: 'Onion Dosa', img: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', veg: 1, price: 110 },
            { name: 'Idli', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 60 }, { name: '4 Pcs', price: 100 }] },
            { name: 'Vada', img: 'https://images.unsplash.com/photo-1621510456681-229ef554413b?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 70 }, { name: '4 Pcs', price: 120 }] },
            { name: 'Sambar Vada', img: 'https://images.unsplash.com/photo-1621510456681-229ef554413b?auto=format&fit=crop&w=800&q=80', veg: 1, price: 90 },
            { name: 'Pongal', img: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', veg: 1, price: 100 }
        ]
    },
    {
        category: 'Breads',
        description: 'Freshly baked Indian breads.',
        image: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80',
        color: '#a855f7',
        items: [
            { name: 'Butter Naan', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 50 },
            { name: 'Garlic Naan', img: 'https://images.unsplash.com/photo-1601050633647-8f8f1fc3572c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 70 },
            { name: 'Butter Roti', img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', veg: 1, price: 30 },
            { name: 'Tandoori Roti', img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', veg: 1, price: 25 },
            { name: 'Wheat Roti', img: 'https://images.unsplash.com/photo-1533777857417-3be94ac9d439?auto=format&fit=crop&w=800&q=80', veg: 1, price: 25 },
            { name: 'Laccha Paratha', img: 'https://images.unsplash.com/photo-1625272333420-a6e54f767851?auto=format&fit=crop&w=800&q=80', veg: 1, price: 60 },
            { name: 'Lachha Parotta', img: 'https://images.unsplash.com/photo-1625272333420-a6e54f767851?auto=format&fit=crop&w=800&q=80', veg: 1, price: 60 }
        ]
    },
    {
        category: 'Salads',
        description: 'Fresh and crunchy sides.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        color: '#2dd4bf',
        items: [
            { name: 'Green Salad', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 120 },
            { name: 'Kachumber Salad', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 110 }
        ]
    },
    {
        category: 'Beverages',
        description: 'Refreshing drinks and shakes.',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
        color: '#3b82f6',
        items: [
            { name: 'Coke', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '250ml', price: 40 }, { name: '750ml', price: 80 }, { name: '1.25L', price: 120 }] },
            { name: 'Pepsi', img: 'https://images.unsplash.com/photo-1516743618621-af97d8b53ac5?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '250ml', price: 40 }, { name: '750ml', price: 80 }, { name: '1.25L', price: 120 }] },
            { name: 'Fresh Lime Soda', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 60 },
            { name: 'Lemon Juice', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', veg: 1, price: 50 },
            { name: 'Mango Lassi', img: 'https://images.unsplash.com/photo-1546173159-315724a9d669?auto=format&fit=crop&w=800&q=80', veg: 1, price: 100 },
            { name: 'Sweet Lassi', img: 'https://images.unsplash.com/photo-1546173159-315724a9d669?auto=format&fit=crop&w=800&q=80', veg: 1, price: 80 },
            { name: 'Water Bottle', img: 'https://images.unsplash.com/photo-1548919973-5dea585f396a?auto=format&fit=crop&w=800&q=80', veg: 1, price: 25 }
        ]
    },
    {
        category: 'Desserts',
        description: 'Sweet ending to your perfect meal.',
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
        color: '#ec4899',
        items: [
            { name: 'Gulab Jamun', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 80 }, { name: '5 Pcs', price: 180 }] },
            { name: 'Rasmalai', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: '2 Pcs', price: 100 }, { name: '4 Pcs', price: 180 }] },
            { name: 'Chocolate Brownie', img: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?auto=format&fit=crop&w=800&q=80', veg: 1, price: 150 },
            { name: 'Ice Cream', img: 'https://images.unsplash.com/photo-1501443762994-32cf4da996f0?auto=format&fit=crop&w=800&q=80', veg: 1, variants: [{ name: 'Single Scoop', price: 80 }, { name: 'Double Scoop', price: 140 }] },
            { name: 'Carrot Halwa', img: 'https://images.unsplash.com/photo-1589112231135-9d55cb727d2c?auto=format&fit=crop&w=800&q=80', veg: 1, price: 120 },
            { name: 'Malai Kulfi', img: 'https://images.unsplash.com/photo-1572435555646-7787038e1215?auto=format&fit=crop&w=800&q=80', veg: 1, price: 80 }
        ]
    }
];

const updateMenu = async () => {
    try {
        console.log('--- UPDATING MENU WITH SIZES ---');
        
        // Ensure database is connected
        const dbName = process.env.MYSQL_DATABASE || 'kagzso_kot_seed';
        await mysql.query(`USE \`${dbName}\``);

        const catMap = {};
        
        for (const cat of menuData) {
            // Check if category exists
            const [existingCat] = await mysql.query('SELECT id FROM categories WHERE name = ? LIMIT 1', [cat.category]);
            let catId;

            if (existingCat.length > 0) {
                catId = existingCat[0].id;
                // Update category if needed
                await mysql.query(
                    'UPDATE categories SET description = ?, image = ?, color = ? WHERE id = ?',
                    [cat.description, cat.image, cat.color, catId]
                );
                console.log(`Updated Category: ${cat.category}`);
            } else {
                catId = crypto.randomUUID();
                await mysql.query(
                    'INSERT INTO categories (id, name, description, image, color, status) VALUES (?, ?, ?, ?, ?, "active")',
                    [catId, cat.category, cat.description, cat.image, cat.color]
                );
                console.log(`Created Category: ${cat.category}`);
            }
            catMap[cat.category] = catId;

            for (const item of cat.items) {
                const variantsJson = item.variants ? JSON.stringify(item.variants) : null;
                const price = item.price || (item.variants ? item.variants[0].price : 0);
                
                // Check if item exists
                const [existingItem] = await mysql.query('SELECT id FROM menu_items WHERE name = ? AND category_id = ? LIMIT 1', [item.name, catId]);
                
                if (existingItem.length > 0) {
                    const itemId = existingItem[0].id;
                    await mysql.query(
                        'UPDATE menu_items SET price = ?, variants = ?, image = ?, is_veg = ? WHERE id = ?',
                        [price, variantsJson, item.img, item.veg, itemId]
                    );
                    console.log(` - Updated Item: ${item.name} (with sizes & images)`);
                } else {
                    const itemId = crypto.randomUUID();
                    await mysql.query(
                        'INSERT INTO menu_items (id, name, price, category_id, image, is_veg, variants, availability) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                        [itemId, item.name, price, catId, item.img, item.veg, variantsJson]
                    );
                    console.log(` - Added Item: ${item.name} (with sizes & images)`);
                }
            }
        }

        console.log('\n--- MENU UPDATE COMPLETE ---');
        process.exit(0);

    } catch (error) {
        console.error('ERROR UPDATING MENU:', error);
        process.exit(1);
    }
};

updateMenu();
