const { createLogger, format, transports } = require('winston');
const path = require('path');

const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
);

const logger = createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'whatsapp-api' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `app.log`
        //
        new transports.File({ filename: path.join(__dirname, 'logs/error.log'), level: 'error' }),
        new transports.File({ filename: path.join(__dirname, 'logs/app.log') }),
    ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.simple()
        ),
    }));
}

module.exports = logger;
