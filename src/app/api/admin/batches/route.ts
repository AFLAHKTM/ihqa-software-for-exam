import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [batchesRes, liveRes, judgesRes] = await Promise.all([
    query(`
      SELECT b.*, COUNT(s.id)::int AS assigned_students
      FROM exam_batches b
      LEFT JOIN students s ON s.batch_id = b.id
      GROUP BY b.id
      ORDER BY b.start_time ASC
    `),
    query(`
      SELECT la.*, s.registration_number, s.full_name AS student_name,
             d.name_en AS district_name, c.name_en AS category_name,
             j.judge_code, j.full_name AS judge_name
      FROM live_assessments la
      JOIN students s ON s.id = la.student_id
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      JOIN judges j ON j.id = la.judge_id
      ORDER BY la.scheduled_start DESC
    `),
    query(`SELECT id, judge_code, full_name, specialization FROM judges WHERE is_active = TRUE`),
  ]);

  return NextResponse.json({
    batches: batchesRes.rows,
    liveAssessments: liveRes.rows,
    judges: judgesRes.rows,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  if (body.kind === "LIVE_ASSESSMENT") {
    const studentId = Number(body.studentId);
    const judgeId = Number(body.judgeId);
    const start = String(body.scheduledStart);
    const end = String(body.scheduledEnd);
    const roomName = `ihqa-live-${studentId}-${Date.now()}`;

    const res = await query(
      `INSERT INTO live_assessments (
         student_id, judge_id, room_name, scheduled_start, scheduled_end, status, recording_disabled
       ) VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, 'SCHEDULED', TRUE)
       RETURNING *`,
      [studentId, judgeId, roomName, start, end]
    );
    await recordAuditLog({
      actor: auth.session,
      action: "ADMIN_SCHEDULED_LIVE_ASSESSMENT",
      entityType: "LIVE_ASSESSMENT",
      entityId: (res.rows[0] as { id: number }).id,
      details: { studentId, judgeId, roomName },
    });
    return NextResponse.json({ assessment: res.rows[0] });
  }

  const res = await query(
    `INSERT INTO exam_batches (batch_code, title, zone, start_time, end_time, max_capacity, status)
     VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz, $6, $7)
     RETURNING *`,
    [
      String(body.batchCode || "").toUpperCase(),
      String(body.title || ""),
      String(body.zone || "ALL"),
      String(body.startTime),
      String(body.endTime),
      Number(body.maxCapacity || 15000),
      String(body.status || "SCHEDULED"),
    ]
  );

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_CREATED_BATCH",
    entityType: "EXAM_BATCH",
    entityId: body.batchCode,
  });

  return NextResponse.json({ batch: res.rows[0] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  if (body.kind === "LIVE_ASSESSMENT") {
    await query(
      `UPDATE live_assessments SET status = $2 WHERE id = $1`,
      [Number(body.id), String(body.status)]
    );
    await recordAuditLog({
      actor: auth.session,
      action: "ADMIN_UPDATED_LIVE_ROOM",
      entityType: "LIVE_ASSESSMENT",
      entityId: body.id,
      details: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  }

  await query(`UPDATE exam_batches SET status = $2 WHERE id = $1`, [
    Number(body.id),
    String(body.status),
  ]);
  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_UPDATED_BATCH_STATUS",
    entityType: "EXAM_BATCH",
    entityId: body.id,
    details: { status: body.status },
  });
  return NextResponse.json({ ok: true });
}
