import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const res = await query(`
    SELECT d.*,
           COUNT(DISTINCT i.id)::int AS institution_count,
           COUNT(DISTINCT s.id)::int AS student_count,
           COUNT(DISTINCT CASE WHEN ea.status <> 'IN_PROGRESS' THEN ea.id END)::int AS completed_count
    FROM districts d
    LEFT JOIN institutions i ON i.district_id = d.id
    LEFT JOIN students s ON s.district_id = d.id
    LEFT JOIN exam_attempts ea ON ea.student_id = s.id
    GROUP BY d.id
    ORDER BY d.id ASC
  `);
  return NextResponse.json({ districts: res.rows });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "District id required." }, { status: 400 });
  }
  await query(
    `UPDATE districts
     SET coordinator_name = COALESCE($2, coordinator_name),
         coordinator_phone = COALESCE($3, coordinator_phone),
         is_active = COALESCE($4, is_active)
     WHERE id = $1`,
    [
      id,
      body.coordinatorName ?? null,
      body.coordinatorPhone ?? null,
      typeof body.isActive === "boolean" ? body.isActive : null,
    ]
  );
  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_UPDATED_DISTRICT",
    entityType: "DISTRICT",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
