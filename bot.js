const { Client, LocalAuth, NoAuth, LocalWebCacheOptions } = require("whatsapp-web.js");
const qrcodeTerm = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

const getBrowserPath = () => {
  const isPkg = typeof process.pkg !== 'undefined';
  const execDir = isPkg ? path.dirname(process.execPath) : process.cwd();

  // Potential locations for portable browser
  const locations = [
    path.join(execDir, 'browsers'),
    path.join(execDir, 'bin', 'browsers'),
    path.join(__dirname, 'bin', 'browsers'),
    // Also check parent dir if in a subfolder release
    path.join(path.dirname(execDir), 'browsers')
  ];

  const platform = process.platform === 'win32' ? 'win' : 'linux';
  const binary = process.platform === 'win32' ? 'chrome.exe' : 'chrome';

  for (const loc of locations) {
    const fullPath = path.join(loc, platform, binary);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  // Fallback to system chrome
  return process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/google-chrome';
};

const newBotClient = (sendEvent) => {
  const browserPath = process.env.CHROME_PATH || getBrowserPath();

  const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
      executablePath: browserPath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-namespace-sandbox",
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certificate-errors",
        "--ignore-certificate-errors-spki-list",
        "--disable-extensions"
      ],
    },
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-session',
      dataPath: path.join(process.cwd(), '.wwebjs_auth')
    }),
    webVersion: "2.2405.4"
  });

  client.on("qr", (qr) => {
    qrcodeTerm.generate(qr, { small: true })
    sendEvent("qr", qr);
  });

  client.on("ready", () => {
    console.log("Whatsapp is ready!");
    sendEvent("ready", "");
  });

  client.on("authenticated", () => {
    console.log("AUTHENTICATED");
    sendEvent("authenticated", "");
  });

  client.on("auth_failure", () => console.log("Auth failure, restarting..."));

  client.on("disconnected", () => {
    console.log("client disconnected");
    client.initialize();
  });

  client.on("message", (msg) => {
    if (msg.body == "!ping") {
      msg.reply("pong");
    } else if (msg.body == "good morning") {
      msg.reply("selamat pagi");
    } else if (msg.body == "!groups") {
      client.getChats().then((chats) => {
        const groups = chats.filter((chat) => chat.isGroup);

        if (groups.length == 0) {
          msg.reply("You have no group yet.");
        } else {
          let replyMsg = "*YOUR GROUPS*\n\n";
          groups.forEach((group, i) => {
            replyMsg += `ID: ${group.id._serialized}\nName: ${group.name}\n\n`;
          });
          replyMsg +=
            "_You can use the group id to send a message to the group._";
          msg.reply(replyMsg);
        }
      });
    } else if (msg.body == "!list") {
      const groupId = '120363041809044407@g.us'

      client.getChatById(groupId).then((groupchat) => {
        if (groupchat.isGroup) {
          let listParticipant = ''
          const groupchatParticipants = groupchat.participants;
          groupchatParticipants.forEach((participant) => {
            listParticipant += `${participant.id.user},`
          });
          msg.reply(listParticipant);
          // console.log(groupchatParticipants)
        }
      });
    }
  });

  client.initialize();
  return client;
};

module.exports = { newBotClient };
