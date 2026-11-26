import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getDbMode, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const [
      totalsRes,
      districtParticipationRes,
      categoryParticipationRes,
      batchesRes,
      liveStatsRes,
    ] = await Promise.all([
      query<{
        total_students: number;
        eligible_students: number;
        started_count: number;
        completed_count: number;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM students) AS total_students,
          (SELECT COUNT(*)::int FROM students WHERE eligibility_status = 'ELIGIBLE') AS eligible_students,
          (SELECT COUNT(*)::int FROM exam_attempts) AS started_count,
          (SELECT COUNT(*)::int FROM exam_attempts WHERE status <> 'IN_PROGRESS') AS completed_count
      `),
      query<{
        id: number;
        code: string;
        name_en: string;
        zone: string;
        registered_count: number;
        completed_count: number;
      }>(`
        SELECT d.id, d.code, d.name_en, d.zone,
               COUNT(DISTINCT s.id)::int AS registered_count,
               COUNT(DISTINCT CASE WHEN ea.status <> 'IN_PROGRESS' THEN ea.id END)::int AS completed_count
        FROM districts d
        LEFT JOIN students s ON s.district_id = d.id
        LEFT JOIN exam_attempts ea ON ea.student_id = s.id
        GROUP BY d.id, d.code, d.name_en, d.zone
        ORDER BY registered_count DESC, d.id ASC
      `),
      query<{
        id: number;
        code: string;
        name_en: string;
        registered_count: number;
        completed_count: number;
        qualified_count: number;
      }>(`
        SELECT c.id, c.code, c.name_en,
               COUNT(DISTINCT s.id)::int AS registered_count,
               COUNT(DISTINCT CASE WHEN ea.status <> 'IN_PROGRESS' THEN ea.id END)::int AS completed_count,
               COUNT(DISTINCT CASE WHEN ea.status = 'QUALIFIED' THEN ea.id END)::int AS qualified_count
        FROM categories c
        LEFT JOIN students s ON s.category_id = c.id
        LEFT JOIN exam_attempts ea ON ea.student_id = s.id
        GROUP BY c.id, c.code, c.name_en
        ORDER BY c.id ASC
      `),
      query(`SELECT * FROM exam_batches ORDER BY start_time ASC`),
      query<{
        total_live: number;
        waiting_live: number;
        in_call_live: number;
        completed_live: number;
      }>(`
        SELECT
          COUNT(*)::int AS total_live,
          COUNT(*) FILTER (WHERE status = 'WAITING')::int AS waiting_live,
          COUNT(*) FILTER (WHERE status = 'IN_CALL')::int AS in_call_live,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_live
        FROM live_assessments
      `),
    ]);

    const t = totalsRes.rows[0] || {
      total_students: 0,
      eligible_students: 0,
      started_count: 0,
      completed_count: 0,
    };
    const pendingCount = Math.max(0, Number(t.total_students) - Number(t.completed_count));

    return NextResponse.json({
      dbMode: getDbMode(),
      overview: {
        totalStudents: Number(t.total_students),
        eligibleStudents: Number(t.eligible_students),
        startedCount: Number(t.started_count),
        completedCount: Number(t.completed_count),
        pendingCount,
        liveStats: liveStatsRes.rows[0],
      },
      districtParticipation: districtParticipationRes.rows,
      categoryParticipation: categoryParticipationRes.rows,
      batches: batchesRes.rows,
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    return NextResponse.json({ error: "Failed to load admin overview." }, { status: 500 });
  }
}
