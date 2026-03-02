const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const transport = new winston.transports.DailyRotateFile({
    filename: 'logs/%DATE%/whatsapp-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.json()
    ),
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
        transport
    ],
});

module.exports = logger;
