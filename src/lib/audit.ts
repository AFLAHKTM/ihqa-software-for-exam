import { query } from "./db";
import type { SessionUser } from "./auth";

export async function recordAuditLog(params: {
  actor?: SessionUser | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (
         actor_user_id, actor_name, actor_role, action, entity_type, entity_id, details_json, ip_address
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
      [
        params.actor?.userId ?? null,
        params.actor?.fullName ?? "System",
        params.actor?.role ?? "SYSTEM",
        params.action,
        params.entityType,
        params.entityId != null ? String(params.entityId) : null,
        JSON.stringify(params.details ?? {}),
        params.ipAddress ?? null,
      ]
    );
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }
}
