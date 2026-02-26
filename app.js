const { MessageMedia } = require("whatsapp-web.js");
const express = require("express");
const { body, validationResult } = require("express-validator");
const qrcode = require("qrcode");
const http = require("http");
const fs = require("fs");
const { phoneNumberFormatter } = require("./helpers/formatter");
const fileUpload = require("express-fileupload");
const axios = require("axios");
// const mime = require("mime-types");
const crypto = require("crypto")
const { newBotClient } = require("./bot");
const { sendEvent, registerSse, unregisterSse, sendLastDataSse } = require("./sse");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');


const port = process.env.PORT || 8001;

const app = express();
const server = http.createServer(app);


app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

/**
 * BASED ON MANY QUESTIONS
 * Actually ready mentioned on the tutorials
 *
 * Many people confused about the warning for file-upload
 * So, we just disabling the debug for simplicity.
 */
app.use(
  fileUpload({
    debug: false,
  })
);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /:
 *   get:
 *     description: Welcome to the WhatsApp API
 *     responses:
 *       200:
 *         description: Returns the index.html page.
 */
app.get("/", (req, res) => {
  res.sendFile("index.html", {
    root: __dirname,
  });
});

const client = newBotClient(sendEvent);

const checkRegisteredNumber = async function (number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
};

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

      // Tentukan tipe mime gambar Anda
      const mimetype = 'image/jpg'; // Ganti dengan tipe mime yang sesuai dengan gambar Anda

      // Buat objek MessageMedia dari data gambar
      const media = new MessageMedia(mimetype, data.toString('base64'), "Media");

      // const media = new MessageMedia(mimetype, attachment, 'Media');
      console.log("number:", number);
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
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  // const media = MessageMedia.fromFilePath('./image-example.png');
  // const file = req.files.file;
  // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
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
    const fileUrl = req.body.file;

    //const media = MessageMedia.fromFilePath('./image-example.png');
    const media = MessageMedia.fromFilePath(fileUrl);

    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

    // let mimetype;
    // const attachment = await axios.get(fileUrl, {
    //   responseType: 'arraybuffer'
    // }).then(response => {
    //   mimetype = response.headers['content-type'];
    //   return response.data.toString('base64');
    // });

    // const media = new MessageMedia(mimetype, attachment, 'Media');
    console.log("number:", number);
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
    const fileUrl = req.body.file;

    //const media = MessageMedia.fromFilePath('./image-example.png');
    // const media = MessageMedia.fromFilePath(fileUrl);

    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);

    let mimetype;
    const attachment = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    }).then(response => {
      mimetype = response.headers['content-type'];
      return response.data.toString('base64');
    });

    const media = new MessageMedia(mimetype, attachment, 'Media');
    console.log("number:", number);
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

const findGroupByName = async function (name) {
  const group = await client.getChats().then((chats) => {
    return chats.find(
      (chat) => chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
};

// Send message to group
// You can use chatID or group name, yea!
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

// Clearing message on spesific chat
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

server.listen(port, function () {
  console.log("App running on *: " + port);
});
