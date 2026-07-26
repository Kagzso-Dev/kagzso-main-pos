const cron = require('node-cron');
const mysql = require('../config/mysql');
const { runBackup } = require('./backupService');

// Map of tenantId (string) → ScheduledTask
const jobs = new Map();

const toCronExpr = (frequency, time) => {
    const [hh = 2, mm = 0] = (time || '02:00').split(':').map(Number);
    switch (frequency) {
        case 'hourly':  return `0 * * * *`;
        case 'daily':   return `${mm} ${hh} * * *`;
        case 'weekly':  return `${mm} ${hh} * * 1`;
        case 'monthly': return `${mm} ${hh} 1 * *`;
        case 'yearly':  return `${mm} ${hh} 1 1 *`;
        default:        return `${mm} ${hh} * * *`;
    }
};

const scheduleJob = (tenantId, frequency, time) => {
    const key = String(tenantId);

    if (jobs.has(key)) {
        jobs.get(key).stop();
        jobs.delete(key);
    }

    const expr = toCronExpr(frequency, time);
    if (!cron.validate(expr)) {
        console.error(`[Scheduler] Invalid cron for tenant ${tenantId}: "${expr}"`);
        return;
    }

    const task = cron.schedule(expr, () => runBackup(tenantId), { timezone: 'Asia/Kolkata' });
    jobs.set(key, task);
    console.log(`[Scheduler] Tenant ${tenantId} scheduled — ${frequency} at ${time || 'top of hour'} → "${expr}"`);
};

const cancelJob = (tenantId) => {
    const key = String(tenantId);
    if (jobs.has(key)) {
        jobs.get(key).stop();
        jobs.delete(key);
        console.log(`[Scheduler] Tenant ${tenantId} backup cancelled`);
    }
};

// Called once at server startup
const initScheduler = async () => {
    try {
        const [rows] = await mysql.query(
            'SELECT tenant_id, backup_schedule_config FROM settings WHERE backup_schedule_config IS NOT NULL'
        );

        let count = 0;
        for (const row of rows) {
            const raw = row.backup_schedule_config;
            const cfg = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
            if (cfg?.backupEnabled) {
                scheduleJob(row.tenant_id, cfg.frequency || 'daily', cfg.time || '02:00');
                count++;
            }
        }
        console.log(`[Scheduler] Started — ${count} active backup job(s)`);
    } catch (err) {
        console.error('[Scheduler] Init failed:', err.message);
    }
};

// Called by updateBackupSchedule controller after saving
const refreshTenantSchedule = (tenantId, cfg) => {
    if (cfg?.backupEnabled) {
        scheduleJob(tenantId, cfg.frequency || 'daily', cfg.time || '02:00');
    } else {
        cancelJob(tenantId);
    }
};

module.exports = { initScheduler, refreshTenantSchedule };
