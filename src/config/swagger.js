const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Last Mile Logistics API',
      version: '1.0.0',
      description: 'API documentation for the Last Mile Logistics backend',
    },
    servers: [
      {
        url: 'http://localhost:5005',
        description: 'Development server',
      },
      {
        url: 'https://last-mile-backend-m63f.onrender.com',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.js', './src/app.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
