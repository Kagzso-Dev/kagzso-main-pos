const mysql = require('../config/mysql');

const Counter = {
    async getNextSequence(key) {
        let rows;
        [rows] = await mysql.query('SELECT * FROM counters WHERE counter_key = ? LIMIT 1', [key]);
        const document = rows[0];

        if (!document) {
            await mysql.query('INSERT INTO counters (counter_key, sequence_value) VALUES (?, 0)', [key]);
            return this.getNextSequence(key);
        }
        
        const newVal = (document.sequence_value || 0) + 1;
        await mysql.query('UPDATE counters SET sequence_value = ? WHERE counter_key = ?', [newVal, key]);
        return newVal;
    },
};

module.exports = Counter;
