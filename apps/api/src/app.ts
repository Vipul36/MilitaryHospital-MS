import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import authRouter from './routes/auth.routes';
import patientRouter from './routes/patient.routes';
import doctorRouter from './routes/doctor.routes';
import appointmentRouter from './routes/appointment.routes';
import pharmacyRouter from './routes/pharmacy.routes';
import referralRouter from './routes/referral.routes';
import notificationRouter from './routes/notification.routes';
import auditRouter from './routes/audit.routes';
import labReportRouter from './routes/lab-report.routes';
import userRouter from './routes/user.routes';
import dashboardRouter from './routes/dashboard.routes';
import hospitalRouter from './routes/hospital.routes';
import healthRouter from './routes/health.routes';
import { globalRateLimiter, exportRateLimiter } from './middlewares/rate-limit.middleware';
import { globalErrorHandler } from './middlewares/error-handler.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { swaggerSpec } from './swagger.config';

const app = express();

// ────────────────────────────────────────────────────
// 1. SECURITY MIDDLEWARE
// ────────────────────────────────────────────────────

// Helmet — sets secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow Swagger UI inline scripts
  crossOriginEmbedderPolicy: false,
}));

// CORS — Cross-Origin Resource Sharing
app.use(cors());

// HPP — HTTP Parameter Pollution protection
app.use(hpp());

// Compression — gzip response compression
app.use(compression());

// ────────────────────────────────────────────────────
// 2. BODY PARSING & LOGGING
// ────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Morgan request logger (dev format in development, combined in production)
app.use(requestLogger);

// ────────────────────────────────────────────────────
// 3. RATE LIMITING
// ────────────────────────────────────────────────────

// Global Rate Limiter — 100 requests / 15 min per IP
app.use('/api/', globalRateLimiter);

// Export-specific Rate Limiter — 5 requests / 15 min per IP
// Applies to all export endpoints (CSV, Excel, PDF)
app.use('/api/v1/inventory/export', exportRateLimiter);
app.use('/api/v1/inventory/export-xlsx', exportRateLimiter);
app.use('/api/v1/audit/export', exportRateLimiter);
app.use('/api/v1/audit/export-xlsx', exportRateLimiter);
app.use('/api/v1/patients/:patientId/history/export-pdf', exportRateLimiter);
app.use('/api/v1/patients/:patientId/history/export-csv', exportRateLimiter);
app.use('/api/v1/patients/:patientId/history/export-xlsx', exportRateLimiter);

// ────────────────────────────────────────────────────
// 4. API DOCUMENTATION (Swagger UI)
// ────────────────────────────────────────────────────

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MHSHMS API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

// Serve raw OpenAPI JSON spec
app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ────────────────────────────────────────────────────
// 5. HEALTH CHECK & API ROOT
// ────────────────────────────────────────────────────

// Health Check Router (Docker/K8s readiness probe)
app.use('/api/v1/health', healthRouter);

// API Root Healthcheck
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'Military Hospital Smart Healthcare Management System (MHSHMS) API v1',
    timestamp: new Date().toISOString(),
    docs: '/api/docs',
  });
});

// ────────────────────────────────────────────────────
// 6. APPLICATION ROUTERS
// ────────────────────────────────────────────────────

// Authentication Router registration
app.use('/api/v1/auth', authRouter);

// Patient Router registration
app.use('/api/v1/patients', patientRouter);

// Doctor Router registration
app.use('/api/v1/doctors', doctorRouter);

// Appointment Router registration
app.use('/api/v1/appointments', appointmentRouter);

// Pharmacy and Inventory Router registration
app.use('/api/v1', pharmacyRouter);

// Referral Router registration
app.use('/api/v1/referrals', referralRouter);

// Notification Router registration
app.use('/api/v1/notifications', notificationRouter);

// Audit Log Router registration (Admin only)
app.use('/api/v1/audit', auditRouter);

// Lab Reports Router registration
app.use('/api/v1/lab-reports', labReportRouter);

// User Management Router registration (Admin only)
app.use('/api/v1/users', userRouter);

// Dashboard Router registration
app.use('/api/v1/dashboard', dashboardRouter);

// Hospital Telemetry Router registration
app.use('/api/v1/hospital', hospitalRouter);

// ────────────────────────────────────────────────────
// 7. FALLBACK & ERROR HANDLING
// ────────────────────────────────────────────────────

// 404 — Route not found fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'The requested API endpoint does not exist.',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler — MUST be the last middleware
app.use(globalErrorHandler);

export default app;
