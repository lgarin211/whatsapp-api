const { body, validationResult } = require("express-validator");
const { phoneNumberFormatter } = require("../../helpers/formatter");
const { client, checkRegisteredNumber } = require("../whatsapp");

module.exports = function (app) {
    /**
     * @openapi
     * /clear-message:
     *   post:
     *     description: Clear messages on a specific WhatsApp chat
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - number
     *             properties:
     *               number:
     *                 type: string
     *     responses:
     *       200:
     *         description: Messages cleared successfully
     *       422:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    app.post("/clear-message", [body("number").notEmpty()], async (req, res) => {
        const errors = validationResult(req).formatWith(({ msg }) => {
            return msg;
        });

        if (!errors.isEmpty()) {
            return res.status(422).json({
                status: false,
                message: errors.mapped(),
            });
        }

        const number = phoneNumberFormatter(req.body.number);

        const isRegisteredNumber = await checkRegisteredNumber(number);

        if (!isRegisteredNumber) {
            return res.status(422).json({
                status: false,
                message: "The number is not registered",
            });
        }

        const chat = await client.getChatById(number);

        chat
            .clearMessages()
            .then((status) => {
                res.status(200).json({
                    status: true,
                    response: status,
                });
            })
            .catch((err) => {
                res.status(500).json({
                    status: false,
                    response: err,
                });
            });
    });
};
