const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcodeTerm = require("qrcode-terminal");
const logger = require("./logger");

const newBotClient = (sendEvent) => {
    const client = new Client({
        restartOnAuthFail: true,
        authStrategy: new LocalAuth({
            clientId: "session-revem"
        }),
        puppeteer: {
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
            ],
        }
    });

    client.on("qr", (qr) => {
        logger.info('QR Code received/updated');
        qrcodeTerm.generate(qr, { small: true });
        sendEvent("qr", qr);
    });

    client.on("ready", () => {
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
