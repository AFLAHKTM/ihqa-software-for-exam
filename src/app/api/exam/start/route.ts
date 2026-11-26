import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, withTransaction } from "@/lib/db";
import {
  getActiveConfig,
  shuffleArray,
  syncAttemptDeadline,
  type AttemptRecord,
  type QuestionOrderItem,
} from "@/lib/exam-engine";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Student authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const acknowledged = Boolean(body.acknowledged);
    if (!acknowledged) {
      return NextResponse.json(
        { error: "You must acknowledge the pre-examination instructions before starting." },
        { status: 400 }
      );
    }

    const config = await getActiveConfig();
    if (!config || config.exam_status !== "OPEN") {
      return NextResponse.json(
        { error: "The examination is currently not open for attempts." },
        { status: 403 }
      );
    }

    const sRes = await query<{
      id: number;
      category_id: number;
      eligibility_status: string;
      batch_start: string | null;
      batch_end: string | null;
      batch_status: string | null;
    }>(
      `SELECT s.id, s.category_id, s.eligibility_status,
              b.start_time AS batch_start, b.end_time AS batch_end, b.status AS batch_status
       FROM students s
       LEFT JOIN exam_batches b ON b.id = s.batch_id
       WHERE s.id = $1`,
      [session.studentId]
    );
    const student = sRes.rows[0];
    if (!student || student.eligibility_status !== "ELIGIBLE") {
      return NextResponse.json(
        { error: "Your account is not marked eligible for this examination yet." },
        { status: 403 }
      );
    }

    const nowMs = Date.now();
    if (
      student.batch_start &&
      (student.batch_status !== "ACTIVE" ||
        nowMs < new Date(student.batch_start).getTime() ||
        (student.batch_end && nowMs > new Date(student.batch_end).getTime()))
    ) {
      return NextResponse.json(
        { error: "Your assigned examination batch window is not currently active." },
        { status: 403 }
      );
    }

    const attempt = await withTransaction(async (tx) => {
      const existingRes = await tx.query<AttemptRecord>(
        `SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_config_id = $2 FOR UPDATE`,
        [student.id, config.id]
      );

      if (existingRes.rows[0]) {
        const synced = await syncAttemptDeadline(existingRes.rows[0]);
        if (synced.status !== "IN_PROGRESS") {
          throw new Error("DUPLICATE_ATTEMPT");
        }
        return synced;
      }

      const qRes = await tx.query<{
        id: number;
        question_set: string;
        options_json: Array<{ id: string }>;
      }>(
        `SELECT id, question_set, options_json
         FROM questions
         WHERE is_active = TRUE AND (category_id IS NULL OR category_id = $1)
         ORDER BY id ASC`,
        [student.category_id]
      );

      if (qRes.rows.length === 0) {
        throw new Error("NO_QUESTIONS");
      }

      const pool = config.randomize_questions ? shuffleArray(qRes.rows) : qRes.rows;
      const selected = pool.slice(0, Math.min(config.questions_per_exam, pool.length));

      const questionOrder: QuestionOrderItem[] = selected.map((q) => {
        const optIds = (q.options_json || []).map((o) => o.id);
        return {
          questionId: q.id,
          optionOrder: config.randomize_options ? shuffleArray(optIds) : optIds,
        };
      });

      const inserted = await tx.query<AttemptRecord>(
        `INSERT INTO exam_attempts (
           student_id, exam_config_id, question_set, status,
           started_at, server_deadline_at, instructions_acknowledged_at,
           question_order_json, answers_json, marked_for_review_json
         ) VALUES (
           $1, $2, $3, 'IN_PROGRESS',
           NOW(), NOW() + ($4 || ' minutes')::interval, NOW(),
           $5::jsonb, '{}'::jsonb, '[]'::jsonb
         ) RETURNING *`,
        [
          student.id,
          config.id,
          selected[0]?.question_set || "SET-A",
          String(config.duration_minutes),
          JSON.stringify(questionOrder),
        ]
      );
      return inserted.rows[0];
    });

    await recordAuditLog({
      actor: session,
      action: "EXAM_STARTED",
      entityType: "EXAM_ATTEMPT",
      entityId: attempt.id,
      details: { deadline: attempt.server_deadline_at },
    });

    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      serverDeadlineAt: attempt.server_deadline_at,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_ATTEMPT") {
      return NextResponse.json(
        { error: "You have already completed your authorised examination attempt." },
        { status: 409 }
      );
    }
    if (err instanceof Error && err.message === "NO_QUESTIONS") {
      return NextResponse.json(
        { error: "No active questions are configured for your category yet." },
        { status: 400 }
      );
    }
    console.error("Exam start error:", err);
    return NextResponse.json({ error: "Could not start examination." }, { status: 500 });
  }
}
