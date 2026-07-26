require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('../config/mysql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createSuperAdmin() {
    try {
        // Check if superadmin already exists
        const [existing] = await mysql.query("SELECT id, username FROM users WHERE username = 'superadmin' LIMIT 1");

        if (existing.length > 0) {
            console.log('Superadmin already exists. Resetting password...');
            const hashed = await bcrypt.hash('super@admin123', 10);
            await mysql.query("UPDATE users SET password_hash = ?, role = 'superadmin', tenant_id = NULL WHERE username = 'superadmin'", [hashed]);
            console.log('Password reset to: super@admin123');
        } else {
            const hashed = await bcrypt.hash('super@admin123', 10);
            await mysql.query(
                'INSERT INTO users (id, username, password_hash, role, name, is_verified, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), 'superadmin', hashed, 'superadmin', 'Super Admin', 1, null]
            );
            console.log('Superadmin created successfully!');
        }

        console.log('\n--- SUPERADMIN CREDENTIALS ---');
        console.log('Username: superadmin');
        console.log('Password: super@admin123');
        console.log('------------------------------\n');

        // Verify login works
        const [rows] = await mysql.query("SELECT id, username, password_hash, role, tenant_id FROM users WHERE username = 'superadmin' LIMIT 1");
        if (rows[0]) {
            const match = await bcrypt.compare('super@admin123', rows[0].password_hash);
            console.log('Password verification:', match ? 'PASS' : 'FAIL');
            console.log('Role:', rows[0].role);
            console.log('TenantId:', rows[0].tenant_id);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();
