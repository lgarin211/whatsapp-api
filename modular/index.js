const statusRoutes = require("./routes/status");
const messageRoutes = require("./routes/message");
const groupRoutes = require("./routes/group");
const chatRoutes = require("./routes/chat");

module.exports = function (app) {
    statusRoutes(app);
    messageRoutes(app);
    groupRoutes(app);
    chatRoutes(app);
};
