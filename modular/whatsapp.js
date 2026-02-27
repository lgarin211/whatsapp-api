const { newBotClient } = require("../bot");

let sendEventBridge = null;

// Initialize the client with a wrapper for sendEvent
const client = newBotClient((event, data) => {
    if (sendEventBridge) {
        sendEventBridge(event, data);
    }
});

const init = (sendEvent) => {
    sendEventBridge = sendEvent;
};

const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
};

module.exports = {
    client,
    init,
    checkRegisteredNumber
};
