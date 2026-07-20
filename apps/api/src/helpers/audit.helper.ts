import { PrismaClient } from '@prisma/client';

/**
 * logAudit — fire-and-forget audit trail writer.
 * Always wrapped in try/catch so it NEVER breaks the calling operation.
 */
export async function logAudit(
  prisma: PrismaClient,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  ipAddress: string = '0.0.0.0'
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        ipAddress
      }
    });
  } catch (err) {
    // Non-critical — never propagate
    console.warn(`[AuditLog] Failed to write audit entry (${action} on ${entity}/${entityId}):`, err);
  }
}
