import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { AppointmentStatus, PriorityLevel } from '@mhshms/types';
import { logAudit } from '../helpers/audit.helper';
import { notificationDispatchService } from '../services/notification-dispatch.service';

const router = Router();
const prisma = new PrismaClient();

// Priority weights helper matching frontend queue sorting
const PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  EMERGENCY: 100,
  SENIOR_CITIZEN: 90,
  PREGNANT: 85,
  DISABLED: 80,
  CHILD: 70,
  NORMAL: 50
};

/**
 * @swagger
 * /api/v1/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: List all appointments
 *     description: Returns appointments filterable by date and patient. Includes doctor and patient details.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointments list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { date, patientId } = req.query;

  try {
    let targetPatientId = patientId as string;

    // Enforce patient role access restriction
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
    }

    const whereClause: any = {};
    if (targetPatientId) {
      whereClause.patientId = targetPatientId;
    }
    if (date) {
      whereClause.date = new Date(date as string);
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
        doctor: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
        department: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Normalize outputs for frontend
    const normalized = appointments.map((a: any) => ({
      appointmentId: a.appointmentId,
      patientId: a.patientId,
      doctorId: a.doctorId,
      departmentId: a.departmentId,
      date: a.date ? a.date.toISOString().split('T')[0] : '',
      time: a.time,
      status: a.status as AppointmentStatus,
      priority: a.priority as PriorityLevel,
      tokenNumber: a.tokenNumber,
      estimatedTime: a.estimatedTime,
      createdBy: a.createdBy
    }));

    return res.json({
      status: 'success',
      data: normalized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Appointments Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve appointments.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments/queue:
 *   get:
 *     tags: [Appointments]
 *     summary: Get priority queue
 *     description: Returns the current waiting queue sorted by priority level and token number with estimated wait times.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Queue data retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/queue', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const activeAppointments = await prisma.appointment.findMany({
      where: {
        status: {
          in: ['WAITING', 'IN_CONSULTATION']
        }
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
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
    });

    // Sort queue: IN_CONSULTATION at top, then by priority weight desc, then tokenNumber asc
    const sorted = [...activeAppointments].sort((a, b) => {
      if (a.status === 'IN_CONSULTATION' && b.status !== 'IN_CONSULTATION') return -1;
      if (b.status === 'IN_CONSULTATION' && a.status !== 'IN_CONSULTATION') return 1;

      const weightA = PRIORITY_WEIGHTS[a.priority as PriorityLevel] || 50;
      const weightB = PRIORITY_WEIGHTS[b.priority as PriorityLevel] || 50;

      if (weightA !== weightB) {
        return weightB - weightA;
      }
      return a.tokenNumber - b.tokenNumber;
    });

    const normalized = sorted.map((a: any) => ({
      appointmentId: a.appointmentId,
      patientId: a.patientId,
      doctorId: a.doctorId,
      departmentId: a.departmentId,
      date: a.date ? a.date.toISOString().split('T')[0] : '',
      time: a.time,
      status: a.status as AppointmentStatus,
      priority: a.priority as PriorityLevel,
      tokenNumber: a.tokenNumber,
      estimatedTime: a.estimatedTime,
      createdBy: a.createdBy
    }));

    return res.json({
      status: 'success',
      data: normalized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Queue Error:', error);
    return res.status(500).json({
      success: false,
      code: 'QUEUE_FAILED',
      message: 'Failed to retrieve active waiting queue.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments/slots:
 *   get:
 *     tags: [Appointments]
 *     summary: Get available time slots
 *     description: Returns available appointment slots for a specific doctor on a given date.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Available slots retrieved
 *       400:
 *         description: Missing doctorId or date
 *       500:
 *         description: Internal server error
 */
router.get('/slots', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { doctorId, date } = req.query;

  try {
    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_PARAMS',
        message: 'doctorId and date query parameters are required.'
      });
    }

    const queryDate = new Date(date as string);
    const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(); // MONDAY, TUESDAY, etc.

    // 1. Fetch Doctor schedule
    const schedule = await prisma.doctorSchedule.findFirst({
      where: {
        doctorId: doctorId as string,
        day: dayOfWeek,
        leaveStatus: false
      }
    });

    if (!schedule) {
      return res.json({
        status: 'success',
        data: [], // No available slots
        message: 'Doctor is not scheduled or on leave for this day.'
      });
    }

    // 2. Fetch existing appointments
    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId as string,
        date: queryDate,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW']
        }
      },
      select: {
        time: true
      }
    });

    const bookedTimes = new Set(bookedAppointments.map(a => a.time));

    // 3. Generate slots in 30-minute intervals
    const slots = [];
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);

    let current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const endLimit = new Date();
    endLimit.setHours(endHour, endMin, 0, 0);

    while (current < endLimit) {
      const timeString = current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      slots.push({
        time: timeString,
        available: !bookedTimes.has(timeString)
      });
      current.setMinutes(current.getMinutes() + 30);
    }

    return res.json({
      status: 'success',
      data: slots,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Slots Error:', error);
    return res.status(500).json({
      success: false,
      code: 'SLOTS_FAILED',
      message: 'Failed to retrieve available timeslots.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get a single appointment
 *     description: Returns detailed appointment information by ID.
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
 *         description: Appointment details retrieved
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId: id },
      include: {
        patient: true,
        doctor: {
          include: {
            user: {
              select: {
                username: true
              }
            }
          }
        },
        department: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: 'APPOINTMENT_NOT_FOUND',
        message: `Appointment with ID ${id} does not exist.`
      });
    }

    // Access control: Patients can only fetch their own appointments
    if (req.user?.role === 'PATIENT') {
      const patientProfile = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });
      if (!patientProfile || patientProfile.patientId !== appointment.patientId) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to view this appointment.'
        });
      }
    }

    const normalized = {
      appointmentId: appointment.appointmentId,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      departmentId: appointment.departmentId,
      date: appointment.date ? appointment.date.toISOString().split('T')[0] : '',
      time: appointment.time,
      status: appointment.status as AppointmentStatus,
      priority: appointment.priority as PriorityLevel,
      tokenNumber: appointment.tokenNumber,
      estimatedTime: appointment.estimatedTime,
      createdBy: appointment.createdBy
    };

    return res.json({
      status: 'success',
      data: normalized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Appointment ID Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'An unexpected error occurred while fetching appointment.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Book a new appointment
 *     description: Creates a new appointment with automatic token sequencing and wait-time estimation.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, doctorId, date, timeSlot]
 *             properties:
 *               patientId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               timeSlot:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [NORMAL, CHILD, DISABLED, PREGNANT, SENIOR_CITIZEN, EMERGENCY]
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *       400:
 *         description: Missing fields or slot conflict
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { patientId, doctorId, date, time, priority } = req.body;

  try {
    let targetPatientId = patientId;

    // Retrieve patient profile if logged-in user is PATIENT
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
    }

    if (!targetPatientId || !doctorId || !date) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'patientId, doctorId, and date are required.'
      });
    }

    // Verify doctor exists and retrieve department
    const doctor = await prisma.doctor.findUnique({
      where: { doctorId }
    });

    if (!doctor) {
      return res.status(400).json({
        success: false,
        code: 'DOCTOR_NOT_FOUND',
        message: `Doctor with ID ${doctorId} does not exist.`
      });
    }

    const queryDate = new Date(date);

    // Calculate token number (appointments for this doctor on this day + 1)
    const dailyAppointments = await prisma.appointment.count({
      where: {
        doctorId,
        date: queryDate
      }
    });

    const tokenNumber = 101 + dailyAppointments;

    // Estimate waiting time based on active queue for this doctor
    const waitingCount = await prisma.appointment.count({
      where: {
        doctorId,
        date: queryDate,
        status: 'WAITING'
      }
    });
    const consultationRunning = await prisma.appointment.count({
      where: {
        doctorId,
        date: queryDate,
        status: 'IN_CONSULTATION'
      }
    });
    const estimatedTime = (waitingCount + (consultationRunning > 0 ? 1 : 0)) * 12;

    const newAppt = await prisma.appointment.create({
      data: {
        patientId: targetPatientId,
        doctorId,
        departmentId: doctor.departmentId,
        date: queryDate,
        time: time || '09:00',
        status: 'WAITING',
        priority: (priority || 'NORMAL') as PriorityLevel,
        tokenNumber,
        estimatedTime,
        createdBy: req.user?.username || 'system'
      }
    });

    const normalized = {
      appointmentId: newAppt.appointmentId,
      patientId: newAppt.patientId,
      doctorId: newAppt.doctorId,
      departmentId: newAppt.departmentId,
      date: newAppt.date ? newAppt.date.toISOString().split('T')[0] : '',
      time: newAppt.time,
      status: newAppt.status as AppointmentStatus,
      priority: newAppt.priority as PriorityLevel,
      tokenNumber: newAppt.tokenNumber,
      estimatedTime: newAppt.estimatedTime,
      createdBy: newAppt.createdBy
    };

    // Fire appointment confirmation notification for the patient
    try {
      const patientUser = await prisma.patient.findUnique({
        where: { patientId: newAppt.patientId },
        select: { userId: true }
      });
      if (patientUser?.userId) {
        await prisma.notification.create({
          data: {
            userId: patientUser.userId,
            type: 'APPOINTMENT',
            title: 'Appointment Confirmed',
            message: `Your appointment (Token #${tokenNumber}) on ${queryDate.toISOString().split('T')[0]} at ${time || '09:00'} has been confirmed.`,
            status: 'UNREAD'
          }
        });

        await notificationDispatchService.dispatch({
          recipientUserId: patientUser.userId,
          category: 'APPOINTMENT',
          channel: 'BOTH',
          subject: 'Appointment Confirmed - MHSHMS',
          message: `Your appointment (Token #${tokenNumber}) on ${queryDate.toISOString().split('T')[0]} at ${time || '09:00'} has been confirmed.`
        });
      }
    } catch (notifErr) {
      console.warn('Notification trigger failed (non-critical):', notifErr);
    }

    // Audit: APPOINTMENT CREATE
    logAudit(prisma, req.user!.id, 'CREATE', 'APPOINTMENT', normalized.appointmentId, req.ip || '0.0.0.0');

    return res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully.',
      data: normalized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Book Appointment Error:', error);
    return res.status(500).json({
      success: false,
      code: 'BOOKING_FAILED',
      message: 'Failed to book appointment.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   put:
 *     tags: [Appointments]
 *     summary: Update appointment
 *     description: Updates appointment status, date/time, or priority level.
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
 *         description: Appointment updated
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, time, status, priority } = req.body;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId: id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: 'APPOINTMENT_NOT_FOUND',
        message: `Appointment with ID ${id} does not exist.`
      });
    }

    // Access control: patients can only update/cancel their own appointments
    if (req.user?.role === 'PATIENT') {
      const patientProfile = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });
      if (!patientProfile || patientProfile.patientId !== appointment.patientId) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to modify this appointment.'
        });
      }
      
      // Enforce that patients can only set status to CANCELLED
      if (status && status !== 'CANCELLED') {
        return res.status(403).json({
          success: false,
          code: 'UNAUTHORIZED_STATUS_CHANGE',
          message: 'Patients can only cancel appointments.'
        });
      }
    }

    const updates: any = {};
    if (date) updates.date = new Date(date);
    if (time) updates.time = time;
    if (status) updates.status = status as AppointmentStatus;
    if (priority) updates.priority = priority as PriorityLevel;

    const updated = await prisma.appointment.update({
      where: { appointmentId: id },
      data: updates
    });

    const normalized = {
      appointmentId: updated.appointmentId,
      patientId: updated.patientId,
      doctorId: updated.doctorId,
      departmentId: updated.departmentId,
      date: updated.date ? updated.date.toISOString().split('T')[0] : '',
      time: updated.time,
      status: updated.status as AppointmentStatus,
      priority: updated.priority as PriorityLevel,
      tokenNumber: updated.tokenNumber,
      estimatedTime: updated.estimatedTime,
      createdBy: updated.createdBy
    };

    // Audit: APPOINTMENT UPDATE
    logAudit(prisma, req.user!.id, 'UPDATE', 'APPOINTMENT', normalized.appointmentId, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Appointment updated successfully.',
      data: normalized,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update Appointment Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to update appointment.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/appointments/{id}:
 *   delete:
 *     tags: [Appointments]
 *     summary: Cancel/delete appointment
 *     description: Cancels and deletes an appointment by ID.
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
 *         description: Appointment cancelled
 *       404:
 *         description: Appointment not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId: id }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        code: 'APPOINTMENT_NOT_FOUND',
        message: `Appointment with ID ${id} does not exist.`
      });
    }

    // Access control
    if (req.user?.role === 'PATIENT') {
      const patientProfile = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });
      if (!patientProfile || patientProfile.patientId !== appointment.patientId) {
        return res.status(403).json({
          success: false,
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this appointment.'
        });
      }
    }

    await prisma.appointment.delete({
      where: { appointmentId: id }
    });

    return res.json({
      status: 'success',
      message: `Appointment file with ID ${id} has been deleted.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Delete Appointment Error:', error);
    return res.status(500).json({
      success: false,
      code: 'DELETE_FAILED',
      message: 'Failed to delete appointment.',
      details: error.message
    });
  }
});

export default router;
