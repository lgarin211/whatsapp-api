const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcodeTerm = require("qrcode-terminal");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");

// Helper to find Chrome binary within the local externalcomponen cache
const findChromeExecutable = () => {
    const defaultPuppeteerCache = path.join(__dirname, 'externalcomponen', 'puppeteer_cache', 'chrome');
    if (!fs.existsSync(defaultPuppeteerCache)) return null;

    // Recursively find the 'chrome' binary
    const findChrome = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const tempPath = path.join(dir, file);
            const stat = fs.statSync(tempPath);
            if (stat.isDirectory()) {
                const found = findChrome(tempPath);
                if (found) return found;
            } else if (file === 'chrome' && stat.mode & 0o111) { // is executable
                return tempPath;
            }
        }
        return null;
    };

    return findChrome(defaultPuppeteerCache);
};

const newBotClient = (sendEvent) => {
    const puppeteerOptions = {
        headless: true,
        handleSIGINT: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-default-apps",
            "--mute-audio",
            "--no-default-browser-check",
        ],
    };

    // If we've bundled Chrome via pack-dependencies.sh, force Puppeteer to use it.
    const bundledChromePath = findChromeExecutable();
    if (bundledChromePath) {
        logger.info(`Using bundled Chromium at: ${bundledChromePath}`);
        puppeteerOptions.executablePath = bundledChromePath;
    }

    const client = new Client({
        restartOnAuthFail: true,
        authStrategy: new LocalAuth({
            clientId: "session-revem"
        }),
        puppeteer: puppeteerOptions
    });

    // Capture browser events if possible
    client.on('qr', (qr) => {
        logger.info("QR RECEIVED", qr);
        // Print QR code to terminal
        qrcodeTerm.generate(qr, { small: true });
        sendEvent("qr", qr);
    });

    client.on('ready', () => {
        logger.info("Whatsapp is ready!");
        sendEvent("ready", "");
    });

    client.on("authenticated", () => {
        logger.info("AUTHENTICATED");
        sendEvent("authenticated", "");
    });

    client.on("auth_failure", (msg) => {
        logger.error("AUTHENTICATION FAILURE", msg);
        sendEvent("auth_failure", msg);
    });

    client.on('loading_screen', (percent, message) => {
        logger.info(`LOADING SCREEN: ${percent}% - ${message}`);
        sendEvent("loading_screen", { percent, message });
    });

    client.on("disconnected", (reason) => {
        logger.info("client disconnected", reason);
        sendEvent("disconnected", reason);
    });

    client.on("message", (msg) => {
        if (msg.body === "!ping") {
            msg.reply("pong");
            logger.info('Outgoing bot reply', { type: 'text', recipient: msg.from, content: 'pong', category: 'BOT' });
        } else if (msg.body.toLowerCase() === "good morning") {
            msg.reply("selamat pagi");
            logger.info('Outgoing bot reply', { type: 'text', recipient: msg.from, content: 'selamat pagi', category: 'BOT' });
        } else if (msg.body === "!groups") {
            client.getChats().then((chats) => {
                const groups = chats.filter((chat) => chat.isGroup);

                if (groups.length === 0) {
                    msg.reply("You have no group yet.");
                    logger.info('Outgoing bot reply', { type: 'text', recipient: msg.from, content: 'You have no group yet.', category: 'BOT' });
                } else {
                    let replyMsg = "*YOUR GROUPS*\n\n";
                    groups.forEach((group, i) => {
                        replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
                    });
                    replyMsg +=
                        "_You can use the group id to send a message to the group._";
                    msg.reply(replyMsg);
                    logger.info('Outgoing bot reply', { type: 'text', recipient: msg.from, content: 'Groups List', category: 'BOT' });
                }
            });
        }
    });

    return client;
};

module.exports = { newBotClient };
