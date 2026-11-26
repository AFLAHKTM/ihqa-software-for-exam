import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const res = await query(`
    SELECT i.*, d.name_en AS district_name,
           COUNT(s.id)::int AS student_count
    FROM institutions i
    JOIN districts d ON d.id = i.district_id
    LEFT JOIN students s ON s.institution_id = i.id
    GROUP BY i.id, d.name_en
    ORDER BY i.id DESC
  `);
  return NextResponse.json({ institutions: res.rows });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const districtId = Number(body.districtId);
  const place = String(body.place || "").trim();

  if (!code || !name || !districtId || !place) {
    return NextResponse.json({ error: "All institution fields are required." }, { status: 400 });
  }

  const res = await query(
    `INSERT INTO institutions (code, name, district_id, place, contact_person, contact_phone, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
    [code, name, districtId, place, body.contactPerson || null, body.contactPhone || null]
  );

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_CREATED_INSTITUTION",
    entityType: "INSTITUTION",
    entityId: code,
  });

  return NextResponse.json({ institution: res.rows[0] });
}
