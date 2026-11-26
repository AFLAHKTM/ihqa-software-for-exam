import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getActiveConfig, syncAttemptDeadline, type AttemptRecord } from "@/lib/exam-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const answersPatch = body.answers as Record<string, string> | undefined;
    const markedForReview = Array.isArray(body.markedForReview)
      ? body.markedForReview.map(Number)
      : undefined;

    const config = await getActiveConfig();
    if (!config) {
      return NextResponse.json({ error: "Exam config missing" }, { status: 404 });
    }

    const aRes = await query<AttemptRecord>(
      `SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_config_id = $2 LIMIT 1`,
      [session.studentId, config.id]
    );
    if (!aRes.rows[0]) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const synced = await syncAttemptDeadline(aRes.rows[0]);
    if (synced.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Examination timer expired and attempt was auto-submitted.", completed: true },
        { status: 409 }
      );
    }

    const nextAnswers = answersPatch ?? synced.answers_json ?? {};
    const nextMarked = markedForReview ?? synced.marked_for_review_json ?? [];

    const updated = await query<{ last_saved_at: string }>(
      `UPDATE exam_attempts
       SET answers_json = $2::jsonb,
           marked_for_review_json = $3::jsonb,
           last_saved_at = NOW()
       WHERE id = $1 AND status = 'IN_PROGRESS'
       RETURNING last_saved_at`,
      [synced.id, JSON.stringify(nextAnswers), JSON.stringify(nextMarked)]
    );

    if (updated.rowCount === 0) {
      return NextResponse.json({ error: "Attempt already submitted." }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      lastSavedAt: updated.rows[0].last_saved_at,
    });
  } catch (err) {
    console.error("Exam auto-save error:", err);
    return NextResponse.json({ error: "Failed to save answer." }, { status: 500 });
  }
}
