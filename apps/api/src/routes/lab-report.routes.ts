import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';
import { generateLabReportPDF } from '../helpers/pdf.helper';

const router = Router();
const prisma = new PrismaClient();

// Helper — formats a LabReport row to frontend-friendly shape
function formatReport(r: any) {
  return {
    testId:        r.testId,
    consultationId: r.consultationId,
    testName:      r.testName,
    status:        r.status,
    result:        r.result   || null,
    reportURL:     r.reportURL || null,
    performedBy:   r.performedBy || null,
    // Joined fields (when consultation is included)
    patientDefenceId:   r.consultation?.appointment?.patient?.defenceId   || null,
    patientRank:        r.consultation?.appointment?.patient?.rank         || null,
    doctorUsername:     r.consultation?.doctor?.user?.username             || null,
    appointmentDate:    r.consultation?.appointment?.date
                          ? new Date(r.consultation.appointment.date).toISOString().split('T')[0]
                          : null
  };
}

/**
 * @swagger
 * /api/v1/lab-reports:
 *   get:
 *     tags: [Lab Reports]
 *     summary: List all lab reports
 *     description: Returns lab reports with optional status filter and pagination. Accessible by ADMIN, DOCTOR, LAB_TECHNICIAN.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lab reports list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN']),
  async (req: AuthRequest, res: Response) => {
    const { status, page: pageQ, limit: limitQ } = req.query;
    const page  = Math.max(1, parseInt(pageQ as string) || 1);
    const limit = Math.min(50, parseInt(limitQ as string) || 20);
    const skip  = (page - 1) * limit;

    try {
      const where: any = {};
      if (status) where.status = (status as string).toUpperCase();

      const [reports, total] = await Promise.all([
        prisma.labReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: { testId: 'desc' },
          include: {
            consultation: {
              include: {
                appointment: {
                  include: {
                    patient: { select: { defenceId: true, rank: true } }
                  }
                },
                doctor: {
                  include: { user: { select: { username: true } } }
                }
              }
            }
          }
        }),
        prisma.labReport.count({ where })
      ]);

      return res.json({
        status: 'success',
        data: reports.map(formatReport),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Fetch Lab Reports Error:', error);
      return res.status(500).json({
        success: false, code: 'FETCH_FAILED',
        message: 'Failed to retrieve lab reports.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports/summary:
 *   get:
 *     tags: [Lab Reports]
 *     summary: Get lab report summary statistics
 *     description: Returns status-wise counts for the lab reports dashboard widget.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Summary statistics retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/summary', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN']),
  async (_req: AuthRequest, res: Response) => {
    try {
      const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

      const counts = await Promise.all(
        statuses.map(async (s) => ({
          status: s,
          count: await prisma.labReport.count({ where: { status: s } })
        }))
      );

      const total = counts.reduce((acc, c) => acc + c.count, 0);

      // 5 most recent reports
      const recent = await prisma.labReport.findMany({
        orderBy: { testId: 'desc' },
        take: 5,
        include: {
          consultation: {
            include: {
              appointment: {
                include: { patient: { select: { defenceId: true, rank: true } } }
              }
            }
          }
        }
      });

      return res.json({
        status: 'success',
        data: {
          total,
          byStatus: counts,
          recent: recent.map(formatReport)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Lab Report Summary Error:', error);
      return res.status(500).json({
        success: false, code: 'SUMMARY_FAILED',
        message: 'Failed to retrieve lab report summary.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports/{id}:
 *   get:
 *     tags: [Lab Reports]
 *     summary: Get a single lab report
 *     description: Returns detailed lab report data by test ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lab report retrieved
 *       404:
 *         description: Lab report not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const report = await prisma.labReport.findUnique({
        where: { testId: id },
        include: {
          consultation: {
            include: {
              appointment: {
                include: { patient: { select: { defenceId: true, rank: true } } }
              },
              doctor: { include: { user: { select: { username: true } } } }
            }
          }
        }
      });

      if (!report) {
        return res.status(404).json({
          success: false, code: 'NOT_FOUND',
          message: `Lab report with ID ${id} does not exist.`
        });
      }

      return res.json({
        status: 'success',
        data: formatReport(report),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Fetch Lab Report Error:', error);
      return res.status(500).json({
        success: false, code: 'FETCH_FAILED',
        message: 'Failed to retrieve lab report.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports:
 *   post:
 *     tags: [Lab Reports]
 *     summary: Create a new lab test request
 *     description: Creates a lab report linked to a consultation with test name and assigned performer.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consultationId, testName]
 *             properties:
 *               consultationId:
 *                 type: string
 *               testName:
 *                 type: string
 *               performedBy:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lab report created
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'LAB_TECHNICIAN']),
  async (req: AuthRequest, res: Response) => {
    const { consultationId, testName, performedBy } = req.body;

    try {
      if (!testName) {
        return res.status(400).json({
          success: false, code: 'MISSING_FIELDS',
          message: 'testName is required.'
        });
      }

      // If no consultationId provided, link to first available consultation (graceful)
      let targetConsultationId = consultationId;
      if (!targetConsultationId) {
        const first = await prisma.consultation.findFirst();
        if (!first) {
          return res.status(400).json({
            success: false, code: 'CONSULTATION_REQUIRED',
            message: 'No consultation records found to link the lab report to.'
          });
        }
        targetConsultationId = first.consultationId;
      }

      const newReport = await prisma.labReport.create({
        data: {
          consultationId: targetConsultationId,
          testName,
          status: 'PENDING',
          performedBy: performedBy || null
        }
      });

      // Fire-and-forget audit: CREATE LAB_REPORT
      logAudit(prisma, req.user!.id, 'CREATE', 'LAB_REPORT', newReport.testId, req.ip || '0.0.0.0');

      return res.status(201).json({
        status: 'success',
        message: 'Lab test request created successfully.',
        data: formatReport(newReport),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Create Lab Report Error:', error);
      return res.status(500).json({
        success: false, code: 'CREATE_FAILED',
        message: 'Failed to create lab report.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports/{id}:
 *   put:
 *     tags: [Lab Reports]
 *     summary: Update a lab report
 *     description: Updates status, result, reportURL, or performedBy on an existing lab report.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lab report updated
 *       404:
 *         description: Lab report not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateJWT, requireRoles(['ADMIN', 'LAB_TECHNICIAN', 'DOCTOR']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, result, reportURL, performedBy } = req.body;

    try {
      const existing = await prisma.labReport.findUnique({ where: { testId: id } });
      if (!existing) {
        return res.status(404).json({
          success: false, code: 'NOT_FOUND',
          message: `Lab report with ID ${id} does not exist.`
        });
      }

      const updates: any = {};
      if (status)      updates.status      = status;
      if (result)      updates.result      = result;
      if (reportURL)   updates.reportURL   = reportURL;
      if (performedBy) updates.performedBy = performedBy;

      const updated = await prisma.labReport.update({
        where: { testId: id },
        data: updates
      });

      // Determine audit action: COMPLETE vs generic UPDATE
      const auditAction = updated.status === 'COMPLETED' ? 'COMPLETE' : 'UPDATE';
      logAudit(prisma, req.user!.id, auditAction, 'LAB_REPORT', updated.testId, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: 'Lab report updated successfully.',
        data: formatReport(updated),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Update Lab Report Error:', error);
      return res.status(500).json({
        success: false, code: 'UPDATE_FAILED',
        message: 'Failed to update lab report.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports/{id}:
 *   delete:
 *     tags: [Lab Reports]
 *     summary: Delete a lab report
 *     description: Cancels and removes a lab report. Admin only.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lab report deleted
 *       404:
 *         description: Lab report not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateJWT, requireRoles(['ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const existing = await prisma.labReport.findUnique({ where: { testId: id } });
      if (!existing) {
        return res.status(404).json({
          success: false, code: 'NOT_FOUND',
          message: `Lab report with ID ${id} does not exist.`
        });
      }

      await prisma.labReport.delete({ where: { testId: id } });

      logAudit(prisma, req.user!.id, 'DELETE', 'LAB_REPORT', id, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: 'Lab report deleted successfully.',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Delete Lab Report Error:', error);
      return res.status(500).json({
        success: false, code: 'DELETE_FAILED',
        message: 'Failed to delete lab report.', details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/lab-reports/{id}/pdf:
 *   get:
 *     tags: [Lab Reports]
 *     summary: Export lab report as PDF
 *     description: Generates a military-grade PDF document for a specific lab diagnostic report.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF document stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Lab report not found
 *       500:
 *         description: PDF generation failed
 */
router.get('/:id/pdf', authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const report = await prisma.labReport.findUnique({
        where: { testId: id },
        include: {
          consultation: {
            include: {
              appointment: {
                include: {
                  patient: {
                    include: {
                      user: { select: { username: true } }
                    }
                  }
                }
              },
              doctor: {
                include: {
                  user: { select: { username: true } }
                }
              }
            }
          }
        }
      });

      if (!report) {
        return res.status(404).json({
          success: false, code: 'NOT_FOUND',
          message: `Lab report with ID ${id} does not exist.`
        });
      }

      // Check permissions: PATIENT can only access their own report
      if (req.user?.role === 'PATIENT') {
        const patientProfile = await prisma.patient.findUnique({
          where: { userId: req.user.id }
        });
        if (!patientProfile || report.consultation.appointment.patientId !== patientProfile.patientId) {
          return res.status(403).json({
            success: false, code: 'FORBIDDEN',
            message: 'You are not authorized to view this lab report.'
          });
        }
      } else if (!['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'LAB_TECHNICIAN', 'COMMAND_MEDICAL_OFFICER'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false, code: 'FORBIDDEN',
          message: 'You do not have access to view lab reports.'
        });
      }

      // Format report info for helper
      const formatted = {
        testId: report.testId,
        testName: report.testName,
        status: report.status,
        result: report.result,
        performedBy: report.performedBy,
        patientDefenceId: report.consultation?.appointment?.patient?.defenceId,
        patientRank: report.consultation?.appointment?.patient?.rank,
        doctorUsername: report.consultation?.doctor?.user?.username,
        appointmentDate: report.consultation?.appointment?.date
          ? new Date(report.consultation.appointment.date).toISOString().split('T')[0]
          : null,
        consultation: report.consultation
      };

      // Generate and stream PDF
      generateLabReportPDF(formatted, res);
    } catch (error: any) {
      console.error('Export Lab Report PDF Error:', error);
      return res.status(500).json({
        success: false, code: 'PDF_FAILED',
        message: 'Failed to generate PDF report.', details: error.message
      });
    }
  }
);

export default router;
