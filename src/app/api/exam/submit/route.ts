import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  evaluateAndFinalizeAttempt,
  getActiveConfig,
  type AttemptRecord,
} from "@/lib/exam-engine";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const finalAnswers = body.answers as Record<string, string> | undefined;
    const autoSubmitted = Boolean(body.autoSubmitted);

    const config = await getActiveConfig();
    if (!config) {
      return NextResponse.json({ error: "Exam config missing" }, { status: 404 });
    }

    const aRes = await query<AttemptRecord>(
      `SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_config_id = $2 LIMIT 1`,
      [session.studentId, config.id]
    );
    const attempt = aRes.rows[0];
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          ok: true,
          alreadySubmitted: true,
          status: config.results_published ? attempt.status : "EVALUATION_PENDING",
        },
        { status: 200 }
      );
    }

    // Persist final answer snapshot if still before deadline (+15s grace for network transit)
    const graceMs = 15_000;
    if (
      finalAnswers &&
      Date.now() <= new Date(attempt.server_deadline_at).getTime() + graceMs
    ) {
      await query(
        `UPDATE exam_attempts SET answers_json = $2::jsonb WHERE id = $1 AND status = 'IN_PROGRESS'`,
        [attempt.id, JSON.stringify(finalAnswers)]
      );
    }

    const finalized = await evaluateAndFinalizeAttempt(attempt.id, autoSubmitted);
    await recordAuditLog({
      actor: session,
      action: autoSubmitted ? "EXAM_AUTO_SUBMITTED" : "EXAM_SUBMITTED",
      entityType: "EXAM_ATTEMPT",
      entityId: attempt.id,
      details: {
        status: finalized?.status,
        obtainedMarks: finalized?.obtained_marks,
      },
    });

    return NextResponse.json({
      ok: true,
      status: config.results_published
        ? finalized?.status
        : "EVALUATION_PENDING",
      submittedAt: finalized?.submitted_at,
    });
  } catch (err) {
    console.error("Exam submit error:", err);
    return NextResponse.json({ error: "Failed to submit examination." }, { status: 500 });
  }
}
