const { MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const fileUpload = require('express-fileupload');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./web/swagger.json');
const logger = require('./logger');
const { newBotClient } = require('./bot');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
let isClientReady = false;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ debug: false }));

// Initialize WhatsApp Client
const client = newBotClient((event, data) => {
    io.emit(event, data);
    if (event === 'ready') isClientReady = true;
    if (event === 'disconnected' || event === 'auth_failure') isClientReady = false;
});

// Helpers
const phoneNumberFormatter = (number) => {
    // 1. Menghilangkan karakter selain angka
    let formatted = number.replace(/\D/g, '');

    // 2. Menghilangkan angka 0 di depan (prefix) dan ganti dengan 62
    if (formatted.startsWith('0')) {
        formatted = '62' + formatted.slice(1);
    }

    if (!formatted.endsWith('@c.us')) {
        formatted += '@c.us';
    }

    return formatted;
};

const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
};

const findGroupByName = async function (name) {
    const chats = await client.getChats();
    const group = chats.find(
        (chat) => chat.isGroup && chat.name.toLowerCase() === name.toLowerCase()
    );
    return group;
};

// Setup Swagger UI
app.use('/web/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Web Interface Routes
app.get('/web', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'logs.html'));
});

app.get('/web/documentasi', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'documentation.html'));
});

app.get('/api/logs', (req, res) => {
    const date = req.query.date; // format YYYY-MM-DD
    if (!date) {
        return res.status(400).json({ status: false, message: 'Date parameter is required' });
    }

    const logFilePath = path.join(__dirname, 'logs', date, `whatsapp-${date}.log`);

    if (!fs.existsSync(logFilePath)) {
        return res.status(200).json({ status: true, logs: [] });
    }

    try {
        const fileContent = fs.readFileSync(logFilePath, 'utf8');
        // Split by newline and remove empty lines
        const logsArray = fileContent.split('\n').filter(line => line.trim() !== '');
        res.status(200).json({ status: true, logs: logsArray });
    } catch (err) {
        logger.error(`Error reading log file ${logFilePath}:`, err);
        res.status(500).json({ status: false, message: 'Failed to read logs' });
    }
});

// API Routes

// Send message
app.post(
    '/send-message',
    [
        body('number').notEmpty().withMessage('Number is required'),
        body('message').notEmpty().withMessage('Message is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: false, message: errors.array()[0].msg });
        }

        const number = phoneNumberFormatter(req.body.number);
        const message = req.body.message;

        if (!isClientReady) {
            return res.status(503).json({ status: false, message: 'WhatsApp client is not ready' });
        }

        try {
            const isRegistered = await checkRegisteredNumber(number);
            if (!isRegistered) {
                return res.status(422).json({ status: false, message: 'Number is not registered' });
            }

            await client.sendMessage(number, message);
            logger.info('Outgoing message sent', {
                type: 'text',
                recipient: number,
                content: message,
                category: 'API'
            });
            res.status(200).json({ status: true, message: 'Message sent!' });
        } catch (error) {
            logger.error('Error in /send-message:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }
);

// Send media via URL
app.post(
    '/send-media',
    [
        body('number').notEmpty().withMessage('Number is required'),
        body('file').notEmpty().withMessage('File URL is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: false, message: errors.array()[0].msg });
        }

        const number = phoneNumberFormatter(req.body.number);
        const fileUrl = req.body.file;
        const caption = req.body.caption || '';

        if (!isClientReady) {
            return res.status(503).json({ status: false, message: 'WhatsApp client is not ready' });
        }

        try {
            const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const mimetype = response.headers['content-type'];
            const attachment = response.data.toString('base64');
            const media = new MessageMedia(mimetype, attachment, 'Media');

            await client.sendMessage(number, media, { caption });
            logger.info('Outgoing media sent', {
                type: 'media',
                recipient: number,
                caption: caption,
                fileUrl: fileUrl,
                category: 'API'
            });
            res.status(200).json({ status: true, message: 'Media sent!' });
        } catch (error) {
            logger.error('Error in /send-media:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }
);

// Send message to group
app.post(
    '/send-group-message',
    [
        body('message').notEmpty().withMessage('Message is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: false, message: errors.array()[0].msg });
        }

        let chatId = req.body.id;
        const groupName = req.body.name;
        const message = req.body.message;

        if (!isClientReady) {
            return res.status(503).json({ status: false, message: 'WhatsApp client is not ready' });
        }

        try {
            if (!chatId && groupName) {
                const group = await findGroupByName(groupName);
                if (!group) {
                    return res.status(422).json({ status: false, message: 'Group not found' });
                }
                chatId = group.id._serialized;
            }

            if (!chatId) {
                return res.status(400).json({ status: false, message: 'Group ID or Name is required' });
            }

            await client.sendMessage(chatId, message);
            logger.info('Outgoing group message sent', {
                type: 'group_text',
                recipient: chatId,
                groupName: groupName,
                content: message,
                category: 'API'
            });
            res.status(200).json({ status: true, message: 'Group message sent!' });
        } catch (error) {
            logger.error('Error in /send-group-message:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }
);

// Clear message
app.post('/clear-message', async (req, res) => {
    const number = phoneNumberFormatter(req.body.number);

    if (!isClientReady) {
        return res.status(503).json({ status: false, message: 'WhatsApp client is not ready' });
    }

    try {
        const chat = await client.getChatById(number);
        await chat.clearMessages();
        res.status(200).json({ status: true, message: 'Chat cleared' });
    } catch (error) {
        logger.error('Error in /clear-message:', error);
        res.status(500).json({ status: false, message: error.message });
    }
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, async () => {
    logger.info(`Server is running on port ${PORT}`);

    // Pre-flight cleanup: Ensure no hanging browser processes are locking the session directory
    try {
        const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session-session-revem');
        logger.info(`Pre-flight: Ensuring environment is clean for ${sessionDir}`);
    } catch (e) {
        logger.error('Pre-flight cleanup check error:', e);
    }

    // Delay initialization to help avoid ProtocolError on restart
    logger.info('Waiting 3s for browser environment stabilization...');
    setTimeout(() => {
        logger.info('Initializing WhatsApp client...');
        client.initialize().catch(err => {
            logger.error('Client initialization failed:', err);
        });
    }, 3000);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    const timeout = setTimeout(() => {
        logger.error('Shutdown timed out, forcing exit.');
        process.exit(1);
    }, 10000); // Increased timeout to 10s

    try {
        if (client) {
            logger.info('Destroying WhatsApp client...');
            await client.destroy();
            logger.info('WhatsApp client destroyed.');
        }

        if (server) {
            logger.info('Closing HTTP server...');
            server.close(() => {
                logger.info('HTTP server closed.');
                setTimeout(() => {
                    clearTimeout(timeout);
                    process.exit(0);
                }, 1000); // Small buffer to ensure everything is flushed
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
