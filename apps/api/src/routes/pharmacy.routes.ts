import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT, AuthRequest, requireRoles } from '../middlewares/auth.middleware';
import { logAudit } from '../helpers/audit.helper';
import { exportRateLimiter } from '../middlewares/rate-limit.middleware';
import ExcelJS from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/medicines:
 *   get:
 *     tags: [Pharmacy]
 *     summary: List all medicines
 *     description: Returns the complete medicine catalogue.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Medicines list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/medicines', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: {
        brandName: 'asc'
      }
    });

    return res.json({
      status: 'success',
      data: medicines,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Medicines Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve medicine list.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory:
 *   get:
 *     tags: [Pharmacy]
 *     summary: List inventory items
 *     description: Returns all inventory items with medicine details, stock levels, and expiry dates.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory list retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/inventory', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        medicine: true
      },
      orderBy: {
        medicine: {
          brandName: 'asc'
        }
      }
    });

    // Flatten to match frontend Interface InventoryItem
    const formatted = inventory.map((item: any) => ({
      medicineId: item.medicineId,
      genericName: item.medicine.genericName,
      brandName: item.medicine.brandName,
      manufacturer: item.medicine.manufacturer,
      strength: item.medicine.strength,
      unit: item.medicine.unit,
      expiryDate: item.medicine.expiryDate ? item.medicine.expiryDate.toISOString().split('T')[0] : '',
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      locationBatch: item.medicine.batchNumber || ''
    }));

    return res.json({
      status: 'success',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Inventory Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve pharmacy inventory.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory/search:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Search inventory by name
 *     description: Searches inventory by medicine name using case-insensitive partial matching.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       200:
 *         description: Search results returned
 *       400:
 *         description: Missing search query
 *       500:
 *         description: Internal server error
 */
router.get('/inventory/search', authenticateJWT, async (req: AuthRequest, res: Response) => {
  const { q } = req.query;

  try {
    const queryStr = q as string;

    const inventory = await prisma.inventory.findMany({
      where: queryStr ? {
        OR: [
          {
            medicine: {
              brandName: {
                contains: queryStr,
                mode: 'insensitive'
              }
            }
          },
          {
            medicine: {
              genericName: {
                contains: queryStr,
                mode: 'insensitive'
              }
            }
          }
        ]
      } : {},
      include: {
        medicine: true
      }
    });

    const formatted = inventory.map((item: any) => ({
      medicineId: item.medicineId,
      genericName: item.medicine.genericName,
      brandName: item.medicine.brandName,
      manufacturer: item.medicine.manufacturer,
      strength: item.medicine.strength,
      unit: item.medicine.unit,
      expiryDate: item.medicine.expiryDate ? item.medicine.expiryDate.toISOString().split('T')[0] : '',
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      locationBatch: item.medicine.batchNumber || ''
    }));

    return res.json({
      status: 'success',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Search Inventory Error:', error);
    return res.status(500).json({
      success: false,
      code: 'SEARCH_FAILED',
      message: 'Failed to search pharmacy inventory.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory:
 *   post:
 *     tags: [Pharmacy]
 *     summary: Register new stock item
 *     description: Creates a new medicine and inventory entry with stock levels, batch info, and expiry date.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, genericName, manufacturer, category, stock, batchNumber, expiryDate, reorderLevel]
 *             properties:
 *               name:
 *                 type: string
 *               genericName:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *               batchNumber:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               reorderLevel:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Stock item created
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/inventory', authenticateJWT, requireRoles(['ADMIN', 'PHARMACIST']), async (req: AuthRequest, res: Response) => {
  const {
    genericName,
    brandName,
    manufacturer,
    strength,
    unit,
    expiryDate,
    currentStock,
    reorderLevel,
    locationBatch
  } = req.body;

  try {
    if (!genericName || !brandName || !manufacturer || !strength || !unit || !expiryDate) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_FIELDS',
        message: 'Medicine details (genericName, brandName, manufacturer, strength, unit, expiryDate) are required.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findFirst();
      if (!hospital) {
        throw new Error('No hospital record found to link inventory.');
      }

      const newMed = await tx.medicine.create({
        data: {
          genericName,
          brandName,
          manufacturer,
          strength,
          unit,
          expiryDate: new Date(expiryDate),
          batchNumber: locationBatch || 'Batch-001'
        }
      });

      const newInv = await tx.inventory.create({
        data: {
          medicineId: newMed.medicineId,
          hospitalId: hospital.hospitalId,
          currentStock: currentStock !== undefined ? Number(currentStock) : 0,
          reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 10,
          minimumStock: 100,
          maximumStock: 10000
        },
        include: {
          medicine: true
        }
      });

      return newInv;
    });

    const formatted = {
      medicineId: result.medicineId,
      genericName: result.medicine.genericName,
      brandName: result.medicine.brandName,
      manufacturer: result.medicine.manufacturer,
      strength: result.medicine.strength,
      unit: result.medicine.unit,
      expiryDate: result.medicine.expiryDate ? result.medicine.expiryDate.toISOString().split('T')[0] : '',
      currentStock: result.currentStock,
      reorderLevel: result.reorderLevel,
      locationBatch: result.medicine.batchNumber || ''
    };

    // Fire-and-forget audit: CREATE INVENTORY
    logAudit(prisma, req.user!.id, 'CREATE', 'INVENTORY', result.medicineId, req.ip || '0.0.0.0');

    return res.status(201).json({
      status: 'success',
      message: 'Medicine stock item added successfully.',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create Inventory Item Error:', error);
    return res.status(500).json({
      success: false,
      code: 'CREATE_FAILED',
      message: 'Failed to add stock item to inventory.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory/{medicineId}:
 *   put:
 *     tags: [Pharmacy]
 *     summary: Update stock levels
 *     description: Updates stock count and batch details for an inventory item.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: medicineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory updated
 *       404:
 *         description: Inventory item not found
 *       500:
 *         description: Internal server error
 */
router.put('/inventory/:medicineId', authenticateJWT, requireRoles(['ADMIN', 'PHARMACIST']), async (req: AuthRequest, res: Response) => {
  const { medicineId } = req.params;
  const { currentStock, reorderLevel, locationBatch } = req.body;

  try {
    const inv = await prisma.inventory.findFirst({
      where: { medicineId }
    });

    if (!inv) {
      return res.status(404).json({
        success: false,
        code: 'STOCK_ITEM_NOT_FOUND',
        message: `Inventory stock item for medicine with ID ${medicineId} does not exist.`
      });
    }

    const updates: any = {};
    if (currentStock !== undefined) updates.currentStock = Number(currentStock);
    if (reorderLevel !== undefined) updates.reorderLevel = Number(reorderLevel);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedInv = await tx.inventory.update({
        where: { inventoryId: inv.inventoryId },
        data: updates,
        include: {
          medicine: true
        }
      });

      if (locationBatch) {
        const updatedMed = await tx.medicine.update({
          where: { medicineId },
          data: {
            batchNumber: locationBatch
          }
        });
        (updatedInv as any).medicine = updatedMed;
      }

      return updatedInv;
    });

    const formatted = {
      medicineId: updated.medicineId,
      genericName: updated.medicine.genericName,
      brandName: updated.medicine.brandName,
      manufacturer: updated.medicine.manufacturer,
      strength: updated.medicine.strength,
      unit: updated.medicine.unit,
      expiryDate: updated.medicine.expiryDate ? updated.medicine.expiryDate.toISOString().split('T')[0] : '',
      currentStock: updated.currentStock,
      reorderLevel: updated.reorderLevel,
      locationBatch: updated.medicine.batchNumber || ''
    };

    // Fire-and-forget audit: UPDATE INVENTORY
    logAudit(prisma, req.user!.id, 'UPDATE', 'INVENTORY', medicineId, req.ip || '0.0.0.0');

    return res.json({
      status: 'success',
      message: 'Stock levels updated successfully.',
      data: formatted,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update Stock Level Error:', error);
    return res.status(500).json({
      success: false,
      code: 'UPDATE_FAILED',
      message: 'Failed to update stock level details.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory/export:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Export inventory as CSV
 *     description: Streams pharmacy inventory as a UTF-8 CSV file with BOM for Excel compatibility.
 *     security:
 *       - BearerAuth: []
 *     produces:
 *       - text/csv
 *     responses:
 *       200:
 *         description: CSV file stream
 *       500:
 *         description: Export failed
 */
router.get('/inventory/export', authenticateJWT, exportRateLimiter, requireRoles(['ADMIN', 'PHARMACIST', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { medicine: true },
      orderBy: { medicine: { brandName: 'asc' } }
    });

    // Helper: escape CSV field (wrap in quotes, escape internal quotes)
    const esc = (val: any): string => {
      const str = val == null ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Medicine ID', 'Generic Name', 'Brand Name', 'Manufacturer',
      'Strength', 'Unit', 'Expiry Date', 'Current Stock',
      'Reorder Level', 'Batch Number', 'Status'
    ];

    const rows = inventory.map((item: any) => {
      const expiryDate = item.medicine.expiryDate
        ? item.medicine.expiryDate.toISOString().split('T')[0]
        : '';
      const isCritical = item.currentStock < (item.minimumStock || 0);
      const isLow = item.currentStock <= item.reorderLevel;
      const status = isCritical ? 'CRITICAL STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

      return [
        esc(item.medicineId),
        esc(item.medicine.genericName),
        esc(item.medicine.brandName),
        esc(item.medicine.manufacturer),
        esc(item.medicine.strength),
        esc(item.medicine.unit),
        esc(expiryDate),
        esc(item.currentStock),
        esc(item.reorderLevel),
        esc(item.medicine.batchNumber || ''),
        esc(status)
      ].join(',');
    });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pharmacy_inventory_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Fire-and-forget audit
    logAudit(prisma, req.user!.id, 'READ', 'INVENTORY', 'CSV_EXPORT', req.ip || '0.0.0.0');

    return res.send('\uFEFF' + csvContent); // BOM prefix for Excel UTF-8 compatibility
  } catch (error: any) {
    console.error('Inventory CSV Export Error:', error);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_FAILED',
      message: 'Failed to export pharmacy inventory as CSV.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/inventory/export-xlsx:
 *   get:
 *     tags: [Pharmacy]
 *     summary: Export inventory as Excel
 *     description: Generates an Excel workbook with formatted headers, freeze panes, and auto-column widths.
 *     security:
 *       - BearerAuth: []
 *     produces:
 *       - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 *     responses:
 *       200:
 *         description: Excel file stream
 *       500:
 *         description: Export failed
 */
router.get('/inventory/export-xlsx', authenticateJWT, exportRateLimiter, requireRoles(['ADMIN', 'PHARMACIST', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { medicine: true },
      orderBy: { medicine: { brandName: 'asc' } }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MHSHMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Pharmacy Inventory', {
      views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
    });

    // Define columns with auto-width hints
    sheet.columns = [
      { header: 'Medicine ID', key: 'medicineId', width: 38 },
      { header: 'Generic Name', key: 'genericName', width: 24 },
      { header: 'Brand Name', key: 'brandName', width: 24 },
      { header: 'Manufacturer', key: 'manufacturer', width: 22 },
      { header: 'Strength', key: 'strength', width: 12 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Expiry Date', key: 'expiryDate', width: 14 },
      { header: 'Current Stock', key: 'currentStock', width: 14 },
      { header: 'Reorder Level', key: 'reorderLevel', width: 14 },
      { header: 'Batch Number', key: 'batchNumber', width: 16 },
      { header: 'Status', key: 'status', width: 16 }
    ];

    // Style the header row — military green background, white bold text
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF355E3B' } // Military Green
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Populate rows
    inventory.forEach((item: any) => {
      const expiryDate = item.medicine.expiryDate
        ? item.medicine.expiryDate.toISOString().split('T')[0]
        : '';
      const isCritical = item.currentStock < (item.minimumStock || 0);
      const isLow = item.currentStock <= item.reorderLevel;
      const status = isCritical ? 'CRITICAL STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK';

      const row = sheet.addRow({
        medicineId: item.medicineId,
        genericName: item.medicine.genericName,
        brandName: item.medicine.brandName,
        manufacturer: item.medicine.manufacturer,
        strength: item.medicine.strength,
        unit: item.medicine.unit,
        expiryDate,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        batchNumber: item.medicine.batchNumber || '',
        status
      });

      // Color-code status cell
      const statusCell = row.getCell('status');
      if (status === 'CRITICAL STOCK') {
        statusCell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red
      } else if (status === 'LOW STOCK') {
        statusCell.font = { bold: true, color: { argb: 'FFF59E0B' } }; // Amber
      } else {
        statusCell.font = { bold: true, color: { argb: 'FF16A34A' } }; // Green
      }
    });

    // Set response headers
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `pharmacy_inventory_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Fire-and-forget audit
    logAudit(prisma, req.user!.id, 'EXPORT', 'INVENTORY', 'XLSX_EXPORT', req.ip || '0.0.0.0');

    // Stream workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Inventory Excel Export Error:', error);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_FAILED',
      message: 'Failed to export pharmacy inventory as Excel workbook.',
      details: error.message
    });
  }
});

export default router;
