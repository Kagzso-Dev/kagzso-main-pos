require('dotenv').config();
const fs = require('fs');
const mysql = require('./config/mysql');

async function importDB() {
    try {
        console.log('--- STARTING DATABASE IMPORT ---');
        console.log('Targeting DB:', process.env.MYSQL_DATABASE, '@', process.env.MYSQL_HOST);
        
        if (!fs.existsSync('local_dump.sql')) {
            console.error('Error: local_dump.sql not found!');
            process.exit(1);
        }

        const sql = fs.readFileSync('local_dump.sql', 'utf8');
        
        // Simple splitter for basic SQL dumps
        // Note: This splits by semicolon and newline
        const queries = sql.split(/;\s*\n/).filter(q => q.trim().length > 0);

        await mysql.query('SET FOREIGN_KEY_CHECKS = 0');
        
        for (let query of queries) {
            try {
                await mysql.query(query);
            } catch (queryErr) {
                console.warn(`Warning at query: ${query.substring(0, 50)}...`);
                console.warn(queryErr.message);
            }
        }

        await mysql.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('--- IMPORT SUCCESSFUL ---');
    } catch (err) {
        console.error('--- IMPORT FAILED ---');
        console.error(err.stack);
    } finally {
        process.exit(0);
    }
}

importDB();
