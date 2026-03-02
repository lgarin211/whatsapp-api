const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');

// Logger setup
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
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let isClientReady = false;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "session-revem"
    }),
    puppeteer: {
        headless: true,
        handleSIGINT: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    logger.info('QR Code received/updated');
    qrcode.generate(qr, { small: true });
    io.emit('qr', qr);
});

client.on('ready', () => {
    logger.info('Client is ready!');
    isClientReady = true;
});

client.on('loading_screen', (percent, message) => {
    logger.info(`LOADING SCREEN: ${percent}% - ${message}`);
});

client.on('disconnected', (reason) => {
    logger.info('Client was logged out', reason);
    isClientReady = false;
});

client.on('authenticated', () => {
    logger.info('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    logger.error('AUTHENTICATION FAILURE', msg);
    isClientReady = false;
});

client.on('message', async msg => {
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

// API Routes
app.post('/send-message', async (req, res) => {
    let { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ status: false, message: 'Number and message are required' });
    }

    try {
        // Format number: hilangkan karakter non-digit
        number = number.replace(/\D/g, '');

        // Jika diawali dengan '0', ganti dengan '62'
        if (number.startsWith('0')) {
            number = '62' + number.slice(1);
        }

        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;

        // Cekapakah client sudah siap
        if (!isClientReady) {
            return res.status(503).json({ status: false, message: 'WhatsApp client is not ready yet. Please wait for initialization or scan QR code.' });
        }

        try {
            const state = await client.getState();
            if (state !== 'CONNECTED') {
                return res.status(500).json({ status: false, message: 'WhatsApp client is not connected' });
            }
        } catch (e) {
            logger.error('Error getting client state:', e);
            return res.status(500).json({ status: false, message: 'WhatsApp client state error: ' + e.message });
        }

        await client.sendMessage(chatId, message);
        res.status(200).json({ status: true, message: 'Message sent!' });
    } catch (error) {
        logger.error('Error sending message detailed:', {
            error: error.message,
            stack: error.stack,
            number: number
        });
        res.status(500).json({ status: false, message: 'Failed to send message: ' + error.message });
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    client.initialize();
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    // Set a timeout to force quit if it takes too long
    const timeout = setTimeout(() => {
        logger.error('Shutdown timed out, forcing exit.');
        process.exit(1);
    }, 5000);

    try {
        if (client) {
            logger.info('Destroying WhatsApp client...');
            await client.destroy();
        }

        if (server) {
            logger.info('Closing HTTP server...');
            server.close(() => {
                logger.info('HTTP server closed.');
                clearTimeout(timeout);
                process.exit(0);
            });
        } else {
            clearTimeout(timeout);
            process.exit(0);
        }
    } catch (err) {
        logger.error('Error during shutdown:', err);
        clearTimeout(timeout);
        process.exit(1);
    }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
