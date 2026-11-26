import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [resultsRes, meritRes] = await Promise.all([
    query(`
      SELECT ea.id, ea.status, ea.started_at, ea.submitted_at, ea.auto_submitted,
             ea.total_marks, ea.obtained_marks, ea.correct_count, ea.wrong_count, ea.unanswered_count,
             s.id AS student_id, s.registration_number, s.full_name AS student_name,
             d.name_en AS district_name, c.name_en AS category_name, i.name AS institution_name
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN institutions i ON i.id = s.institution_id
      ORDER BY ea.obtained_marks DESC, ea.submitted_at ASC
    `),
    query(`
      SELECT s.id AS student_id, s.registration_number, s.full_name AS student_name,
             d.name_en AS district_name, c.name_en AS category_name, i.name AS institution_name,
             COALESCE(ea.obtained_marks, 0) AS screening_marks,
             COALESCE(ea.total_marks, 0) AS screening_total,
             ea.status AS screening_status,
             la.total_score AS live_recitation_score,
             la.status AS live_status,
             la.result_published AS live_published
      FROM students s
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN institutions i ON i.id = s.institution_id
      LEFT JOIN exam_attempts ea ON ea.student_id = s.id
      LEFT JOIN live_assessments la ON la.student_id = s.id
      WHERE ea.id IS NOT NULL OR la.id IS NOT NULL
      ORDER BY COALESCE(la.total_score, 0) DESC, COALESCE(ea.obtained_marks, 0) DESC
    `),
  ]);

  return NextResponse.json({
    results: resultsRes.rows,
    meritList: meritRes.rows,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  if (body.kind === "LIVE_PUBLISH") {
    await query(`UPDATE live_assessments SET result_published = $2 WHERE id = $1`, [
      Number(body.assessmentId),
      Boolean(body.published),
    ]);
    await recordAuditLog({
      actor: auth.session,
      action: "ADMIN_TOGGLED_LIVE_RESULT_VISIBILITY",
      entityType: "LIVE_ASSESSMENT",
      entityId: body.assessmentId,
      details: { published: Boolean(body.published) },
    });
    return NextResponse.json({ ok: true });
  }

  const attemptId = Number(body.attemptId);
  const status = String(body.status || "");
  if (!attemptId || !["SUBMITTED", "EVALUATION_PENDING", "QUALIFIED", "NOT_QUALIFIED"].includes(status)) {
    return NextResponse.json({ error: "Invalid result status update." }, { status: 400 });
  }

  await query(`UPDATE exam_attempts SET status = $2 WHERE id = $1`, [attemptId, status]);
  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_UPDATED_RESULT_STATUS",
    entityType: "EXAM_ATTEMPT",
    entityId: attemptId,
    details: { status },
  });

  return NextResponse.json({ ok: true });
}
