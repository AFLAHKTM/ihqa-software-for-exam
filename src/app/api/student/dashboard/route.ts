import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getActiveConfig, syncAttemptDeadline, type AttemptRecord } from "@/lib/exam-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Student authentication required." }, { status: 401 });
    }

    const studentRes = await query<{
      id: number;
      registration_number: string;
      full_name: string;
      eligibility_status: string;
      guardian_name: string | null;
      guardian_consent_at: string | null;
      preferred_language: string;
      institution_name: string | null;
      institution_place: string | null;
      district_name_en: string;
      district_name_ml: string;
      district_name_ar: string;
      category_id: number;
      category_code: string;
      category_name_en: string;
      category_name_ml: string;
      category_name_ar: string;
      batch_code: string | null;
      batch_title: string | null;
      batch_start: string | null;
      batch_end: string | null;
      batch_status: string | null;
    }>(
      `SELECT s.id, s.registration_number, s.full_name, s.eligibility_status,
              s.guardian_name, s.guardian_consent_at, s.preferred_language,
              i.name AS institution_name, i.place AS institution_place,
              d.name_en AS district_name_en, d.name_ml AS district_name_ml, d.name_ar AS district_name_ar,
              c.id AS category_id, c.code AS category_code, c.name_en AS category_name_en,
              c.name_ml AS category_name_ml, c.name_ar AS category_name_ar,
              b.batch_code, b.title AS batch_title, b.start_time AS batch_start,
              b.end_time AS batch_end, b.status AS batch_status
       FROM students s
       LEFT JOIN institutions i ON i.id = s.institution_id
       JOIN districts d ON d.id = s.district_id
       JOIN categories c ON c.id = s.category_id
       LEFT JOIN exam_batches b ON b.id = s.batch_id
       WHERE s.id = $1`,
      [session.studentId]
    );

    const student = studentRes.rows[0];
    if (!student) {
      return NextResponse.json({ error: "Student record not found." }, { status: 404 });
    }

    const config = await getActiveConfig();
    let attempt: AttemptRecord | null = null;
    if (config) {
      const aRes = await query<AttemptRecord>(
        `SELECT * FROM exam_attempts WHERE student_id = $1 AND exam_config_id = $2 LIMIT 1`,
        [student.id, config.id]
      );
      if (aRes.rows[0]) {
        attempt = await syncAttemptDeadline(aRes.rows[0]);
      }
    }

    // Check Stage 2 Live Quran Recitation Assessment assignment
    const liveRes = await query<{
      id: number;
      room_name: string;
      scheduled_start: string;
      scheduled_end: string;
      status: string;
      recording_disabled: boolean;
      student_tech_checked_at: string | null;
      admitted_at: string | null;
      completed_at: string | null;
      total_score: string | null;
      tajweed_score: string | null;
      makharij_score: string | null;
      fluency_score: string | null;
      accuracy_score: string | null;
      voice_score: string | null;
      remarks: string | null;
      result_published: boolean;
      judge_name: string;
      judge_code: string;
      judge_specialization: string | null;
    }>(
      `SELECT la.id, la.room_name, la.scheduled_start, la.scheduled_end, la.status,
              la.recording_disabled, la.student_tech_checked_at, la.admitted_at, la.completed_at,
              la.total_score, la.tajweed_score, la.makharij_score, la.fluency_score,
              la.accuracy_score, la.voice_score, la.remarks, la.result_published,
              j.full_name AS judge_name, j.judge_code, j.specialization AS judge_specialization
       FROM live_assessments la
       JOIN judges j ON j.id = la.judge_id
       WHERE la.student_id = $1
       ORDER BY la.scheduled_start DESC
       LIMIT 1`,
      [student.id]
    );

    const liveRaw = liveRes.rows[0] || null;
    const liveAssessment = liveRaw
      ? {
          id: liveRaw.id,
          room_name: liveRaw.room_name,
          scheduled_start: liveRaw.scheduled_start,
          scheduled_end: liveRaw.scheduled_end,
          status: liveRaw.status,
          recording_disabled: liveRaw.recording_disabled,
          student_tech_checked_at: liveRaw.student_tech_checked_at,
          admitted_at: liveRaw.admitted_at,
          completed_at: liveRaw.completed_at,
          judge_name: liveRaw.judge_name,
          judge_code: liveRaw.judge_code,
          judge_specialization: liveRaw.judge_specialization,
          result_published: liveRaw.result_published,
          scorecard: liveRaw.result_published
            ? {
                tajweed: Number(liveRaw.tajweed_score ?? 0),
                makharij: Number(liveRaw.makharij_score ?? 0),
                fluency: Number(liveRaw.fluency_score ?? 0),
                accuracy: Number(liveRaw.accuracy_score ?? 0),
                voice: Number(liveRaw.voice_score ?? 0),
                total: Number(liveRaw.total_score ?? 0),
                remarks: liveRaw.remarks,
              }
            : null,
        }
      : null;

    // Determine whether START EXAMINATION is allowed
    const nowMs = Date.now();
    const batchOpen =
      !student.batch_start ||
      (student.batch_status === "ACTIVE" &&
        nowMs >= new Date(student.batch_start).getTime() &&
        (!student.batch_end || nowMs <= new Date(student.batch_end).getTime()));

    const canStartExam =
      Boolean(config) &&
      config!.exam_status === "OPEN" &&
      student.eligibility_status === "ELIGIBLE" &&
      batchOpen &&
      (!attempt || attempt.status === "IN_PROGRESS");

    // Sanitize attempt result visibility according to admin configuration
    let publicAttempt = null;
    if (attempt) {
      const resultsPublished = Boolean(config?.results_published);
      const visibleStatus =
        attempt.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : resultsPublished
          ? attempt.status
          : "EVALUATION_PENDING";

      let meritRank: number | null = null;
      if (resultsPublished && config?.show_merit_rank && attempt.status !== "IN_PROGRESS") {
        const rankRes = await query<{ rank: number }>(
          `SELECT COUNT(*)::int + 1 AS rank
           FROM exam_attempts ea
           JOIN students st ON st.id = ea.student_id
           WHERE ea.exam_config_id = $1
             AND st.category_id = $2
             AND ea.status IN ('QUALIFIED', 'NOT_QUALIFIED', 'SUBMITTED')
             AND ea.obtained_marks > $3`,
          [config!.id, student.category_id, attempt.obtained_marks]
        );
        meritRank = Number(rankRes.rows[0]?.rank ?? 1);
      }

      publicAttempt = {
        id: attempt.id,
        status: visibleStatus,
        rawSubmitted: attempt.status !== "IN_PROGRESS",
        startedAt: attempt.started_at,
        serverDeadlineAt: attempt.server_deadline_at,
        submittedAt: attempt.submitted_at,
        autoSubmitted: attempt.auto_submitted,
        resultsPublished,
        totalMarks: resultsPublished ? Number(attempt.total_marks) : null,
        obtainedMarks: resultsPublished ? Number(attempt.obtained_marks) : null,
        correctCount: resultsPublished ? attempt.correct_count : null,
        wrongCount: resultsPublished ? attempt.wrong_count : null,
        unansweredCount: resultsPublished ? attempt.unanswered_count : null,
        meritRank,
      };
    }

    return NextResponse.json({
      student,
      config,
      attempt: publicAttempt,
      canStartExam,
      batchOpen,
      liveAssessment,
    });
  } catch (err) {
    console.error("Student dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard." }, { status: 500 });
  }
}
