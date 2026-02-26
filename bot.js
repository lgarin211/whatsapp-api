const { Client, LocalAuth, NoAuth, LocalWebCacheOptions } = require("whatsapp-web.js");
const qrcodeTerm = require("qrcode-terminal");

const newBotClient = (sendEvent) => {
  const client = new Client({
    restartOnAuthFail: true,
    puppeteer: {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        // "--single-process", // <- this one doesn't work in Windows
        "--disable-gpu",
        // "--proxy-server=proxy3.bri.co.id:1707",
      ],
    },
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-session'
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
