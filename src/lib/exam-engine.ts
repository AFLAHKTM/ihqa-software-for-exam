import { query, withTransaction } from "./db";

export interface QuestionOrderItem {
  questionId: number;
  optionOrder: string[];
}

export interface AttemptRecord {
  id: number;
  student_id: number;
  exam_config_id: number;
  question_set: string;
  status: string;
  started_at: string;
  server_deadline_at: string;
  submitted_at: string | null;
  auto_submitted: boolean;
  instructions_acknowledged_at: string | null;
  question_order_json: QuestionOrderItem[];
  answers_json: Record<string, string>;
  marked_for_review_json: number[];
  total_marks: string | number;
  obtained_marks: string | number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  last_saved_at: string;
}

export async function evaluateAndFinalizeAttempt(
  attemptId: number,
  autoSubmitted = false
): Promise<AttemptRecord | null> {
  return withTransaction(async (tx) => {
    const attemptRes = await tx.query<AttemptRecord>(
      `SELECT * FROM exam_attempts WHERE id = $1 FOR UPDATE`,
      [attemptId]
    );
    const attempt = attemptRes.rows[0];
    if (!attempt) return null;
    if (attempt.status !== "IN_PROGRESS") {
      return attempt;
    }

    const cfgRes = await tx.query<{
      negative_marking_enabled: boolean;
      negative_marks_per_wrong: string | number;
      passing_percentage: string | number;
      results_published: boolean;
    }>(
      `SELECT negative_marking_enabled, negative_marks_per_wrong, passing_percentage, results_published
       FROM exam_configs WHERE id = $1`,
      [attempt.exam_config_id]
    );
    const cfg = cfgRes.rows[0];

    const orderItems = Array.isArray(attempt.question_order_json)
      ? attempt.question_order_json
      : [];
    const questionIds = orderItems.map((q) => Number(q.questionId));

    const qRes =
      questionIds.length > 0
        ? await tx.query<{
            id: number;
            correct_option_id: string;
            marks: string | number;
            negative_marks: string | number;
          }>(
            `SELECT id, correct_option_id, marks, negative_marks
             FROM questions WHERE id = ANY($1::int[])`,
            [questionIds]
          )
        : { rows: [] };

    const qMap = new Map(qRes.rows.map((q) => [q.id, q]));
    const answers = attempt.answers_json || {};

    let totalMarks = 0;
    let obtainedMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const qId of questionIds) {
      const q = qMap.get(qId);
      if (!q) continue;
      const qMarks = Number(q.marks || 0);
      totalMarks += qMarks;
      const selected = answers[String(qId)];
      if (!selected) {
        unansweredCount += 1;
      } else if (selected === q.correct_option_id) {
        correctCount += 1;
        obtainedMarks += qMarks;
      } else {
        wrongCount += 1;
        if (cfg?.negative_marking_enabled) {
          const penalty =
            Number(q.negative_marks) > 0
              ? Number(q.negative_marks)
              : Number(cfg.negative_marks_per_wrong || 0);
          obtainedMarks -= penalty;
        }
      }
    }

    if (obtainedMarks < 0) obtainedMarks = 0;
    const pct = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const passingPct = Number(cfg?.passing_percentage ?? 50);

    let nextStatus = "SUBMITTED";
    if (cfg?.results_published) {
      nextStatus = pct >= passingPct ? "QUALIFIED" : "NOT_QUALIFIED";
    }

    const updated = await tx.query<AttemptRecord>(
      `UPDATE exam_attempts
       SET status = $2,
           submitted_at = NOW(),
           auto_submitted = $3,
           total_marks = $4,
           obtained_marks = $5,
           correct_count = $6,
           wrong_count = $7,
           unanswered_count = $8,
           last_saved_at = NOW()
       WHERE id = $1 AND status = 'IN_PROGRESS'
       RETURNING *`,
      [
        attemptId,
        nextStatus,
        autoSubmitted,
        totalMarks.toFixed(2),
        obtainedMarks.toFixed(2),
        correctCount,
        wrongCount,
        unansweredCount,
      ]
    );
    return updated.rows[0] ?? attempt;
  });
}

export async function syncAttemptDeadline(
  attempt: AttemptRecord
): Promise<AttemptRecord> {
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const deadline = new Date(attempt.server_deadline_at).getTime();
  if (Date.now() >= deadline) {
    const finalized = await evaluateAndFinalizeAttempt(attempt.id, true);
    return finalized ?? attempt;
  }
  return attempt;
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getActiveConfig() {
  const res = await query<{
    id: number;
    slug: string;
    title: string;
    subtitle: string;
    welcome_message: string;
    eligibility_info: string;
    exam_date_label: string;
    duration_minutes: number;
    exam_status: string;
    questions_per_exam: number;
    negative_marking_enabled: boolean;
    negative_marks_per_wrong: string | number;
    randomize_questions: boolean;
    randomize_options: boolean;
    passing_percentage: string | number;
    results_published: boolean;
    show_answers_to_students: boolean;
    show_merit_rank: boolean;
  }>(`SELECT * FROM exam_configs WHERE slug = 'kerala-initial-screening' LIMIT 1`);
  return res.rows[0] ?? null;
}
