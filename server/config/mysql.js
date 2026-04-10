const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Debug logs for environment variables
console.log('🔧 DB Connection Config:');
console.log('  DB HOST:', process.env.MYSQL_HOST);
console.log('  DB USER:', process.env.MYSQL_USER);
console.log('  DB NAME:', process.env.MYSQL_DATABASE);
console.log('  DB PORT:', process.env.MYSQL_PORT);

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection
(async () => {
    try {
        const conn = await pool.getConnection();
        logger.info(`[MySQL] Connected to database: ${process.env.MYSQL_DATABASE}`);
        conn.release();
    } catch (err) {
        logger.error(`[MySQL] Connection failed: ${err.message}`);
    }
})();

module.exports = pool;
