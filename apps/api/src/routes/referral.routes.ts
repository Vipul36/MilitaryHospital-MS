import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/referrals:
 *   get:
 *     tags: [Referrals]
 *     summary: List all referrals
 *     description: Returns all referral records with patient, doctor, and hospital details.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referrals list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    let whereClause: any = {};

    // If patient is logged in, restrict to their referrals
    if (req.user?.role === 'PATIENT') {
      const patientProfile = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });
      if (patientProfile) {
        whereClause = {
          consultation: {
            appointment: {
              patientId: patientProfile.patientId
            }
          }
        };
      }
    }

    const referrals = await prisma.referral.findMany({
      where: whereClause,
      orderBy: {
        referralId: 'desc'
      }
    });

    const formatted = referrals.map((ref: any) => ({
      referralId: ref.referralId,
      consultationId: ref.consultationId,
      referredHospital: ref.referredHospital,
      reason: ref.reason,
      status: ref.status,
      approvalOfficer: ref.approvalOfficer || '',
      documents: ref.documents || [],
      trackingNumber: ref.trackingNumber
    }));

    return res.json({
      status: 'success',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Referrals Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve referrals.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/referrals/status:
 *   get:
 *     tags: [Referrals]
 *     summary: Get referral status statistics
 *     description: Returns aggregated counts of referrals grouped by status (pending, approved, rejected, etc.).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status statistics retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/status', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const pending = await prisma.referral.count({ where: { status: 'PENDING' } });
    const approved = await prisma.referral.count({ where: { status: 'APPROVED' } });
    const rejected = await prisma.referral.count({ where: { status: 'REJECTED' } });

    return res.json({
      status: 'success',
      data: { pending, approved, rejected },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Referrals Status Error:', error);
    return res.status(500).json({
      success: false,
      code: 'STATS_FAILED',
      message: 'Failed to retrieve referral statistics.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/referrals:
 *   post:
 *     tags: [Referrals]
 *     summary: Create a referral request
 *     description: Submits a new referral request with patient info, diagnosis, and destination hospital.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, doctorId, reason, diagnosis, hospitalId]
 *             properties:
 *               patientId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               reason:
 *                 type: string
 *               diagnosis:
 *                 type: string
 *               hospitalId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Referral created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { consultationId, referredHospital, reason, documents } = req.body;

  try {
    if (!referredHospital || !reason) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'referredHospital and reason are required.'
      });
    }

    let targetConsultationId = consultationId;

    // Default to the first available consultation if none passed
    if (!targetConsultationId) {
      const firstConsultation = await prisma.consultation.findFirst();
      if (firstConsultation) {
        targetConsultationId = firstConsultation.consultationId;
      } else {
        return res.status(400).json({
          success: false,
          code: 'CONSULTATION_REQUIRED',
          message: 'No consultation records exist in the database to link the referral to.'
        });
      }
    }

    const trackingNumber = `MH-REF-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const newRef = await prisma.referral.create({
      data: {
        consultationId: targetConsultationId,
        referredHospital,
        reason,
        status: 'PENDING',
        documents: documents || [],
        trackingNumber
      }
    });

    const formatted = {
      referralId: newRef.referralId,
      consultationId: newRef.consultationId,
      referredHospital: newRef.referredHospital,
      reason: newRef.reason,
      status: newRef.status,
      approvalOfficer: '',
      documents: newRef.documents || [],
      trackingNumber: newRef.trackingNumber
    };

    // Fire-and-forget audit: CREATE REFERRAL
    logAudit(prisma, req.user!.id, 'CREATE', 'REFERRAL', newRef.referralId, req.ip || '0.0.0.0');

    return res.status(201).json({
      status: 'success',
      message: 'Referral requested successfully.',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create Referral Error:', error);
    return res.status(500).json({
      success: false,
      code: 'CREATE_FAILED',
      message: 'Failed to request referral.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/referrals/{id}:
 *   put:
 *     tags: [Referrals]
 *     summary: Update referral status
 *     description: Approve, reject, or update a referral's status and add reviewer notes.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED, TREATMENT_IN_PROGRESS, CLOSED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral status updated
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, approvalOfficer } = req.body;

  try {
    const referral = await prisma.referral.findUnique({
      where: { referralId: id }
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        code: 'REFERRAL_NOT_FOUND',
        message: `Referral request with ID ${id} does not exist.`
      });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (approvalOfficer) updates.approvalOfficer = approvalOfficer;

    const updated = await prisma.referral.update({
      where: { referralId: id },
      data: updates
    });

    const formatted = {
      referralId: updated.referralId,
      consultationId: updated.consultationId,
      referredHospital: updated.referredHospital,
      reason: updated.reason,
      status: updated.status,
      approvalOfficer: updated.approvalOfficer || '',
      documents: updated.documents || [],
      trackingNumber: updated.trackingNumber
    };

    // Fire notification when referral is approved
    if (updated.status === 'APPROVED') {
      try {
        const consultation = await prisma.consultation.findUnique({
          where: { consultationId: updated.consultationId },
          include: {
            appointment: {
              include: {
                patient: {
                  select: { userId: true }
                }
              }
            }
          }
        });
        const patientUserId = consultation?.appointment?.patient?.userId;
        if (patientUserId) {
          await prisma.notification.create({
            data: {
              userId: patientUserId,
              type: 'REFERRAL',
              title: 'Referral Approved',
              message: `Your referral to ${updated.referredHospital} has been approved by ${updated.approvalOfficer || 'the Medical Officer'}.`,
              status: 'UNREAD'
            }
          });
        }
      } catch (notifErr) {
        console.warn('Referral notification trigger failed (non-critical):', notifErr);
      }
    }

    // Fire-and-forget audit: APPROVE/UPDATE REFERRAL
    const auditAction = updated.status === 'APPROVED' ? 'APPROVE' : 'UPDATE';
    logAudit(prisma, req.user!.id, auditAction, 'REFERRAL', updated.referralId, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Referral request updated successfully.',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update Referral Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to update referral status.',
      details: error.message
    });
  }
});

export default router;
