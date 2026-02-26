const { newBotClient } = require("../bot");

const client = newBotClient();

const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
};

const findGroupByName = async function (name) {
    const group = await client.getChats().then((chats) => {
        return chats.find(
            (chat) => chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
        );
    });
    return group;
};

module.exports = {
    client,
    checkRegisteredNumber,
    findGroupByName,
};
