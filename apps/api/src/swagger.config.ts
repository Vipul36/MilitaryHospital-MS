import swaggerJsdoc from 'swagger-jsdoc';

/**
 * OpenAPI 3.0 Specification Configuration
 *
 * Generates the Swagger/OpenAPI spec from JSDoc annotations
 * scattered across the route files. Served via swagger-ui-express
 * at /api/docs.
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MHSHMS — Military Hospital Smart Healthcare Management System API',
      version: '1.0.0',
      description:
        'Comprehensive REST API for Military Hospital Smart Healthcare Management System (MHSHMS). ' +
        'Provides endpoints for patient management, doctor scheduling, appointment booking, ' +
        'pharmacy inventory, lab reports, referrals, notifications, audit logging, and hospital telemetry.',
      contact: {
        name: 'MHSHMS Development Team',
        email: 'admin@mhshms.mil.in',
      },
      license: {
        name: 'Internal — Military Use Only',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /api/v1/auth/login',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Request validation failed.' },
            details: { type: 'array', items: { type: 'object' } },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded'] },
            uptime: { type: 'number', description: 'Process uptime in seconds' },
            timestamp: { type: 'string', format: 'date-time' },
            database: { type: 'string', enum: ['connected', 'disconnected'] },
            version: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'System health and readiness probes' },
      { name: 'Auth', description: 'Authentication — login, register, current user' },
      { name: 'Patients', description: 'Patient CRUD, history, and export operations' },
      { name: 'Doctors', description: 'Doctor management, schedules, and prescriptions' },
      { name: 'Appointments', description: 'Appointment booking, queue, and slot management' },
      { name: 'Pharmacy', description: 'Medicine inventory, stock management, and exports' },
      { name: 'Referrals', description: 'Referral board requests, approvals, and tracking' },
      { name: 'Notifications', description: 'User notification management' },
      { name: 'Audit', description: 'Audit event logging and export (Admin only)' },
      { name: 'Lab Reports', description: 'Laboratory diagnostic report management' },
      { name: 'Users', description: 'User account management (Admin only)' },
      { name: 'Dashboard', description: 'Live operational dashboard statistics' },
      { name: 'Hospital', description: 'Bed telemetry, ward control, and PDF exports' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
