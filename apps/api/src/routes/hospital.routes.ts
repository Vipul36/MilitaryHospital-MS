import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';
import { generateTelemetryPDF } from '../helpers/pdf.helper';
import { wsService } from '../services/websocket.service';

const router = Router();
const prisma = new PrismaClient();

// In-Memory simulated live bed registry
// Maps to the capacity of Military Hospital Jaipur (50 ICU beds, 400 General beds)
interface Bed {
  bedId: string;
  type: 'ICU' | 'GENERAL';
  ward: string;
  floor: number;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
  patientId?: string;
  patientDefenceId?: string;
  patientRank?: string;
  admittedAt?: string;
}

let bedsRegistry: Bed[] = [];

function initializeBeds() {
  if (bedsRegistry.length > 0) return;

  const wards = [
    { name: 'Kargil General Ward', type: 'GENERAL', floor: 1, count: 12 },
    { name: 'Siachen Acute Care Ward', type: 'GENERAL', floor: 1, count: 10 },
    { name: 'Rezang La ICU Wing', type: 'ICU', floor: 2, count: 8 },
    { name: 'Tiger Hill Recovery Suite', type: 'GENERAL', floor: 3, count: 10 }
  ];

  let idCounter = 1;
  wards.forEach(w => {
    for (let i = 1; i <= w.count; i++) {
      const isOccupied = Math.random() > 0.55;
      const isMaintenance = !isOccupied && Math.random() > 0.85;
      
      const bed: Bed = {
        bedId: `BED-${w.type === 'ICU' ? 'ICU' : 'GEN'}-${idCounter++}`,
        type: w.type as 'ICU' | 'GENERAL',
        ward: w.name,
        floor: w.floor,
        status: isOccupied ? 'OCCUPIED' : (isMaintenance ? 'MAINTENANCE' : 'VACANT')
      };

      if (isOccupied) {
        // Pre-allocate some mock patient info
        const mockPatients = [
          { defenceId: 'DEF-90812-M', rank: 'Major', admittedAt: new Date(Date.now() - 4 * 86400000).toISOString() },
          { defenceId: 'DEF-34190-F', rank: 'Captain', admittedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
          { defenceId: 'DEF-88190-M', rank: 'Havildar', admittedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
          { defenceId: 'DEF-11029-F', rank: 'Subedar', admittedAt: new Date(Date.now() - 1 * 86400000).toISOString() }
        ];
        const selected = mockPatients[Math.floor(Math.random() * mockPatients.length)];
        bed.patientDefenceId = selected.defenceId;
        bed.patientRank = selected.rank;
        bed.admittedAt = selected.admittedAt;
      }

      bedsRegistry.push(bed);
    }
  });
}

/**
 * @swagger
 * /api/v1/hospital/beds:
 *   get:
 *     tags: [Hospital]
 *     summary: Get bed telemetry and ward occupancy
 *     description: Returns floor plans, real-time occupancy data, and capacity summaries for all hospital wards.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Bed telemetry data retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/beds', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    initializeBeds();

    // Query actual capacities from database Hospital entry
    const hospital = await prisma.hospital.findFirst();
    const capacityTotal = hospital?.capacity || 450;
    const icuTotal = hospital?.icuBeds || 50;
    const generalTotal = hospital?.generalBeds || 400;

    const occupiedIcu = bedsRegistry.filter(b => b.type === 'ICU' && b.status === 'OCCUPIED').length;
    const occupiedGen = bedsRegistry.filter(b => b.type === 'GENERAL' && b.status === 'OCCUPIED').length;
    const maintenance = bedsRegistry.filter(b => b.status === 'MAINTENANCE').length;

    return res.json({
      status: 'success',
      data: {
        hospitalName: hospital?.name || 'Military Hospital Jaipur',
        telemetry: bedsRegistry,
        summary: {
          totalBeds: capacityTotal,
          icuTotal,
          icuOccupied: occupiedIcu,
          generalTotal,
          generalOccupied: occupiedGen,
          maintenanceTotal: maintenance,
          vacancyTotal: capacityTotal - (occupiedIcu + occupiedGen + maintenance)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: 'TELEMETRY_FAILED',
      message: 'Failed to retrieve hospital bed telemetry.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/hospital/beds/{id}/allocate:
 *   put:
 *     tags: [Hospital]
 *     summary: Allocate a patient to a bed
 *     description: Assigns a patient to a vacant bed by defence ID and rank.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bed ID (e.g., BED-GEN-1)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientDefenceId:
 *                 type: string
 *               patientRank:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bed allocated successfully
 *       400:
 *         description: Bed not vacant
 *       404:
 *         description: Bed not found
 *       500:
 *         description: Internal server error
 */
router.put('/beds/:id/allocate', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { patientDefenceId, patientRank } = req.body;

    try {
      initializeBeds();

      const bed = bedsRegistry.find(b => b.bedId === id);
      if (!bed) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Bed ${id} does not exist.` });
      }

      if (bed.status !== 'VACANT') {
        return res.status(400).json({ success: false, code: 'NOT_VACANT', message: `Bed ${id} is currently occupied or undergoing maintenance.` });
      }

      // Allocate
      bed.status = 'OCCUPIED';
      bed.patientDefenceId = patientDefenceId || 'UNKNOWN';
      bed.patientRank = patientRank || 'N/A';
      bed.admittedAt = new Date().toISOString();

      logAudit(prisma, req.user!.id, 'CREATE', 'BED_ALLOCATION', id, req.ip || '0.0.0.0');

      wsService.broadcast('BED_UPDATE', bed);

      return res.json({
        status: 'success',
        message: `Successfully allocated Bed ${id} to Patient ${patientDefenceId}.`,
        data: bed,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        code: 'ALLOCATION_FAILED',
        message: 'Failed to allocate bed.',
        details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/hospital/beds/{id}/release:
 *   put:
 *     tags: [Hospital]
 *     summary: Release a patient from a bed
 *     description: Discharges a patient and returns the bed status to VACANT.
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
 *         description: Patient discharged successfully
 *       400:
 *         description: Bed not occupied
 *       404:
 *         description: Bed not found
 *       500:
 *         description: Internal server error
 */
router.put('/beds/:id/release', authenticateJWT, requireRoles(['ADMIN', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      initializeBeds();

      const bed = bedsRegistry.find(b => b.bedId === id);
      if (!bed) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Bed ${id} does not exist.` });
      }

      if (bed.status !== 'OCCUPIED') {
        return res.status(400).json({ success: false, code: 'NOT_OCCUPIED', message: `Bed ${id} is not occupied.` });
      }

      // Log who we are releasing before wipe
      const previousPatient = bed.patientDefenceId;

      // Release
      bed.status = 'VACANT';
      delete bed.patientDefenceId;
      delete bed.patientRank;
      delete bed.admittedAt;

      logAudit(prisma, req.user!.id, 'DELETE', 'BED_ALLOCATION', id, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: `Successfully discharged patient from Bed ${id}.`,
        data: bed,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        code: 'RELEASE_FAILED',
        message: 'Failed to release bed.',
        details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/hospital/beds/{id}/maintenance:
 *   put:
 *     tags: [Hospital]
 *     summary: Toggle bed maintenance status
 *     description: Switches a vacant bed between VACANT and MAINTENANCE states. Cannot toggle occupied beds.
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
 *               underMaintenance:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bed maintenance status updated
 *       400:
 *         description: Bed is occupied
 *       404:
 *         description: Bed not found
 *       500:
 *         description: Internal server error
 */
router.put('/beds/:id/maintenance', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN']),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { underMaintenance } = req.body;

    try {
      initializeBeds();

      const bed = bedsRegistry.find(b => b.bedId === id);
      if (!bed) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Bed ${id} does not exist.` });
      }

      if (bed.status === 'OCCUPIED') {
        return res.status(400).json({ success: false, code: 'OCCUPIED_FOR_MAINTENANCE', message: `Cannot place occupied Bed ${id} in maintenance.` });
      }

      bed.status = underMaintenance ? 'MAINTENANCE' : 'VACANT';

      logAudit(prisma, req.user!.id, 'UPDATE', 'BED_MAINTENANCE', id, req.ip || '0.0.0.0');

      return res.json({
        status: 'success',
        message: `Bed ${id} status updated to ${bed.status}.`,
        data: bed,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        code: 'MAINTENANCE_TOGGLE_FAILED',
        message: 'Failed to toggle maintenance status.',
        details: error.message
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/hospital/beds/pdf:
 *   get:
 *     tags: [Hospital]
 *     summary: Export bed telemetry as PDF
 *     description: Generates a military-grade PDF report of current bed occupancy, ward metrics, and capacity utilization.
 *     security:
 *       - BearerAuth: []
 *     produces:
 *       - application/pdf
 *     responses:
 *       200:
 *         description: PDF document stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: PDF generation failed
 */
router.get('/beds/pdf', authenticateJWT, requireRoles(['ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'COMMAND_MEDICAL_OFFICER']),
  async (req: AuthRequest, res: Response) => {
    try {
      initializeBeds();

      // Query actual capacities from database Hospital entry
      const hospital = await prisma.hospital.findFirst();
      const capacityTotal = hospital?.capacity || 450;
      const icuTotal = hospital?.icuBeds || 50;
      const generalTotal = hospital?.generalBeds || 400;

      const occupiedIcu = bedsRegistry.filter(b => b.type === 'ICU' && b.status === 'OCCUPIED').length;
      const occupiedGen = bedsRegistry.filter(b => b.type === 'GENERAL' && b.status === 'OCCUPIED').length;
      const maintenance = bedsRegistry.filter(b => b.status === 'MAINTENANCE').length;

      const data = {
        hospitalName: hospital?.name || 'Military Hospital Jaipur',
        telemetry: bedsRegistry,
        summary: {
          totalBeds: capacityTotal,
          icuTotal,
          icuOccupied: occupiedIcu,
          generalTotal,
          generalOccupied: occupiedGen,
          maintenanceTotal: maintenance,
          vacancyTotal: capacityTotal - (occupiedIcu + occupiedGen + maintenance)
        }
      };

      // Generate and stream PDF
      generateTelemetryPDF(data, res);
    } catch (error: any) {
      console.error('Export Telemetry PDF Error:', error);
      return res.status(500).json({
        success: false, code: 'PDF_FAILED',
        message: 'Failed to generate telemetry PDF report.', details: error.message
      });
    }
  }
);

export default router;
