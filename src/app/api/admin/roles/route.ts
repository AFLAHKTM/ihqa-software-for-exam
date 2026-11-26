import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin-guard";
import { query, withTransaction } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [usersRes, judgesRes, logsRes, ticketsRes] = await Promise.all([
    query(
      `SELECT id, username, email, phone, full_name, role, is_active, last_login_at, created_at
       FROM users
       WHERE role <> 'STUDENT'
       ORDER BY id ASC`
    ),
    query(
      `SELECT j.*, d.name_en AS district_name,
              COUNT(la.id)::int AS assigned_count
       FROM judges j
       LEFT JOIN districts d ON d.id = j.district_id
       LEFT JOIN live_assessments la ON la.judge_id = j.id
       GROUP BY j.id, d.name_en
       ORDER BY j.id ASC`
    ),
    query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 80`),
    query(`SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 50`),
  ]);

  return NextResponse.json({
    staffUsers: usersRes.rows,
    judges: judgesRes.rows,
    auditLogs: logsRes.rows,
    supportTickets: ticketsRes.rows,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const role = String(body.role || "JUDGE").toUpperCase();
  const username = String(body.username || "").trim();
  const fullName = String(body.fullName || "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const password = String(body.password || "Staff@IHQA2026");

  if (!username || !fullName) {
    return NextResponse.json({ error: "Username/code and full name are required." }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const created = await withTransaction(async (tx) => {
    const uRes = await tx.query<{ id: number }>(
      `INSERT INTO users (username, email, full_name, role, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, email, fullName, role, hash]
    );
    if (role === "JUDGE") {
      await tx.query(
        `INSERT INTO judges (user_id, judge_code, full_name, specialization, district_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          uRes.rows[0].id,
          username.toUpperCase(),
          fullName,
          body.specialization || "Quran Recitation & Tajweed Panelist",
          body.districtId ? Number(body.districtId) : null,
        ]
      );
    }
    return uRes.rows[0];
  });

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_CREATED_STAFF_USER",
    entityType: "USER",
    entityId: created.id,
    details: { username, role },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
