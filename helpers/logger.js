const fs = require('fs');
const path = require('path');

/**
 * Get current date string in YYYY-MM-DD format
 */
const getDateDir = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
};

/**
 * Get current hour string in HH format
 */
const getHourDir = () => {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0');
};

/**
 * Ensure directory exists
 */
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Log message to file
 * Path structure: /logs/YYYY-MM-DD/HH/HH/activity.log
 */
const log = (message, type = 'INFO') => {
    const dateDir = getDateDir();
    const hourDir = getHourDir();

    // As per request: logs/tanggal/jam/jam
    const logDir = path.join(__dirname, '../logs', dateDir, hourDir, hourDir);
    ensureDir(logDir);

    const logFile = path.join(logDir, 'activity.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}\n`;

    fs.appendFileSync(logFile, logEntry);
    console.log(logEntry.trim());
};

module.exports = {
    log
};
