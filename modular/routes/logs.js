const fs = require('fs');
const path = require('path');

module.exports = function (app) {
    /**
     * @openapi
     * /logs:
     *   get:
     *     description: View application logs
     *     responses:
     *       200:
     *         description: Returns log content or redirection to the latest log
     */
    app.get("/logs", (req, res) => {
        const now = new Date();
        const dateDir = now.toISOString().split('T')[0];
        const hourDir = now.getHours().toString().padStart(2, '0');

        const logDir = path.join(__dirname, '../../logs', dateDir, hourDir, hourDir);
        const logFile = path.join(logDir, 'activity.log');

        if (fs.existsSync(logFile)) {
            const content = fs.readFileSync(logFile, 'utf8');
            res.type('text/plain').send(content);
        } else {
            res.status(404).send('No logs found for the current hour.');
        }
    });

    /**
     * @openapi
     * /logs/browse:
     *   get:
     *     description: Browse through log files
     *     responses:
     *       200:
     *         description: Simple HTML to browse logs
     */
    app.get("/logs/browse", (req, res) => {
        // Simple HTML view for monitoring
        res.send(`
            <html>
            <head>
                <title>Server Monitoring - Logs</title>
                <style>
                    body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; }
                    .header { border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 20px; }
                    .refresh { color: #569cd6; cursor: pointer; text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Server Activity Logs</h1>
                    <span class="refresh" onclick="location.reload()">Refresh</span>
                </div>
                <div id="content">Loading logs...</div>
                <script>
                    fetch('/logs')
                        .then(r => r.text())
                        .then(t => {
                            document.getElementById('content').innerHTML = '<pre>' + t + '</pre>';
                        });
                </script>
            </body>
            </html>
        `);
    });
};
