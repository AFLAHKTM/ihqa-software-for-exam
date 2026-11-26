import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession("JUDGE");
    if (!session || session.role !== "JUDGE" || !session.judgeId) {
      return NextResponse.json({ error: "Judge authentication required." }, { status: 401 });
    }

    const judgeRes = await query(
      `SELECT j.id, j.judge_code, j.full_name, j.specialization, d.name_en AS district_name
       FROM judges j
       LEFT JOIN districts d ON d.id = j.district_id
       WHERE j.id = $1`,
      [session.judgeId]
    );

    // Enforce strict isolation: judges ONLY see their own assigned students
    const queueRes = await query(
      `SELECT la.id, la.room_name, la.scheduled_start, la.scheduled_end, la.status,
              la.recording_disabled, la.student_tech_checked_at, la.admitted_at, la.completed_at,
              la.tajweed_score, la.makharij_score, la.fluency_score, la.accuracy_score,
              la.voice_score, la.total_score, la.remarks, la.result_published,
              s.id AS student_id, s.registration_number, s.full_name AS student_name,
              d.name_en AS district_name, c.name_en AS category_name,
              i.name AS institution_name
       FROM live_assessments la
       JOIN students s ON s.id = la.student_id
       JOIN districts d ON d.id = s.district_id
       JOIN categories c ON c.id = s.category_id
       LEFT JOIN institutions i ON i.id = s.institution_id
       WHERE la.judge_id = $1
       ORDER BY la.scheduled_start ASC`,
      [session.judgeId]
    );

    return NextResponse.json({
      judge: judgeRes.rows[0],
      assessments: queueRes.rows,
    });
  } catch (err) {
    console.error("Judge queue error:", err);
    return NextResponse.json({ error: "Failed to load judge queue." }, { status: 500 });
  }
}
