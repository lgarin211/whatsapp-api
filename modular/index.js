const statusRoutes = require("./routes/status");
const messageRoutes = require("./routes/message");
const groupRoutes = require("./routes/group");
const chatRoutes = require("./routes/chat");
const logRoutes = require("./routes/logs");

module.exports = function (app, sendEvent) {
    statusRoutes(app);
    messageRoutes(app);
    groupRoutes(app);
    chatRoutes(app);
    logRoutes(app);

    // Initialize WhatsApp client with sendEvent if it's imported elsewhere
    require("./whatsapp").init(sendEvent);
};
