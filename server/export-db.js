require('dotenv').config();
const fs = require('fs');
const mysql = require('./config/mysql');

async function exportDB() {
    try {
        console.log('--- STARTING DATABASE EXPORT ---');
        let sqlDump = '-- Kagzso POS Database Dump\n';
        sqlDump += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

        // 1. Get all tables
        const [tables] = await mysql.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        for (const tableName of tableNames) {
            console.log(`Exporting table: ${tableName}...`);
            
            // 2. Get Table Structure
            const [createTable] = await mysql.query(`SHOW CREATE TABLE \`${tableName}\``);
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sqlDump += createTable[0]['Create Table'] + ';\n\n';

            // 3. Get Table Data
            const [rows] = await mysql.query(`SELECT * FROM \`${tableName}\``);
            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const insertStatement = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES \n`;
                
                const values = rows.map(row => {
                    const rowValues = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                        return val;
                    });
                    return `(${rowValues.join(', ')})`;
                }).join(',\n') + ';';

                sqlDump += insertStatement + values + '\n\n';
            }
        }

        sqlDump += '\nSET FOREIGN_KEY_CHECKS = 1;';
        
        fs.writeFileSync('local_dump.sql', sqlDump);
        console.log('--- EXPORT SUCCESSFUL: local_dump.sql created ---');
    } catch (err) {
        console.error('--- EXPORT FAILED ---');
        console.error(err.message);
    } finally {
        process.exit(0);
    }
}

exportDB();
