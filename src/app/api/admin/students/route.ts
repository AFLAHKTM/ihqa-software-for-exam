import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin-guard";
import { query, withTransaction } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const districtId = searchParams.get("districtId");
  const categoryId = searchParams.get("categoryId");

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(s.full_name ILIKE $${params.length} OR s.registration_number ILIKE $${params.length})`);
  }
  if (districtId && districtId !== "ALL") {
    params.push(Number(districtId));
    conditions.push(`s.district_id = $${params.length}`);
  }
  if (categoryId && categoryId !== "ALL") {
    params.push(Number(categoryId));
    conditions.push(`s.category_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT s.id, s.registration_number, s.full_name, s.eligibility_status, s.guardian_name,
            u.email, u.phone,
            d.id AS district_id, d.name_en AS district_name,
            c.id AS category_id, c.name_en AS category_name,
            i.id AS institution_id, i.name AS institution_name,
            b.id AS batch_id, b.batch_code,
            ea.status AS exam_status, ea.obtained_marks, ea.total_marks
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN districts d ON d.id = s.district_id
     JOIN categories c ON c.id = s.category_id
     LEFT JOIN institutions i ON i.id = s.institution_id
     LEFT JOIN exam_batches b ON b.id = s.batch_id
     LEFT JOIN exam_attempts ea ON ea.student_id = s.id
     ${where}
     ORDER BY s.id DESC
     LIMIT 200`,
    params
  );

  return NextResponse.json({ students: res.rows });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const registrationNumber = String(body.registrationNumber || "").trim().toUpperCase();
    const fullName = String(body.fullName || "").trim();
    const districtId = Number(body.districtId);
    const categoryId = Number(body.categoryId);
    const institutionId = body.institutionId ? Number(body.institutionId) : null;
    const batchId = body.batchId ? Number(body.batchId) : null;
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const guardianName = body.guardianName ? String(body.guardianName).trim() : null;
    const password = String(body.password || "Student@2026");

    if (!registrationNumber || !fullName || !districtId || !categoryId) {
      return NextResponse.json(
        { error: "Registration number, full name, district, and category are required." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await withTransaction(async (tx) => {
      const uRes = await tx.query<{ id: number }>(
        `INSERT INTO users (username, email, phone, full_name, role, password_hash)
         VALUES ($1, $2, $3, $4, 'STUDENT', $5)
         RETURNING id`,
        [registrationNumber, email, phone, fullName, passwordHash]
      );
      const sRes = await tx.query(
        `INSERT INTO students (
           user_id, registration_number, full_name, institution_id, district_id,
           category_id, batch_id, eligibility_status, guardian_name
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          uRes.rows[0].id,
          registrationNumber,
          fullName,
          institutionId,
          districtId,
          categoryId,
          batchId,
          body.eligibilityStatus || "ELIGIBLE",
          guardianName,
        ]
      );
      return sRes.rows[0];
    });

    await recordAuditLog({
      actor: auth.session,
      action: "ADMIN_CREATED_STUDENT",
      entityType: "STUDENT",
      entityId: registrationNumber,
    });

    return NextResponse.json({ student: created });
  } catch (err) {
    console.error("Create student error:", err);
    return NextResponse.json(
      { error: "Could not register student (check duplicate registration number)." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const studentId = Number(body.studentId);
  const eligibilityStatus = String(body.eligibilityStatus || "");
  if (!studentId || !["ELIGIBLE", "PENDING_VERIFICATION", "INELIGIBLE"].includes(eligibilityStatus)) {
    return NextResponse.json({ error: "Invalid student update." }, { status: 400 });
  }

  await query("UPDATE students SET eligibility_status = $2 WHERE id = $1", [
    studentId,
    eligibilityStatus,
  ]);

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_UPDATED_ELIGIBILITY",
    entityType: "STUDENT",
    entityId: studentId,
    details: { eligibilityStatus },
  });

  return NextResponse.json({ ok: true });
}
