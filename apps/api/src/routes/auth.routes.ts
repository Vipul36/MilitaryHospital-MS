import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { authenticateJWT, AuthRequest } from '../middlewares/auth.middleware';
import { UserRole } from '@mhshms/types';
import { logAudit } from '../helpers/audit.helper';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'military_hospital_secret_jwt_key_2026';

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account. If the role is PATIENT, also creates a linked Patient record transactionally.
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
 *                 example: capt_sharma
 *               password:
 *                 type: string
 *                 example: SecurePass@123
 *               email:
 *                 type: string
 *                 example: sharma@army.mil.in
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DOCTOR, PATIENT, RECEPTIONIST, LAB_TECHNICIAN, PHARMACIST, REFERRAL_OFFICER, COMMAND_MEDICAL_OFFICER, SUPER_ADMIN]
 *               serviceNumber:
 *                 type: string
 *               defenceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', async (req: any, res: Response) => {
  const { username, password, email, phone, role, serviceNumber, defenceId } = req.body;

  try {
    // 1. Validation checks
    if (!username || !password || !email || !phone || !role) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'All mandatory fields (username, password, email, phone, role) must be provided.'
      });
    }

    // 2. Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        message: 'A user with the specified username or email already exists.'
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create database transaction to create user and patient record if role is PATIENT
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          passwordHash,
          email,
          phone,
          role: role as UserRole,
          serviceNumber: serviceNumber || null,
          status: 'ACTIVE'
        }
      });

      // If patient, create profile automatically
      if (role === 'PATIENT') {
        await tx.patient.create({
          data: {
            userId: newUser.id,
            defenceId: defenceId || serviceNumber || `DEF-${Math.floor(10000 + Math.random() * 90000)}-M`,
            bloodGroup: 'O_POS',
            dob: new Date('1990-01-01'),
            gender: 'MALE',
            unit: 'General Command Office',
            rank: 'Soldier',
            retired: false,
            dependentType: 'SELF',
            emergencyName: 'Emergency Contact',
            emergencyRel: 'SPOUSE',
            emergencyPhone: phone,
            address: 'Military Cantonment',
            allergies: [],
            currentHospital: 'Military Hospital Jaipur'
          }
        });
      }

      return newUser;
    });

    // 5. Generate token
    const token = jwt.sign(
      { id: result.id, username: result.username, role: result.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: result.id,
          username: result.username,
          role: result.role,
          email: result.email,
          phone: result.phone
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      code: 'REGISTRATION_FAILED',
      message: 'Failed to create user account.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user and obtain JWT
 *     description: Validates credentials and returns a signed JWT token with user profile data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token and user profile
 *       400:
 *         description: Missing username or password
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account is suspended or inactive
 *       500:
 *         description: Internal server error
 */
router.post('/login', async (req: any, res: Response) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Username and password are required.'
      });
    }

    // 1. Fetch user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect username or password.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `Your account is currently ${user.status}. Please contact the hospital administrator.`
      });
    }

    // 2. Compare password hashes
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect username or password.'
      });
    }

    // 3. Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4. Optionally fetch patient profile info if roles match
    let profileData: any = null;
    if (user.role === 'PATIENT') {
      profileData = await prisma.patient.findUnique({
        where: { userId: user.id }
      });
    } else if (user.role === 'DOCTOR') {
      profileData = await prisma.doctor.findUnique({
        where: { userId: user.id }
      });
    }

    // Fire-and-forget audit: LOGIN
    logAudit(prisma, user.id, 'LOGIN', 'USER', user.id, req.ip || req.socket?.remoteAddress || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Authentication successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          phone: user.phone,
          profile: profileData
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      code: 'AUTH_FAILED',
      message: 'An unexpected error occurred during authentication.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile details including linked patient/doctor records.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User record not found
 *       500:
 *         description: Internal server error
 */
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHENTICATED',
      message: 'Missing session details.'
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        serviceNumber: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User profile does not exist.'
      });
    }

    let profile: any = null;
    if (user.role === 'PATIENT') {
      profile = await prisma.patient.findUnique({
        where: { userId: user.id }
      });
    } else if (user.role === 'DOCTOR') {
      profile = await prisma.doctor.findUnique({
        where: { userId: user.id }
      });
    }

    return res.json({
      status: 'success',
      message: 'Active profile retrieved',
      data: {
        user,
        profile
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: 'PROFILE_RETRIEVAL_FAILED',
      message: 'Failed to fetch active profile details.',
      details: error.message
    });
  }
});

export default router;
