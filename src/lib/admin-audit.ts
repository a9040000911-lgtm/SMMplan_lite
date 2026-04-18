import { db } from '@/lib/db';

/**
 * Logs an administrative action to the AdminAuditLog table.
 * Uses fire-and-forget by default (non-blocking).
 * For critical actions (balance changes), pass `await` explicitly.
 */
export function auditAdmin(params: {
  adminId: string;
  adminEmail: string;
  action: string;
  target: string;
  targetType: 'USER' | 'SERVICE' | 'ORDER' | 'SETTINGS' | 'PROVIDER' | 'TICKET';
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
}) {
  // Fire-and-forget: does not block the main operation
  void db.adminAuditLog.create({
    data: {
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      action: params.action,
      target: params.target,
      targetType: params.targetType,
      oldValue: params.oldValue != null ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue != null ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress ?? null,
    },
  }).catch((err) => {
    // Silently log — audit failure must never crash the primary action
    console.error('[AdminAudit] Failed to write log:', err);
  });
}
