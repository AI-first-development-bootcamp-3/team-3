import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Generated from JSDoc `@openapi` annotations beside each route definition
 * (see `apis` below), so documentation accrues with each endpoint instead of
 * being reconstructed at the end. GET /health is the worked example later
 * endpoints copy.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Abra Timesheet API',
      version: '0.1.0',
      description: 'Internal timesheet system for Abra employees and administrators.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'BAD_REQUEST' },
                message: { type: 'string', example: 'Request validation failed' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['field', 'message'],
                    properties: {
                      field: { type: 'string', example: 'email' },
                      message: { type: 'string', example: 'Required' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.routes.ts'],
};

export const openApiSpec = swaggerJsdoc(options);
