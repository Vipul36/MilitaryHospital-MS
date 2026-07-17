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
 * /api/v1/audit:
 *   get:
 *     tags: [Audit]
 *     summary: List audit logs (paginated)
 *     description: Returns paginated audit logs with optional filters by entity, action, and userId. Admin only.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const skip  = (page - 1) * limit;

  const { entity, action, userId: filterUserId } = req.query;

  try {
    const where: any = {};
    if (entity)       where.entity = (entity as string).toUpperCase();
    if (action)       where.action = (action as string).toUpperCase();
    if (filterUserId) where.userId = filterUserId as string;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { username: true, role: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    const formatted = logs.map((l: any) => ({
      auditId:   l.auditId,
      userId:    l.userId,
      username:  l.user?.username || 'Unknown',
      role:      l.user?.role || 'UNKNOWN',
      action:    l.action,
      entity:    l.entity,
      entityId:  l.entityId,
      ipAddress: l.ipAddress,
      timestamp: l.timestamp.toISOString()
    }));

    return res.json({
      status: 'success',
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Fetch Audit Logs Error:', error);
    return res.status(500).json({
      success: false,
      code: 'FETCH_FAILED',
      message: 'Failed to retrieve audit logs.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/audit/summary:
 *   get:
 *     tags: [Audit]
 *     summary: Get audit summary statistics
 *     description: Returns aggregated action-type counts for audit dashboard widgets. Admin only.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Audit summary retrieved
 *       500:
 *         description: Internal server error
 */
router.get('/summary', authenticateJWT, requireRoles(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'];

    const counts = await Promise.all(
      actions.map(async (a) => ({
        action: a,
        count: await prisma.auditLog.count({ where: { action: a } })
      }))
    );

    const total = await prisma.auditLog.count();

    // Recent 5 entries for quick preview
    const recent = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { user: { select: { username: true, role: true } } }
    });

    return res.json({
      status: 'success',
      data: {
        total,
        byAction: counts,
        recent: recent.map((l: any) => ({
          auditId:   l.auditId,
          username:  l.user?.username || 'Unknown',
          action:    l.action,
          entity:    l.entity,
          entityId:  l.entityId,
          timestamp: l.timestamp.toISOString()
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Audit Summary Error:', error);
    return res.status(500).json({
      success: false,
      code: 'SUMMARY_FAILED',
      message: 'Failed to retrieve audit summary.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/audit/export:
 *   get:
 *     tags: [Audit]
 *     summary: Export audit logs as CSV
 *     description: Streams filtered audit logs as a UTF-8 CSV file. Accepts same filters as the list endpoint.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV file stream
 *       500:
 *         description: Export failed
 */
router.get('/export', authenticateJWT, exportRateLimiter, requireRoles(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { entity, action, userId: filterUserId } = req.query;

  try {
    const where: any = {};
    if (entity)        where.entity = (entity as string).toUpperCase();
    if (action)        where.action = (action as string).toUpperCase();
    if (filterUserId)  where.userId = filterUserId as string;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { username: true, role: true } }
      }
    });

    // Helper: escape CSV field
    const esc = (val: any): string => {
      const str = val == null ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Audit ID', 'Timestamp', 'Username', 'Role',
      'Action', 'Entity', 'Entity ID', 'IP Address'
    ];

    const rows = logs.map((l: any) => [
      esc(l.auditId),
      esc(l.timestamp.toISOString()),
      esc(l.user?.username || 'Unknown'),
      esc(l.user?.role || 'UNKNOWN'),
      esc(l.action),
      esc(l.entity),
      esc(l.entityId),
      esc(l.ipAddress)
    ].join(','));

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit_log_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.send('\uFEFF' + csvContent); // BOM prefix for Excel UTF-8 compatibility
  } catch (error: any) {
    console.error('Audit CSV Export Error:', error);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_FAILED',
      message: 'Failed to export audit logs as CSV.',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/v1/audit/export-xlsx:
 *   get:
 *     tags: [Audit]
 *     summary: Export audit logs as Excel
 *     description: Generates an Excel workbook of audit logs with formatted headers and auto-width columns.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file stream
 *       500:
 *         description: Export failed
 */
router.get('/export-xlsx', authenticateJWT, exportRateLimiter, requireRoles(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { entity, action, userId: filterUserId } = req.query;

  try {
    const where: any = {};
    if (entity)        where.entity = (entity as string).toUpperCase();
    if (action)        where.action = (action as string).toUpperCase();
    if (filterUserId)  where.userId = filterUserId as string;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { username: true, role: true } }
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MHSHMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Audit Logs', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Audit ID', key: 'auditId', width: 38 },
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Role', key: 'role', width: 22 },
      { header: 'Action', key: 'action', width: 14 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Entity ID', key: 'entityId', width: 38 },
      { header: 'IP Address', key: 'ipAddress', width: 16 }
    ];

    // Style header row — deep navy background, white bold text
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A5F' } // Deep Navy
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    // Populate rows
    logs.forEach((l: any) => {
      const row = sheet.addRow({
        auditId: l.auditId,
        timestamp: l.timestamp.toISOString(),
        username: l.user?.username || 'Unknown',
        role: l.user?.role || 'UNKNOWN',
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        ipAddress: l.ipAddress
      });

      // Color-code action cell
      const actionCell = row.getCell('action');
      const act = l.action?.toUpperCase();
      if (act === 'DELETE') {
        actionCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else if (act === 'CREATE') {
        actionCell.font = { bold: true, color: { argb: 'FF16A34A' } };
      } else if (act === 'UPDATE' || act === 'EXPORT') {
        actionCell.font = { bold: true, color: { argb: 'FF2563EB' } };
      } else if (act === 'LOGIN') {
        actionCell.font = { bold: true, color: { argb: 'FF7C3AED' } };
      }
    });

    // Set response headers
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit_log_${dateStr}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Fire-and-forget audit
    logAudit(prisma, req.user!.id, 'EXPORT', 'AUDIT_LOG', 'XLSX_EXPORT', req.ip || '0.0.0.0');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Audit Excel Export Error:', error);
    return res.status(500).json({
      success: false,
      code: 'EXPORT_FAILED',
      message: 'Failed to export audit logs as Excel workbook.',
      details: error.message
    });
  }
});

export default router;
