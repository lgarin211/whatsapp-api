const { log } = require("../../helpers/logger");

module.exports = function (app) {
    /**
     * @openapi
     * /whatsapp-status:
     *   get:
     *     description: WhatsApp connection status endpoint (SSE disabled)
     *     responses:
     *       200:
     *         description: Status message
     */
    app.get("/whatsapp-status", (req, res) => {
        log('Request: GET /whatsapp-status');
        res.json({ message: "SSE functionality has been removed for a leaner codebase. Use other API endpoints for status." });
    });
};
