const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'WhatsApp API Documentation',
            version: '1.0.0',
            description: 'API documentation for the WhatsApp API project by Ngekoding',
        },
        servers: [
            {
                url: 'http://localhost:8001',
                description: 'Development server (app.js)',
            },
            {
                url: 'http://localhost:8000',
                description: 'Development server (app-multiple-account.js)',
            },
        ],
    },
    apis: ['./app.js', './app-multiple-account.js'], // files containing annotations as above
};

const specs = swaggerJsdoc(options);

module.exports = specs;
