require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('../config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { run } = require('./seed-tenants-full');

run(mysql, bcrypt, crypto)
    .then(() => { console.log('\nDONE'); process.exit(0); })
    .catch(e => { console.error('ERROR:', e.message); process.exit(1); });
