import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';

const router = Router();
const prisma = new PrismaClient();

// Helper — safe user shape (no passwordHash)
function formatUser(u: any) {
  return {
    id:            u.id,
    serviceNumber: u.serviceNumber || null,
    username:      u.username,
    role:          u.role,
    email:         u.email,
    phone:         u.phone,
    status:        u.status,
    createdAt:     u.createdAt,
    updatedAt:     u.updatedAt,
    // Linked profile
    patientId:     u.patient?.patientId || null,
    doctorId:      u.doctor?.doctorId   || null,
  };
}

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (paginated)
 *     description: Returns system users with optional role/status filters and pagination. Admin/Super-Admin only.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: Users list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { role, status, page: pageQ, limit: limitQ } = req.query;
    const page  = Math.max(1, parseInt(pageQ as string) || 1);
    const limit = Math.min(100, parseInt(limitQ as string) || 20);
    const skip  = (page - 1) * limit;

    try {
      const where: any = {};
      if (role)   where.role   = role;
      if (status) where.status = status;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: { select: { patientId: true } },
            doctor:  { select: { doctorId: true  } }
          }
        }),
        prisma.user.count({ where })
      ]);

      return res.json({
        status: 'success',
        data: users.map(formatUser),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Fetch Users Error:', error);
      return res.status(500).json({ success: false, code: 'FETCH_FAILED', message: 'Failed to retrieve users.', details: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/summary:
 *   get:
 *     tags: [Users]
 *     summary: Get user role summary statistics
 *     description: Returns role-wise user counts for admin dashboard widgets.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User summary retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/summary', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (_req: AuthRequest, res: Response) => {
    try {
      const roles = ['ADMIN', 'DOCTOR', 'PATIENT', 'RECEPTIONIST', 'LAB_TECHNICIAN',
                     'PHARMACIST', 'REFERRAL_OFFICER', 'COMMAND_MEDICAL_OFFICER', 'SUPER_ADMIN'] as const;

      const [byRole, byStatus, total] = await Promise.all([
        Promise.all(roles.map(async r => ({ role: r, count: await prisma.user.count({ where: { role: r } }) }))),
        Promise.all(['ACTIVE','INACTIVE','SUSPENDED'].map(async s => ({ status: s, count: await prisma.user.count({ where: { status: s as any } }) }))),
        prisma.user.count()
      ]);

      return res.json({
        status: 'success',
        data: { total, byRole: byRole.filter(r => r.count > 0), byStatus },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, code: 'SUMMARY_FAILED', message: 'Failed to retrieve user summary.', details: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a single user
 *     description: Returns user details by ID. Admin/Super-Admin only.
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
 *         description: User details retrieved
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          patient: { select: { patientId: true, defenceId: true, rank: true } },
          doctor:  { select: { doctorId: true, specialization: true } }
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: `User ${id} not found.` });
      }

      return res.json({ status: 'success', data: formatUser(user), timestamp: new Date().toISOString() });
    } catch (error: any) {
      return res.status(500).json({ success: false, code: 'FETCH_FAILED', message: 'Failed to retrieve user.', details: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   put:
 *     tags: [Users]
 *     summary: Update user account status
 *     description: Suspend, reactivate, or deactivate a user account. Cannot self-suspend.
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED]
 *     responses:
 *       200:
 *         description: User status updated
 *       400:
 *         description: Cannot self-suspend or invalid status
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;

    try {
      // Prevent self-suspension
      if (req.user!.id === id) {
        return res.status(400).json({ success: false, code: 'SELF_ACTION', message: 'Administrators cannot modify their own account status.' });
      }

      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        return res.status(400).json({ success: false, code: 'INVALID_STATUS', message: 'Status must be ACTIVE, INACTIVE, or SUSPENDED.' });
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: `User ${id} not found.` });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { status },
        include: {
          patient: { select: { patientId: true } },
          doctor:  { select: { doctorId: true } }
        }
      });

      // Determine audit action
      const auditAction = status === 'SUSPENDED' ? 'SUSPEND' : status === 'ACTIVE' ? 'REACTIVATE' : 'DEACTIVATE';
      logAudit(prisma, req.user!.id, auditAction, 'USER', id, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: `User ${updated.username} status updated to ${status}${reason ? ` (Reason: ${reason})` : ''}.`,
        data: formatUser(updated),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Update User Status Error:', error);
      return res.status(500).json({ success: false, code: 'UPDATE_FAILED', message: 'Failed to update user status.', details: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users/{id}/role:
 *   put:
 *     tags: [Users]
 *     summary: Change user role
 *     description: Updates a user's role assignment. Super-Admin only.
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
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DOCTOR, PATIENT, RECEPTIONIST, LAB_TECHNICIAN, PHARMACIST, REFERRAL_OFFICER, COMMAND_MEDICAL_OFFICER, SUPER_ADMIN]
 *     responses:
 *       200:
 *         description: User role updated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/role', authenticateJWT, requireRoles(['SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    const VALID_ROLES = ['ADMIN','DOCTOR','PATIENT','RECEPTIONIST','LAB_TECHNICIAN',
                         'PHARMACIST','REFERRAL_OFFICER','COMMAND_MEDICAL_OFFICER','SUPER_ADMIN'];

    try {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, code: 'INVALID_ROLE', message: 'Invalid role specified.' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role },
        include: { patient: { select: { patientId: true } }, doctor: { select: { doctorId: true } } }
      });

      logAudit(prisma, req.user!.id, 'UPDATE', 'USER', id, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: `User ${updated.username} role changed to ${role}.`,
        data: formatUser(updated),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, code: 'UPDATE_FAILED', message: 'Failed to update user role.', details: error.message });
    }
  }
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new staff user
 *     description: Admin creates a new staff user account with role assignment.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, email, phone, role]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { username, password, email, phone, role, serviceNumber } = req.body;

    try {
      if (!username || !password || !email || !phone || !role) {
        return res.status(400).json({
          success: false, code: 'MISSING_FIELDS',
          message: 'username, password, email, phone, and role are all required.'
        });
      }

      const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
      if (existing) {
        return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'Username or email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: { username, passwordHash, email, phone, role, serviceNumber: serviceNumber || null, status: 'ACTIVE' },
        include: { patient: { select: { patientId: true } }, doctor: { select: { doctorId: true } } }
      });

      logAudit(prisma, req.user!.id, 'CREATE', 'USER', newUser.id, req.ip || '0.0.0.0');

      return res.status(201).json({
        status: 'success',
        message: `Staff account for ${username} created successfully.`,
        data: formatUser(newUser),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Create User Error:', error);
      return res.status(500).json({ success: false, code: 'CREATE_FAILED', message: 'Failed to create user.', details: error.message });
    }
  }
);

export default router;
