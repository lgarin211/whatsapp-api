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
const {newBotClient} = require("./bot");
const {sendEvent, registerSse, unregisterSse, sendLastDataSse} = require("./sse");


const port = process.env.PORT || 8000;

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
// Send message
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

// Send media
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
