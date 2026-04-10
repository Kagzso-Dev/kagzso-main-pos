/**
 * Formats a JavaScript Date object to a MySQL-compatible DATETIME string (YYYY-MM-DD HH:MM:SS)
 * @param {Date|string|number} date - The date to format (defaults to current date)
 * @returns {string} - The formatted MySQL datetime string
 */
const toSqlDate = (date = new Date()) => {
    const d = new Date(date);
    // Return early if invalid date
    if (isNaN(d.getTime())) return null;
    
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

module.exports = { toSqlDate };
