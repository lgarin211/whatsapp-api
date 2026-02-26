const crypto = require("crypto");
let whatsappStatus = "starting";
let lastQr = "";
let streamRes = {};
const sendEvent = (event, data) => {
    whatsappStatus = event;
    lastQr = data;
    for (let key in streamRes) {
        streamRes[key].write(`event: ${event}\n`);
        if (data !== "") {
            streamRes[key].write(`data: ${data}\n`);
        }
        streamRes[key].write(`\n`);
    }
}

const registerSse = (resp) => {
    let id = crypto.randomUUID();
    streamRes[id] = resp;
    return id;
}

const unregisterSse = (id) => {
    streamRes[id].end();
    delete streamRes[id];
}

const sendLastDataSse = (res) => {
    if (whatsappStatus === "") {
        return;
    }
    res.write(`event: ${whatsappStatus}\n`);
    if (lastQr !== "") {
        res.write(`data: ${lastQr}\n`);
    }
    res.write(`\n`);
}

module.exports = {sendEvent, registerSse, unregisterSse, sendLastDataSse}