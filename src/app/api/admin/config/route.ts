import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { getActiveConfig } from "@/lib/exam-engine";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const config = await getActiveConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const updated = await query(
    `UPDATE exam_configs
     SET title = COALESCE($1, title),
         subtitle = COALESCE($2, subtitle),
         welcome_message = COALESCE($3, welcome_message),
         eligibility_info = COALESCE($4, eligibility_info),
         exam_date_label = COALESCE($5, exam_date_label),
         duration_minutes = COALESCE($6, duration_minutes),
         exam_status = COALESCE($7, exam_status),
         questions_per_exam = COALESCE($8, questions_per_exam),
         negative_marking_enabled = COALESCE($9, negative_marking_enabled),
         negative_marks_per_wrong = COALESCE($10, negative_marks_per_wrong),
         randomize_questions = COALESCE($11, randomize_questions),
         randomize_options = COALESCE($12, randomize_options),
         passing_percentage = COALESCE($13, passing_percentage),
         results_published = COALESCE($14, results_published),
         show_answers_to_students = COALESCE($15, show_answers_to_students),
         show_merit_rank = COALESCE($16, show_merit_rank),
         updated_at = NOW()
     WHERE slug = 'kerala-initial-screening'
     RETURNING *`,
    [
      body.title ?? null,
      body.subtitle ?? null,
      body.welcome_message ?? null,
      body.eligibility_info ?? null,
      body.exam_date_label ?? null,
      body.duration_minutes ? Number(body.duration_minutes) : null,
      body.exam_status ?? null,
      body.questions_per_exam ? Number(body.questions_per_exam) : null,
      typeof body.negative_marking_enabled === "boolean"
        ? body.negative_marking_enabled
        : null,
      body.negative_marks_per_wrong !== undefined
        ? Number(body.negative_marks_per_wrong)
        : null,
      typeof body.randomize_questions === "boolean" ? body.randomize_questions : null,
      typeof body.randomize_options === "boolean" ? body.randomize_options : null,
      body.passing_percentage !== undefined ? Number(body.passing_percentage) : null,
      typeof body.results_published === "boolean" ? body.results_published : null,
      typeof body.show_answers_to_students === "boolean"
        ? body.show_answers_to_students
        : null,
      typeof body.show_merit_rank === "boolean" ? body.show_merit_rank : null,
    ]
  );

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_UPDATED_EXAM_CONFIG",
    entityType: "EXAM_CONFIG",
    entityId: "kerala-initial-screening",
    details: body,
  });

  return NextResponse.json({ config: updated.rows[0] });
}
