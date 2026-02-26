const { body, validationResult } = require("express-validator");
const { MessageMedia } = require("whatsapp-web.js");
const axios = require("axios");
const fs = require("fs");
const { client, findGroupByName } = require("../whatsapp");
const { log } = require("../../helpers/logger");


module.exports = function (app) {
    /**
     * @openapi
     * /send-group-media:
     *   post:
     *     description: Send media to a WhatsApp group
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               id:
     *                 type: string
     *               name:
     *                 type: string
     *               caption:
     *                 type: string
     *               mediaPath:
     *                 type: string
     *     responses:
     *       200:
     *         description: Media sent successfully
     *       422:
     *         description: Validation error
     */
    app.post(
        "/send-group-media",
        [
            body("id").custom((value, { req }) => {
                if (!value && !req.body.name) {
                    throw new Error("Invalid value, you can use `id` or `name`");
                }
                return true;
            }),
            body("message").notEmpty(),
        ],
        async (req, res) => {
            log(`Request: POST /send-group-media - ID: ${req.body.id}, Name: ${req.body.name}`);
            let chatId = req.body.id;
            const groupName = req.body.name;

            // Find the group by name
            if (!chatId) {
                const group = await findGroupByName(groupName);
                if (!group) {
                    return res.status(422).json({
                        status: false,
                        message: "No group found with name: " + groupName,
                    });
                }
                chatId = group.id._serialized;
            }

            const number = chatId;
            const caption = req.body.caption;
            const mediaPath = req.body.mediaPath;

            fs.readFile(mediaPath, (err, data) => {
                if (err) console.error(err);

                const mimetype = 'image/jpg';
                const media = new MessageMedia(mimetype, data.toString('base64'), "Media");

                client
                    .sendMessage(number, media, { caption: caption })
                    .then((response) => {
                        res.status(200).json({
                            status: true,
                            response: response,
                        });
                        console.log("file:", mediaPath, " ,success deleted");
                    });
            })
        }
    );

    /**
     * @openapi
     * /send-group-media-file:
     *   post:
     *     description: Send media from a local file path to a WhatsApp group
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - file
     *             properties:
     *               id:
     *                 type: string
     *               name:
     *                 type: string
     *               caption:
     *                 type: string
     *               file:
     *                 type: string
     *                 description: Local file path
     *     responses:
     *       200:
     *         description: Media sent successfully
     *       422:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    app.post(
        "/send-group-media-file",
        [
            body("id").custom((value, { req }) => {
                if (!value && !req.body.name) {
                    throw new Error("Invalid value, you can use `id` or `name`");
                }
                return true;
            }),
            body("message").notEmpty(),
        ],
        async (req, res) => {
            log(`Request: POST /send-group-media-file - ID: ${req.body.id}, Name: ${req.body.name}, File: ${req.body.file}`);
            let chatId = req.body.id;
            const groupName = req.body.name;

            if (!chatId) {
                const group = await findGroupByName(groupName);
                if (!group) {
                    return res.status(422).json({
                        status: false,
                        message: "No group found with name: " + groupName,
                    });
                }
                chatId = group.id._serialized;
            }

            const number = chatId;
            const caption = req.body.caption;
            const fileUrl = req.body.file;

            const media = MessageMedia.fromFilePath(fileUrl);

            client
                .sendMessage(number, media, {
                    caption: caption,
                })
                .then((response) => {
                    fs.unlink(fileUrl, (err) => {
                        if (err) console.error(err);
                        console.log("file:", fileUrl, " ,success deleted");
                    });
                    res.status(200).json({
                        status: true,
                        response: response,
                    });
                })
                .catch((err) => {
                    console.error(err);
                    res.status(500).json({
                        status: false,
                        response: err,
                    });
                });
        }
    );

    /**
     * @openapi
     * /send-group-media-via-url:
     *   post:
     *     description: Send media from a URL to a WhatsApp group
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - file
     *             properties:
     *               id:
     *                 type: string
     *               name:
     *                 type: string
     *               caption:
     *                 type: string
     *               file:
     *                 type: string
     *                 description: URL to the media file
     *     responses:
     *       200:
     *         description: Media sent successfully
     *       422:
     *         description: Validation error
     *       500:
     *         description: Server error
     */
    app.post(
        "/send-group-media-via-url",
        [
            body("id").custom((value, { req }) => {
                if (!value && !req.body.name) {
                    throw new Error("Invalid value, you can use `id` or `name`");
                }
                return true;
            }),
            body("message").notEmpty(),
        ],
        async (req, res) => {
            log(`Request: POST /send-group-media-via-url - ID: ${req.body.id}, Name: ${req.body.name}, URL: ${req.body.file}`);
            let chatId = req.body.id;
            const groupName = req.body.name;

            if (!chatId) {
                const group = await findGroupByName(groupName);
                if (!group) {
                    return res.status(422).json({
                        status: false,
                        message: "No group found with name: " + groupName,
                    });
                }
                chatId = group.id._serialized;
            }

            const number = chatId;
            const caption = req.body.caption;
            const fileUrl = req.body.file;

            let mimetype;
            const attachment = await axios.get(fileUrl, {
                responseType: 'arraybuffer'
            }).then(response => {
                mimetype = response.headers['content-type'];
                return response.data.toString('base64');
            });

            const media = new MessageMedia(mimetype, attachment, 'Media');
            client
                .sendMessage(number, media, {
                    caption: caption,
                })
                .then((response) => {
                    fs.unlink(fileUrl, (err) => {
                        if (err) console.error(err);
                        console.log("file:", fileUrl, " ,success deleted");
                    });
                    res.status(200).json({
                        status: true,
                        response: response,
                    });
                })
                .catch((err) => {
                    console.error(err);
                    res.status(500).json({
                        status: false,
                        response: err,
                    });
                });
        }
    );

    /**
     * @openapi
     * /send-group-message:
     *   post:
     *     description: Send a text message to a WhatsApp group
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - message
     *             properties:
     *               id:
     *                 type: string
     *               name:
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
        "/send-group-message",
        [
            body("id").custom((value, { req }) => {
                if (!value && !req.body.name) {
                    throw new Error("Invalid value, you can use `id` or `name`");
                }
                return true;
            }),
            body("message").notEmpty(),
        ],
        async (req, res) => {
            log(`Request: POST /send-group-message - ID: ${req.body.id}, Name: ${req.body.name}`);
            const errors = validationResult(req).formatWith(({ msg }) => {
                return msg;
            });

            if (!errors.isEmpty()) {
                return res.status(422).json({
                    status: false,
                    message: errors.mapped(),
                });
            }

            let chatId = req.body.id;
            const groupName = req.body.name;
            const message = req.body.message;

            if (!chatId) {
                const group = await findGroupByName(groupName);
                if (!group) {
                    return res.status(422).json({
                        status: false,
                        message: "No group found with name: " + groupName,
                    });
                }
                chatId = group.id._serialized;
            }

            client
                .sendMessage(chatId, message)
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
};
