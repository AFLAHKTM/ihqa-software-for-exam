import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  getActiveConfig,
  syncAttemptDeadline,
  type AttemptRecord,
  type QuestionOrderItem,
} from "@/lib/exam-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getActiveConfig();
    if (!config) {
      return NextResponse.json({ error: "Exam config missing" }, { status: 404 });
    }

    const aRes = await query<AttemptRecord>(
      `SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_config_id = $2 LIMIT 1`,
      [session.studentId, config.id]
    );

    if (!aRes.rows[0]) {
      return NextResponse.json({ error: "No active exam attempt. Start from dashboard." }, { status: 404 });
    }

    const attempt = await syncAttemptDeadline(aRes.rows[0]);
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({
        completed: true,
        status: attempt.status,
        autoSubmitted: attempt.auto_submitted,
      });
    }

    const orderItems: QuestionOrderItem[] = Array.isArray(attempt.question_order_json)
      ? attempt.question_order_json
      : [];
    const qIds = orderItems.map((i) => Number(i.questionId));

    const qRes =
      qIds.length > 0
        ? await query<{
            id: number;
            question_type: string;
            question_text_en: string;
            question_text_ml: string | null;
            question_text_ar: string | null;
            image_url: string | null;
            options_json: Array<{
              id: string;
              text_en: string;
              text_ml?: string;
              text_ar?: string;
            }>;
            marks: string;
          }>(
            `SELECT id, question_type, question_text_en, question_text_ml, question_text_ar,
                    image_url, options_json, marks
             FROM questions WHERE id = ANY($1::int[])`,
            [qIds]
          )
        : { rows: [] };

    const qMap = new Map(qRes.rows.map((q) => [q.id, q]));

    // Never return correct_option_id to the client during an active exam
    const sanitizedQuestions = orderItems
      .map((item, idx) => {
        const q = qMap.get(Number(item.questionId));
        if (!q) return null;
        const optMap = new Map((q.options_json || []).map((o) => [o.id, o]));
        const orderedOptions = (item.optionOrder || [])
          .map((oid) => optMap.get(oid))
          .filter(Boolean);
        return {
          index: idx + 1,
          id: q.id,
          questionType: q.question_type,
          textEn: q.question_text_en,
          textMl: q.question_text_ml,
          textAr: q.question_text_ar,
          imageUrl: q.image_url,
          marks: Number(q.marks),
          options: orderedOptions.length > 0 ? orderedOptions : q.options_json,
        };
      })
      .filter(Boolean);

    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(attempt.server_deadline_at).getTime() - Date.now()) / 1000)
    );

    const sRes = await query<{ registration_number: string; full_name: string }>(
      "SELECT registration_number, full_name FROM students WHERE id = $1",
      [session.studentId]
    );

    return NextResponse.json({
      completed: false,
      attemptId: attempt.id,
      examTitle: config.title,
      examSubtitle: config.subtitle,
      student: sRes.rows[0],
      serverNowIso: new Date().toISOString(),
      serverDeadlineAt: attempt.server_deadline_at,
      remainingSeconds,
      questions: sanitizedQuestions,
      answers: attempt.answers_json || {},
      markedForReview: attempt.marked_for_review_json || [],
      lastSavedAt: attempt.last_saved_at,
    });
  } catch (err) {
    console.error("Exam session GET error:", err);
    return NextResponse.json({ error: "Failed to load exam session." }, { status: 500 });
  }
}
