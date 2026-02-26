const { body, validationResult } = require("express-validator");
const { MessageMedia } = require("whatsapp-web.js");
const axios = require("axios");
const { phoneNumberFormatter } = require("../../helpers/formatter");
const { client, checkRegisteredNumber } = require("../whatsapp");
const { log } = require("../../helpers/logger");


module.exports = function (app) {
    /**
     * @openapi
     * /send-message:
     *   post:
     *     description: Send a text message to a WhatsApp number
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - number
     *               - message
     *             properties:
     *               number:
     *                 type: string
     *               message:
     *                 type: string
     *     responses:
     *       200:
     *         description: Message sent successfully
     *       422:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    app.post(
        "/send-message",
        [body("number").notEmpty(), body("message").notEmpty()],
        async (req, res) => {
            log(`Request: POST /send-message - Number: ${req.body.number}`);
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
            const message = req.body.message;

            const isRegisteredNumber = await checkRegisteredNumber(number);

            if (!isRegisteredNumber) {
                return res.status(422).json({
                    status: false,
                    message: "The number is not registered",
                });
            }

            client
                .sendMessage(number, message)
                .then((response) => {
                    res.status(200).json({
                        status: true,
                        response: response,
                    });
                })
                .catch((err) => {
                    res.status(500).json({
                        status: false,
                        response: err,
                    });
                });
        }
    );

    /**
     * @openapi
     * /send-media:
     *   post:
     *     description: Send media from a URL to a WhatsApp number
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - number
     *               - file
     *             properties:
     *               number:
     *                 type: string
     *               caption:
     *                 type: string
     *               file:
     *                 type: string
     *                 description: URL to the media file
     *     responses:
     *       200:
     *         description: Media sent successfully
     *       500:
     *         description: Server error
     */
    app.post("/send-media", async (req, res) => {
        log(`Request: POST /send-media - Number: ${req.body.number}, URL: ${req.body.file}`);
        const number = phoneNumberFormatter(req.body.number);
        const caption = req.body.caption;
        const fileUrl = req.body.file;

        let mimetype;
        const attachment = await axios
            .get(fileUrl, {
                responseType: "arraybuffer",
            })
            .then((response) => {
                mimetype = response.headers["content-type"];
                return response.data.toString("base64");
            });

        const media = new MessageMedia(mimetype, attachment, "Media");

        client
            .sendMessage(number, media, {
                caption: caption,
            })
            .then((response) => {
                res.status(200).json({
                    status: true,
                    response: response,
                });
            })
            .catch((err) => {
                res.status(500).json({
                    status: false,
                    response: err,
                });
            });
    });

    /**
     * @openapi
     * /send-image:
     *   post:
     *     description: Send an image from a file upload to a WhatsApp number
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             required:
     *               - number
     *               - image
     *             properties:
     *               number:
     *                 type: string
     *               caption:
     *                 type: string
     *               image:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: Image sent successfully
     *       422:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    app.post("/send-image", async (req, res) => {
        log(`Request: POST /send-image - Number: ${req.body.number}`);
        if (!req.files || !req.files.image) {
            return res.status(422).json({
                status: false,
                message: "No image uploaded",
            });
        }

        const number = phoneNumberFormatter(req.body.number);
        const caption = req.body.caption;
        const image = req.files.image;

        const isRegisteredNumber = await checkRegisteredNumber(number);

        if (!isRegisteredNumber) {
            return res.status(422).json({
                status: false,
                message: "The number is not registered",
            });
        }

        const media = new MessageMedia(image.mimetype, image.data.toString("base64"), image.name);

        client
            .sendMessage(number, media, {
                caption: caption,
            })
            .then((response) => {
                res.status(200).json({
                    status: true,
                    response: response,
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
