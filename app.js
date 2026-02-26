const express = require("express");
const http = require("http");
const fileUpload = require("express-fileupload");
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const initModularRoutes = require("./modular");

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
  res.sendFile(path.join(__dirname, "index.html"));
});

// Initialize modular routes
initModularRoutes(app);

server.listen(port, function () {
  console.log("App running on *: " + port);
});
