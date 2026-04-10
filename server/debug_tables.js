require('dotenv').config();
const mysql = require('./config/mysql');

async function run() {
    try {
        const [rows] = await mysql.execute('SELECT * FROM tables ORDER BY number ASC');
        console.log('--- TABLE LIST ---');
        rows.forEach(r => {
            console.log(`Number: [${r.number}] | ID: ${r.id} | Capacity: ${r.capacity}`);
        });
        console.log('--- END ---');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
run();
