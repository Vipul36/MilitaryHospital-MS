import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { UserRole, BloodGroup, Gender, DependentType } from '@mhshms/types';
import { logAudit } from '../helpers/audit.helper';
import { exportRateLimiter } from '../middlewares/rate-limit.middleware';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

function toPrismaBloodGroup(bg: string): any {
  const map: Record<string, string> = {
    'A+': 'A_POS',
    'A-': 'A_NEG',
    'B+': 'B_POS',
    'B-': 'B_NEG',
    'AB+': 'AB_POS',
    'AB-': 'AB_NEG',
    'O+': 'O_POS',
    'O-': 'O_NEG',
  };
  return map[bg] || bg;
}

function fromPrismaBloodGroup(bg: string): any {
  const map: Record<string, string> = {
    'A_POS': 'A+',
    'A_NEG': 'A-',
    'B_POS': 'B+',
    'B_NEG': 'B-',
    'AB_POS': 'AB+',
    'AB_NEG': 'AB-',
    'O_POS': 'O+',
    'O_NEG': 'O-',
  };
  return map[bg] || bg;
}

const formatPatient = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    bloodGroup: fromPrismaBloodGroup(p.bloodGroup)
  };
};


/**
 * @swagger
 * /api/v1/patients:
 *   get:
 *     tags: [Patients]
 *     summary: List all patients
 *     description: Returns all patient records with user profile details. Staff access only.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Patients list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'REFERRAL_OFFICER', 'PHARMACIST']), async (req: AuthRequest, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
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
        }
      },
      orderBy: {
        patientId: 'desc'
      }
    });

    return res.json({
      status: 'success',
      data: patients.map(formatPatient),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Patients Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve patient files.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients/history:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient medical history
 *     description: Returns appointments, prescriptions, consultations, and lab reports for a patient.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Patient ID (staff can query any patient; patients see own records)
 *     responses:
 *       200:
 *         description: Medical history retrieved
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.get('/history', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { patientId } = req.query;

  try {
    let targetPatientId = patientId as string;

    // If patientId is not provided, defaults to logged-in user if they are a patient
    if (!targetPatientId) {
      if (req.user?.role === 'PATIENT') {
        const patientProfile = await prisma.patient.findUnique({
          where: { userId: req.user.id }
        });
        if (!patientProfile) {
          return res.status(404).json({
            success: false,
            code: 'PATIENT_PROFILE_NOT_FOUND',
            message: 'Patient profile not found for logged in user.'
          });
        }
        targetPatientId = patientProfile.patientId;
      } else {
        return res.status(400).json({
          success: false,
          code: 'PATIENT_ID_REQUIRED',
          message: 'patientId query parameter is required for staff roles.'
        });
      }
    } else {
      // If staff is looking up history, make sure they have rights
      if (req.user?.role === 'PATIENT') {
        // Patients can only look up their own history
        const patientProfile = await prisma.patient.findUnique({
          where: { userId: req.user.id }
        });
        if (!patientProfile || patientProfile.patientId !== targetPatientId) {
          return res.status(403).json({
            success: false,
            code: 'UNAUTHORIZED_HISTORY_ACCESS',
            message: 'You do not have permission to view this patient\'s medical history.'
          });
        }
      }
    }

    // Fetch consultations, including prescriptions and lab reports
    const consultations = await prisma.consultation.findMany({
      where: {
        appointment: {
          patientId: targetPatientId
        }
      },
      include: {
        appointment: true,
        doctor: {
          include: {
            user: {
              select: {
                username: true,
                email: true,
                phone: true
              }
            }
          }
        },
        prescription: {
          include: {
            items: {
              include: {
                medicine: true
              }
            }
          }
        },
        labReports: true
      },
      orderBy: {
        appointment: {
          date: 'desc'
        }
      }
    });

    return res.json({
      status: 'success',
      data: consultations,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Patient History Error:', error);
    return res.status(500).json({
      success: false,
      code: 'HISTORY_FETCH_FAILED',
      message: 'Failed to retrieve patient medical history.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients/reports:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient lab reports
 *     description: Returns lab test reports for a patient.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lab reports retrieved
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.get('/reports', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { patientId } = req.query;

  try {
    let targetPatientId = patientId as string;

    if (!targetPatientId) {
      if (req.user?.role === 'PATIENT') {
        const patientProfile = await prisma.patient.findUnique({
          where: { userId: req.user.id }
        });
        if (!patientProfile) {
          return res.status(404).json({
            success: false,
            code: 'PATIENT_PROFILE_NOT_FOUND',
            message: 'Patient profile not found for logged in user.'
          });
        }
        targetPatientId = patientProfile.patientId;
      } else {
        return res.status(400).json({
          success: false,
          code: 'PATIENT_ID_REQUIRED',
          message: 'patientId query parameter is required for staff roles.'
        });
      }
    } else {
      // Access check
      if (req.user?.role === 'PATIENT') {
        const patientProfile = await prisma.patient.findUnique({
          where: { userId: req.user.id }
        });
        if (!patientProfile || patientProfile.patientId !== targetPatientId) {
          return res.status(403).json({
            success: false,
            code: 'UNAUTHORIZED_REPORTS_ACCESS',
            message: 'You do not have permission to view this patient\'s lab reports.'
          });
        }
      }
    }

    const labReports = await prisma.labReport.findMany({
      where: {
        consultation: {
          appointment: {
            patientId: targetPatientId
          }
        }
      },
      include: {
        consultation: {
          include: {
            appointment: true,
            doctor: {
              include: {
                user: {
                  select: {
                    username: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        testId: 'desc'
      }
    });

    return res.json({
      status: 'success',
      data: labReports,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Patient Reports Error:', error);
    return res.status(500).json({
      success: false,
      code: 'REPORTS_FETCH_FAILED',
      message: 'Failed to retrieve patient lab reports.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient details
 *     description: Returns detailed patient profile including linked user data and family members.
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
 *         description: Patient details retrieved
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { patientId: id },
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
        dependents: true
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        code: 'PATIENT_NOT_FOUND',
        message: `Patient file with ID ${id} does not exist.`
      });
    }

    // Access check: only Admin, Doctor, Pharmacist, Referral Officer or owner Patient can access
    if (req.user?.role === 'PATIENT' && req.user.id !== patient.userId) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to view this patient file.'
      });
    }

    return res.json({
      status: 'success',
      data: formatPatient(patient),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Patient ID Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'An unexpected error occurred while fetching patient file.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients:
 *   post:
 *     tags: [Patients]
 *     summary: Register a new patient
 *     description: Creates a new patient with user account, defence ID, and medical details. Admin only.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [defenceId, name, email, phone, gender, dob]
 *             properties:
 *               defenceId:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *               dob:
 *                 type: string
 *                 format: date
 *               bloodGroup:
 *                 type: string
 *               rank:
 *                 type: string
 *               unit:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient registered successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Defence ID already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const {
    defenceId,
    bloodGroup,
    dob,
    gender,
    unit,
    rank,
    dependentType,
    emergencyName,
    emergencyRel,
    emergencyPhone,
    address,
    allergies,
    currentHospital,
    // Optional details to customize user creation
    username,
    email,
    phone,
    password
  } = req.body;

  try {
    if (!defenceId || !bloodGroup || !dob || !gender || !unit || !rank || !emergencyName || !emergencyRel || !emergencyPhone || !address) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'All mandatory patient details (defenceId, bloodGroup, dob, gender, unit, rank, emergencyName, emergencyRel, emergencyPhone, address) must be provided.'
      });
    }

    // Check if patient already exists
    const existingPatient = await prisma.patient.findUnique({
      where: { defenceId }
    });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        code: 'PATIENT_EXISTS',
        message: `A patient file with Defence ID ${defenceId} already exists.`
      });
    }

    const calculatedUsername = username || defenceId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const calculatedEmail = email || `${calculatedUsername}@militaryhospital.gov.in`;
    const calculatedPhone = phone || emergencyPhone;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: calculatedUsername },
          { email: calculatedEmail }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'USER_EXISTS',
        message: `A user account with username ${calculatedUsername} or email ${calculatedEmail} already exists.`
      });
    }

    const passwordHash = await bcrypt.hash(password || 'patient123', 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: calculatedUsername,
          passwordHash,
          email: calculatedEmail,
          phone: calculatedPhone,
          role: 'PATIENT',
          serviceNumber: defenceId,
          status: 'ACTIVE'
        }
      });

      const newPatient = await tx.patient.create({
        data: {
          userId: newUser.id,
          defenceId,
          bloodGroup: toPrismaBloodGroup(bloodGroup),
          dob: new Date(dob),
          gender: gender as Gender,
          unit,
          rank,
          retired: rank.toLowerCase().includes('retd'),
          dependentType: (dependentType || 'SELF') as DependentType,
          emergencyName,
          emergencyRel,
          emergencyPhone,
          address,
          allergies: allergies ? (Array.isArray(allergies) ? allergies : allergies.split(',').map((s: string) => s.trim())) : [],
          currentHospital: currentHospital || 'Military Hospital Jaipur'
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
          }
        }
      });

      return newPatient;
    });

    // Audit: PATIENT CREATE
    logAudit(prisma, req.user!.id, 'CREATE', 'PATIENT', result.patientId, req.ip || '0.0.0.0');

    return res.status(201).json({
      status: 'success',
      message: 'Patient profile registered successfully',
      data: formatPatient(result),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create Patient Error:', error);
    return res.status(500).json({
      success: false,
      code: 'CREATE_FAILED',
      message: 'Failed to create patient profile.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   put:
 *     tags: [Patients]
 *     summary: Update patient profile
 *     description: Updates patient medical and personal details.
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
 *         description: Patient updated
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    defenceId,
    bloodGroup,
    dob,
    gender,
    unit,
    rank,
    retired,
    dependentType,
    emergencyName,
    emergencyRel,
    emergencyPhone,
    address,
    allergies,
    currentHospital,
    // Optional user updates
    email,
    phone,
    status
  } = req.body;

  try {
    const patient = await prisma.patient.findUnique({
      where: { patientId: id }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        code: 'PATIENT_NOT_FOUND',
        message: `Patient file with ID ${id} does not exist.`
      });
    }

    // Access control
    if (req.user?.role === 'PATIENT' && req.user.id !== patient.userId) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to update this patient file.'
      });
    }

    const updatedPatient = await prisma.$transaction(async (tx) => {
      // 1. Update user fields
      const userUpdates: any = {};
      if (email) userUpdates.email = email;
      if (phone) userUpdates.phone = phone;
      if (status && req.user?.role === 'ADMIN') userUpdates.status = status; // Only Admin can lock accounts
      if (defenceId) userUpdates.serviceNumber = defenceId;

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: patient.userId },
          data: userUpdates
        });
      }

      // 2. Update patient fields
      const patientUpdates: any = {};
      if (defenceId) patientUpdates.defenceId = defenceId;
      if (bloodGroup) patientUpdates.bloodGroup = toPrismaBloodGroup(bloodGroup);
      if (dob) patientUpdates.dob = new Date(dob);
      if (gender) patientUpdates.gender = gender as Gender;
      if (unit) patientUpdates.unit = unit;
      if (rank) {
        patientUpdates.rank = rank;
        patientUpdates.retired = retired !== undefined ? retired : rank.toLowerCase().includes('retd');
      }
      if (dependentType) patientUpdates.dependentType = dependentType as DependentType;
      if (emergencyName) patientUpdates.emergencyName = emergencyName;
      if (emergencyRel) patientUpdates.emergencyRel = emergencyRel;
      if (emergencyPhone) patientUpdates.emergencyPhone = emergencyPhone;
      if (address) patientUpdates.address = address;
      if (allergies) {
        patientUpdates.allergies = Array.isArray(allergies) ? allergies : allergies.split(',').map((s: string) => s.trim());
      }
      if (currentHospital) patientUpdates.currentHospital = currentHospital;

      const updated = await tx.patient.update({
        where: { patientId: id },
        data: patientUpdates,
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
          }
        }
      });

      return updated;
    });

    // Audit: PATIENT UPDATE
    logAudit(prisma, req.user!.id, 'UPDATE', 'PATIENT', updatedPatient.patientId, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Patient profile updated successfully',
      data: formatPatient(updatedPatient),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update Patient Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to update patient profile.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/patients/{id}:
 *   delete:
 *     tags: [Patients]
 *     summary: Delete patient record
 *     description: Permanently removes a patient record and associated user account. Admin only.
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
 *         description: Patient deleted
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { patientId: id }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        code: 'PATIENT_NOT_FOUND',
        message: `Patient file with ID ${id} does not exist.`
      });
    }

    // Cascade delete user which will delete patient due to prisma schema onDelete: Cascade
    await prisma.user.delete({
      where: { id: patient.userId }
    });

    // Audit: PATIENT DELETE
    logAudit(prisma, req.user!.id, 'DELETE', 'PATIENT', id, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: `Patient profile with ID ${id} and associated user account have been deleted.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Delete Patient Error:', error);
    return res.status(500).json({
      success: false,
      code: 'DELETE_FAILED',
      message: 'Failed to delete patient profile.',
      details: error.message
    });
  }
});

// ─── Helper: Fetch full patient visit history data for exports ───
async function fetchPatientVisitHistory(patientId: string, req: AuthRequest) {
  // Verify patient exists and fetch demographics
  const patient = await prisma.patient.findUnique({
    where: { patientId },
    include: {
      user: { select: { username: true, email: true, phone: true } }
    }
  });

  if (!patient) return null;

  // Access control: patients can only access their own data
  if (req.user?.role === 'PATIENT') {
    const ownProfile = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!ownProfile || ownProfile.patientId !== patientId) {
      return 'FORBIDDEN';
    }
  }

  // Fetch consultations with full relational tree
  const consultations = await prisma.consultation.findMany({
    where: { appointment: { patientId } },
    include: {
      appointment: true,
      doctor: {
        include: {
          user: { select: { username: true } },
          department: true
        }
      },
      prescription: {
        include: { items: { include: { medicine: true } } }
      },
      labReports: true,
      referrals: true
    },
    orderBy: { appointment: { date: 'desc' } }
  });

  return { patient, consultations };
}

/**
 * @swagger
 * /api/v1/patients/{patientId}/history/export-pdf:
 *   get:
 *     tags: [Patients]
 *     summary: Export patient visit history as PDF
 *     description: Generates a military-grade PDF report of the patient's complete visit history.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
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
 *         description: Patient not found
 *       500:
 *         description: PDF generation failed
 */
router.get('/:patientId/history/export-pdf', authenticateJWT, exportRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchPatientVisitHistory(req.params.patientId, req);
    if (!result) return res.status(404).json({ success: false, code: 'PATIENT_NOT_FOUND', message: 'Patient not found.' });
    if (result === 'FORBIDDEN') return res.status(403).json({ success: false, code: 'UNAUTHORIZED', message: 'Access denied.' });

    const { patient, consultations } = result;
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=visit-history-${patient.defenceId}.pdf`);
    doc.pipe(res);

    // Border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');

    // Header
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1b2a4a')
       .text('MILITARY HOSPITAL SMART HEALTHCARE MANAGEMENT SYSTEM', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569')
       .text('PATIENT VISIT HISTORY REPORT', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(8).font('Helvetica').fillColor('#64748b')
       .text(`Generated: ${new Date().toLocaleString()} | CONFIDENTIAL`, { align: 'center' });
    doc.moveDown(1);

    // Divider
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#1b2a4a');
    doc.moveDown(0.8);

    // Patient Demographics
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1b2a4a').text('PATIENT IDENTIFICATION');
    doc.moveDown(0.4);
    const dY = doc.y;
    let bloodGroupStr: string = String(patient.bloodGroup || 'N/A');
    if (bloodGroupStr.includes('_')) bloodGroupStr = bloodGroupStr.replace('_POS', '+').replace('_NEG', '-');

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155');
    doc.text('Name:', 50, dY); doc.font('Helvetica').fillColor('#0f172a').text(patient.user.username, 120, dY);
    doc.font('Helvetica-Bold').fillColor('#334155').text('Defence ID:', 50, dY + 14); doc.font('Helvetica').fillColor('#0f172a').text(patient.defenceId, 120, dY + 14);
    doc.font('Helvetica-Bold').fillColor('#334155').text('Rank:', 50, dY + 28); doc.font('Helvetica').fillColor('#0f172a').text(patient.rank, 120, dY + 28);
    doc.font('Helvetica-Bold').fillColor('#334155').text('Blood Group:', 300, dY); doc.font('Helvetica').fillColor('#0f172a').text(bloodGroupStr, 390, dY);
    doc.font('Helvetica-Bold').fillColor('#334155').text('Unit:', 300, dY + 14); doc.font('Helvetica').fillColor('#0f172a').text(patient.unit, 390, dY + 14);
    doc.font('Helvetica-Bold').fillColor('#334155').text('Gender:', 300, dY + 28); doc.font('Helvetica').fillColor('#0f172a').text(patient.gender, 390, dY + 28);
    doc.y = dY + 50;

    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke('#94a3b8');
    doc.moveDown(0.8);

    // Consultations Timeline
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1b2a4a').text(`CONSULTATION HISTORY (${consultations.length} Records)`);
    doc.moveDown(0.5);

    if (consultations.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b').text('No consultation records found.');
    } else {
      consultations.forEach((c: any, idx: number) => {
        // Check page break
        if (doc.y > doc.page.height - 160) {
          doc.addPage();
          doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');
        }

        const dateStr = c.appointment?.date ? new Date(c.appointment.date).toISOString().split('T')[0] : 'N/A';
        const doctorName = c.doctor?.user?.username || 'N/A';
        const deptName = c.doctor?.department?.departmentName || 'N/A';

        // Consultation header bar
        doc.rect(40, doc.y, doc.page.width - 80, 18).fill('#f1f5f9');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b')
           .text(`#${idx + 1}  |  ${dateStr}  |  Dr. ${doctorName}  |  ${deptName}`, 50, doc.y + 4);
        doc.y += 22;

        // Diagnosis
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155').text('Diagnosis: ', 55, doc.y, { continued: true });
        doc.font('Helvetica').fillColor('#0f172a').text(c.diagnosis || 'N/A');

        // Symptoms
        if (c.symptoms?.length) {
          doc.font('Helvetica-Bold').fillColor('#334155').text('Symptoms: ', 55, doc.y, { continued: true });
          doc.font('Helvetica').fillColor('#0f172a').text(c.symptoms.join(', '));
        }

        // Notes
        if (c.notes) {
          doc.font('Helvetica-Bold').fillColor('#334155').text('Notes: ', 55, doc.y, { continued: true });
          doc.font('Helvetica').fillColor('#0f172a').text(c.notes);
        }

        // Prescriptions
        if (c.prescription?.items?.length) {
          doc.font('Helvetica-Bold').fillColor('#334155').text('Prescription:', 55);
          c.prescription.items.forEach((item: any) => {
            doc.font('Helvetica').fillColor('#0f172a')
               .text(`  • ${item.medicine.brandName} (${item.dosage}) — ${item.frequency}, ${item.duration}`, 65);
          });
        }

        // Lab Reports
        if (c.labReports?.length) {
          doc.font('Helvetica-Bold').fillColor('#334155').text('Lab Reports:', 55);
          c.labReports.forEach((lr: any) => {
            doc.font('Helvetica').fillColor('#0f172a')
               .text(`  • ${lr.testName} — ${lr.status}${lr.result ? ': ' + lr.result : ''}`, 65);
          });
        }

        // Referrals
        if (c.referrals?.length) {
          doc.font('Helvetica-Bold').fillColor('#334155').text('Referrals:', 55);
          c.referrals.forEach((r: any) => {
            doc.font('Helvetica').fillColor('#0f172a')
               .text(`  • ${r.referredHospital} — ${r.status} (${r.reason})`, 65);
          });
        }

        doc.moveDown(0.6);
      });
    }

    // Signatures
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');
    }
    doc.moveDown(1.5);
    const sigY = doc.y;
    doc.moveTo(50, sigY).lineTo(200, sigY).stroke('#94a3b8');
    doc.moveTo(350, sigY).lineTo(500, sigY).stroke('#94a3b8');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
    doc.text('ATTENDING MEDICAL OFFICER', 50, sigY + 5, { width: 150 });
    doc.text('COMMAND MEDICAL OFFICER', 350, sigY + 5, { width: 150 });

    // Footer page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1e293b');
      doc.fontSize(8).fillColor('#94a3b8').text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, { align: 'center' });
    }

    // Fire-and-forget audit
    logAudit(prisma, req.user!.id, 'EXPORT', 'PATIENT_HISTORY', req.params.patientId, req.ip || '0.0.0.0');

    doc.end();
  } catch (error: any) {
    console.error('Patient History PDF Export Error:', error);
    return res.status(500).json({ success: false, code: 'EXPORT_FAILED', message: 'Failed to export patient history as PDF.', details: error.message });
  }
});

/**
 * @swagger
 * /api/v1/patients/{patientId}/history/export-csv:
 *   get:
 *     tags: [Patients]
 *     summary: Export patient visit history as CSV
 *     description: Streams patient visit history as a UTF-8 CSV file.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file stream
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Export failed
 */
router.get('/:patientId/history/export-csv', authenticateJWT, exportRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchPatientVisitHistory(req.params.patientId, req);
    if (!result) return res.status(404).json({ success: false, code: 'PATIENT_NOT_FOUND', message: 'Patient not found.' });
    if (result === 'FORBIDDEN') return res.status(403).json({ success: false, code: 'UNAUTHORIZED', message: 'Access denied.' });

    const { patient, consultations } = result;

    const esc = (val: any): string => {
      const str = val == null ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Date', 'Doctor', 'Department', 'Diagnosis', 'Symptoms', 'Notes', 'Prescriptions', 'Lab Reports', 'Referrals'];

    const rows = consultations.map((c: any) => {
      const dateStr = c.appointment?.date ? new Date(c.appointment.date).toISOString().split('T')[0] : '';
      const doctorName = c.doctor?.user?.username || '';
      const deptName = c.doctor?.department?.departmentName || '';
      const prescStr = (c.prescription?.items || []).map((i: any) => `${i.medicine.brandName} ${i.dosage} ${i.frequency}`).join('; ');
      const labStr = (c.labReports || []).map((l: any) => `${l.testName}:${l.status}`).join('; ');
      const refStr = (c.referrals || []).map((r: any) => `${r.referredHospital}:${r.status}`).join('; ');

      return [esc(dateStr), esc(doctorName), esc(deptName), esc(c.diagnosis), esc((c.symptoms || []).join(', ')), esc(c.notes || ''), esc(prescStr), esc(labStr), esc(refStr)].join(',');
    });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `visit_history_${patient.defenceId}_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    logAudit(prisma, req.user!.id, 'EXPORT', 'PATIENT_HISTORY', req.params.patientId, req.ip || '0.0.0.0');

    return res.send('\uFEFF' + csvContent);
  } catch (error: any) {
    console.error('Patient History CSV Export Error:', error);
    return res.status(500).json({ success: false, code: 'EXPORT_FAILED', message: 'Failed to export patient history as CSV.', details: error.message });
  }
});

/**
 * @swagger
 * /api/v1/patients/{patientId}/history/export-xlsx:
 *   get:
 *     tags: [Patients]
 *     summary: Export patient visit history as Excel
 *     description: Generates an Excel workbook of patient visit history.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file stream
 *       404:
 *         description: Patient not found
 *       500:
 *         description: Export failed
 */
router.get('/:patientId/history/export-xlsx', authenticateJWT, exportRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = await fetchPatientVisitHistory(req.params.patientId, req);
    if (!result) return res.status(404).json({ success: false, code: 'PATIENT_NOT_FOUND', message: 'Patient not found.' });
    if (result === 'FORBIDDEN') return res.status(403).json({ success: false, code: 'UNAUTHORIZED', message: 'Access denied.' });

    const { patient, consultations } = result;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MHSHMS';
    workbook.created = new Date();

    // Sheet 1: Patient Info
    const infoSheet = workbook.addWorksheet('Patient Info');
    infoSheet.columns = [
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 40 }
    ];
    const infoHeaderRow = infoSheet.getRow(1);
    infoHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    infoHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF355E3B' } };

    let bloodGroupStr: string = String(patient.bloodGroup || 'N/A');
    if (bloodGroupStr.includes('_')) bloodGroupStr = bloodGroupStr.replace('_POS', '+').replace('_NEG', '-');

    [
      ['Name', patient.user.username],
      ['Defence ID', patient.defenceId],
      ['Rank', patient.rank],
      ['Unit', patient.unit],
      ['Blood Group', bloodGroupStr],
      ['Gender', patient.gender],
      ['Date of Birth', patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : 'N/A'],
      ['Hospital', patient.currentHospital],
      ['Allergies', (patient.allergies || []).join(', ') || 'None']
    ].forEach(([f, v]) => infoSheet.addRow({ field: f, value: v }));

    // Sheet 2: Visit History
    const visitSheet = workbook.addWorksheet('Visit History', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    visitSheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Doctor', key: 'doctor', width: 20 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Diagnosis', key: 'diagnosis', width: 30 },
      { header: 'Symptoms', key: 'symptoms', width: 30 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Prescriptions', key: 'prescriptions', width: 40 },
      { header: 'Lab Reports', key: 'labReports', width: 30 },
      { header: 'Referrals', key: 'referrals', width: 30 }
    ];

    const visitHeaderRow = visitSheet.getRow(1);
    visitHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    visitHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    visitHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    visitHeaderRow.height = 24;

    consultations.forEach((c: any) => {
      const dateStr = c.appointment?.date ? new Date(c.appointment.date).toISOString().split('T')[0] : '';
      const prescStr = (c.prescription?.items || []).map((i: any) => `${i.medicine.brandName} ${i.dosage} ${i.frequency}`).join('; ');
      const labStr = (c.labReports || []).map((l: any) => `${l.testName}: ${l.status}`).join('; ');
      const refStr = (c.referrals || []).map((r: any) => `${r.referredHospital}: ${r.status}`).join('; ');

      visitSheet.addRow({
        date: dateStr,
        doctor: c.doctor?.user?.username || '',
        department: c.doctor?.department?.departmentName || '',
        diagnosis: c.diagnosis || '',
        symptoms: (c.symptoms || []).join(', '),
        notes: c.notes || '',
        prescriptions: prescStr,
        labReports: labStr,
        referrals: refStr
      });
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `visit_history_${patient.defenceId}_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    logAudit(prisma, req.user!.id, 'EXPORT', 'PATIENT_HISTORY', req.params.patientId, req.ip || '0.0.0.0');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Patient History Excel Export Error:', error);
    return res.status(500).json({ success: false, code: 'EXPORT_FAILED', message: 'Failed to export patient history as Excel.', details: error.message });
  }
});

export default router;
