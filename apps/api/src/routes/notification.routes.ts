import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List user notifications
 *     description: Returns the 50 most recent notifications for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const formatted = notifications.map((n: any) => ({
      notificationId: n.notificationId,
      type: n.type,
      title: n.title,
      message: n.message,
      status: n.status,
      createdAt: n.createdAt.toISOString()
    }));

    return res.json({
      status: 'success',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Notifications Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve notifications.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     description: Returns the count of unread notifications for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/unread-count', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        status: 'UNREAD'
      }
    });

    return res.json({
      status: 'success',
      data: { count },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Unread Count Error:', error);
    return res.status(500).json({
      success: false,
      code: 'COUNT_FAILED',
      message: 'Failed to retrieve unread notification count.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       500:
 *         description: Internal server error
 */
router.put('/mark-all-read', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        status: 'UNREAD'
      },
      data: { status: 'READ' }
    });

    return res.json({
      status: 'success',
      message: 'All notifications marked as read.',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Mark All Read Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to mark notifications as read.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     description: Marks a specific notification as read by its ID.
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
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/read', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.findUnique({
      where: { notificationId: id }
    });

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Notification not found.'
      });
    }

    const updated = await prisma.notification.update({
      where: { notificationId: id },
      data: { status: 'READ' }
    });

    return res.json({
      status: 'success',
      message: 'Notification marked as read.',
      data: {
        notificationId: updated.notificationId,
        status: updated.status
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Mark Read Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to mark notification as read.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     description: Permanently removes a notification by its ID.
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
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.findUnique({
      where: { notificationId: id }
    });

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Notification not found.'
      });
    }

    await prisma.notification.delete({
      where: { notificationId: id }
    });

    return res.json({
      status: 'success',
      message: 'Notification deleted.',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Delete Notification Error:', error);
    return res.status(500).json({
      success: false,
      code: 'DELETE_FAILED',
      message: 'Failed to delete notification.',
      details: error.message
    });
  }
});

export default router;
