const { registerSse, unregisterSse, sendLastDataSse } = require("../../sse");

module.exports = function (app) {
    /**
     * @openapi
     * /whatsapp-status:
     *   get:
     *     description: Get WhatsApp connection status via SSE
     *     responses:
     *       200:
     *         description: SSE stream
     */
    app.get("/whatsapp-status", (req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // flush the headers to establish SSE with client

        let id = registerSse(res);
        sendLastDataSse(res);
        // If client closes connection, stop sending events
        res.on('close', () => {
            unregisterSse(id);
        });
    });
};
