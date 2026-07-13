import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/doctors:
 *   get:
 *     tags: [Doctors]
 *     summary: List all doctors
 *     description: Returns all doctors with their user profile, department, and schedule details.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Doctors list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            serviceNumber: true
          }
        },
        department: true
      },
      orderBy: {
        doctorId: 'asc'
      }
    });

    return res.json({
      status: 'success',
      data: doctors,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Doctors Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve doctor records.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors/available:
 *   get:
 *     tags: [Doctors]
 *     summary: Get available doctors
 *     description: Returns only doctors who are currently marked as available for consultations.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Available doctors list
 *       500:
 *         description: Internal server error
 */
router.get('/available', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const doctors = await prisma.doctor.findMany({
      where: {
        availableToday: true
      },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            phone: true
          }
        },
        department: true
      }
    });

    return res.json({
      status: 'success',
      data: doctors,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Available Doctors Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_AVAILABLE_FAILED',
      message: 'Failed to retrieve available doctor records.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors/schedule:
 *   get:
 *     tags: [Doctors]
 *     summary: Get doctor schedules
 *     description: Returns weekly schedules for all doctors with day-of-week slot mappings.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Schedule data retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/schedule', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { doctorId } = req.query;

  try {
    let targetDoctorId = doctorId as string;

    if (!targetDoctorId) {
      if (req.user?.role === 'DOCTOR') {
        const doctorProfile = await prisma.doctor.findUnique({
          where: { userId: req.user.id }
        });
        if (!doctorProfile) {
          return res.status(404).json({
            success: false,
            code: 'DOCTOR_PROFILE_NOT_FOUND',
            message: 'Doctor profile not found for logged in user.'
          });
        }
        targetDoctorId = doctorProfile.doctorId;
      } else {
        return res.status(400).json({
          success: false,
          code: 'DOCTOR_ID_REQUIRED',
          message: 'doctorId query parameter is required.'
        });
      }
    }

    const schedules = await prisma.doctorSchedule.findMany({
      where: {
        doctorId: targetDoctorId
      },
      orderBy: {
        day: 'asc'
      }
    });

    return res.json({
      status: 'success',
      data: schedules,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Doctor Schedule Error:', error);
    return res.status(500).json({
      success: false,
      code: 'SCHEDULE_FETCH_FAILED',
      message: 'Failed to retrieve doctor schedules.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors/{id}:
 *   get:
 *     tags: [Doctors]
 *     summary: Get a single doctor
 *     description: Returns detailed profile for a specific doctor by ID.
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
 *         description: Doctor details retrieved
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { doctorId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            status: true
          }
        },
        department: true,
        schedules: true
      }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        code: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID ${id} does not exist.`
      });
    }

    return res.json({
      status: 'success',
      data: doctor,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Doctor ID Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'An unexpected error occurred while fetching doctor record.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors:
 *   post:
 *     tags: [Doctors]
 *     summary: Register a new doctor
 *     description: Creates a new doctor with user account, department assignment, and weekly schedule. Admin only.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, email, phone, specialization, departmentId]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               specialization:
 *                 type: string
 *               departmentId:
 *                 type: string
 *               qualification:
 *                 type: string
 *               rank:
 *                 type: string
 *     responses:
 *       201:
 *         description: Doctor registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const {
    name, // saved as User.username
    email,
    phone,
    departmentId,
    specialization,
    qualification,
    experience,
    roomNumber,
    licenseNumber,
    availableToday
  } = req.body;

  try {
    if (!name || !email || !phone || !departmentId || !specialization || !qualification || !licenseNumber) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Mandatory fields (name, email, phone, departmentId, specialization, qualification, licenseNumber) must be provided.'
      });
    }

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { departmentId }
    });

    if (!dept) {
      return res.status(400).json({
        success: false,
        code: 'DEPARTMENT_NOT_FOUND',
        message: `Department with ID ${departmentId} does not exist.`
      });
    }

    // Verify license unique
    const existingDoc = await prisma.doctor.findUnique({
      where: { licenseNumber }
    });

    if (existingDoc) {
      return res.status(409).json({
        success: false,
        code: 'LICENSE_EXISTS',
        message: `A doctor with Medical License ${licenseNumber} already exists.`
      });
    }

    // Check if user already exists
    const calculatedUsername = name;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: calculatedUsername },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        message: `A user account with username ${calculatedUsername} or email ${email} already exists.`
      });
    }

    const passwordHash = await bcrypt.hash('doctor123', 10);
    const serviceNumber = `SM-${Math.floor(10000 + Math.random() * 90000)}`;

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: calculatedUsername,
          passwordHash,
          email,
          phone,
          role: 'DOCTOR',
          serviceNumber,
          status: 'ACTIVE'
        }
      });

      const newDoctor = await tx.doctor.create({
        data: {
          userId: newUser.id,
          departmentId,
          specialization,
          qualification,
          experience: Number(experience) || 5,
          availableToday: availableToday !== undefined ? availableToday : true,
          roomNumber: roomNumber || 'Consultation-Room',
          licenseNumber
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              role: true,
              status: true
            }
          },
          department: true
        }
      });

      // Automatically seed schedule
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
      for (const day of days) {
        await tx.doctorSchedule.create({
          data: {
            doctorId: newDoctor.doctorId,
            day,
            startTime: '09:00',
            endTime: '13:00',
            maxPatients: 30,
            leaveStatus: false
          }
        });
      }

      return newDoctor;
    });

    // Audit: DOCTOR CREATE
    logAudit(prisma, req.user!.id, 'CREATE', 'DOCTOR', result.doctorId, req.ip || '0.0.0.0');

    return res.status(201).json({
      status: 'success',
      message: 'Doctor file registered successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create Doctor Error:', error);
    return res.status(500).json({
      success: false,
      code: 'CREATE_FAILED',
      message: 'Failed to register doctor profile.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors/{id}:
 *   put:
 *     tags: [Doctors]
 *     summary: Update doctor profile
 *     description: Updates doctor specialization, availability status, and other profile fields.
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
 *         description: Doctor updated successfully
 *       404:
 *         description: Doctor not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    specialization,
    qualification,
    experience,
    availableToday,
    roomNumber,
    licenseNumber,
    // Optional User updates
    name, // maps to User.username
    email,
    phone,
    status
  } = req.body;

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { doctorId: id }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        code: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID ${id} does not exist.`
      });
    }

    // Access control
    if (req.user?.role === 'DOCTOR' && req.user.id !== doctor.userId) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to update this doctor file.'
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update user fields
      const userUpdates: any = {};
      if (name) userUpdates.username = name;
      if (email) userUpdates.email = email;
      if (phone) userUpdates.phone = phone;
      if (status && req.user?.role === 'ADMIN') userUpdates.status = status;

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: userUpdates
        });
      }

      // 2. Update doctor fields
      const doctorUpdates: any = {};
      if (specialization) doctorUpdates.specialization = specialization;
      if (qualification) doctorUpdates.qualification = qualification;
      if (experience !== undefined) doctorUpdates.experience = Number(experience);
      if (availableToday !== undefined) doctorUpdates.availableToday = availableToday;
      if (roomNumber) doctorUpdates.roomNumber = roomNumber;
      if (licenseNumber) doctorUpdates.licenseNumber = licenseNumber;

      const updatedDoc = await tx.doctor.update({
        where: { doctorId: id },
        data: doctorUpdates,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              role: true,
              status: true
            }
          },
          department: true
        }
      });

      return updatedDoc;
    });

    // Audit: DOCTOR UPDATE
    logAudit(prisma, req.user!.id, 'UPDATE', 'DOCTOR', updated.doctorId, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Doctor profile updated successfully',
      data: updated,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update Doctor Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to update doctor profile.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/doctors/prescription:
 *   post:
 *     tags: [Doctors]
 *     summary: Create a prescription
 *     description: Allows a doctor to issue a prescription with medicine items for a patient consultation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [consultationId, items]
 *             properties:
 *               consultationId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     medicineName:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *     responses:
 *       201:
 *         description: Prescription created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/prescription', authenticateJWT, requireRoles(['DOCTOR']), async (req: AuthRequest, res: Response) => {
  const {
    consultationId,
    patientId,
    items // array of items: { medicineId, dosage, frequency, duration, remarks }
  } = req.body;

  try {
    if (!consultationId || !patientId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Prescription details (consultationId, patientId, items array) must be provided.'
      });
    }

    // Verify doctor entity
    const doctorProfile = await prisma.doctor.findUnique({
      where: { userId: req.user?.id }
    });

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        code: 'DOCTOR_NOT_FOUND',
        message: 'Logged-in user is not registered as a doctor in the system.'
      });
    }

    // Verify consultation exists
    const consultation = await prisma.consultation.findUnique({
      where: { consultationId }
    });

    if (!consultation) {
      return res.status(400).json({
        success: false,
        code: 'CONSULTATION_NOT_FOUND',
        message: `Consultation with ID ${consultationId} does not exist.`
      });
    }

    // Create prescription and prescription items
    const prescription = await prisma.$transaction(async (tx) => {
      const newPrescription = await tx.prescription.create({
        data: {
          consultationId,
          patientId,
          doctorId: doctorProfile.doctorId
        }
      });

      for (const item of items) {
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: newPrescription.prescriptionId,
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            remarks: item.remarks || null
          }
        });
      }

      return tx.prescription.findUnique({
        where: { prescriptionId: newPrescription.prescriptionId },
        include: {
          items: {
            include: {
              medicine: true
            }
          }
        }
      });
    });

    return res.status(201).json({
      status: 'success',
      message: 'Prescription submitted successfully.',
      data: prescription,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create Prescription Error:', error);
    return res.status(500).json({
      success: false,
      code: 'PRESCRIPTION_FAILED',
      message: 'Failed to record prescription.',
      details: error.message
    });
  }
});

export default router;
