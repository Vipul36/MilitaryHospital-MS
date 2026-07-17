import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get live hospital operational statistics
 *     description: Returns aggregated counts for waiting patients, in-consultation, active doctors, total doctors, low stock medicines, and pending referrals.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/stats', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const [waitingCount, inConsultationCount, activeDocsCount, totalDocsCount, pendingReferralsCount, inventoryItems] = await Promise.all([
      prisma.appointment.count({
        where: { status: 'WAITING' }
      }),
      prisma.appointment.count({
        where: { status: 'IN_CONSULTATION' }
      }),
      prisma.doctor.count({
        where: { availableToday: true }
      }),
      prisma.doctor.count(),
      prisma.referral.count({
        where: { status: 'PENDING' }
      }),
      prisma.inventory.findMany({
        select: {
          currentStock: true,
          reorderLevel: true
        }
      })
    ]);

    // Calculate critical low stock items
    const lowStockCount = inventoryItems.filter(item => item.currentStock <= item.reorderLevel).length;

    return res.json({
      status: 'success',
      data: {
        waiting: waitingCount,
        inConsultation: inConsultationCount,
        activeDocs: activeDocsCount,
        totalDocs: totalDocsCount,
        lowStock: lowStockCount,
        pendingReferrals: pendingReferralsCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Dashboard Stats Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_STATS_FAILED',
      message: 'Failed to retrieve live dashboard metrics.',
      details: error.message
    });
  }
});

export default router;
