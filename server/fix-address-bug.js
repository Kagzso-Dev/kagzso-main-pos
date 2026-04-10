require('dotenv').config();
const mysql = require('./config/mysql');

async function fixSchema() {
    try {
        console.log('Checking settings table for address column...');
        const [columns] = await mysql.query('SHOW COLUMNS FROM settings LIKE "address"');
        
        if (columns.length === 0) {
            console.log('Adding address column to settings table...');
            await mysql.query('ALTER TABLE settings ADD COLUMN address TEXT AFTER restaurant_name');
            console.log('SUCCESS: address column added.');
        } else {
            console.log('Column address already exists.');
        }
    } catch (error) {
        console.error('Error fixing schema:', error.message);
    } finally {
        process.exit(0);
    }
}

fixSchema();
