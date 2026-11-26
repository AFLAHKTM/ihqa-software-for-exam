import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession("JUDGE");
    if (!session || session.role !== "JUDGE" || !session.judgeId) {
      return NextResponse.json({ error: "Judge authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const assessmentId = Number(body.assessmentId);
    const action = String(body.action || "");

    const existingRes = await query<{
      id: number;
      judge_id: number;
      status: string;
      total_score: string | null;
    }>("SELECT id, judge_id, status, total_score FROM live_assessments WHERE id = $1", [
      assessmentId,
    ]);

    const existing = existingRes.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }
    if (existing.judge_id !== session.judgeId) {
      return NextResponse.json(
        { error: "Access denied: student is not assigned to your panel." },
        { status: 403 }
      );
    }

    if (action === "ADMIT") {
      await query(
        `UPDATE live_assessments SET status = 'IN_CALL', admitted_at = NOW() WHERE id = $1`,
        [assessmentId]
      );
      await recordAuditLog({
        actor: session,
        action: "JUDGE_ADMITTED_STUDENT",
        entityType: "LIVE_ASSESSMENT",
        entityId: assessmentId,
      });
      return NextResponse.json({ ok: true, status: "IN_CALL" });
    }

    if (action === "MARK_ABSENT" || action === "RESCHEDULE") {
      const nextStatus = action === "MARK_ABSENT" ? "ABSENT" : "RESCHEDULED";
      await query(
        `UPDATE live_assessments SET status = $2, remarks = COALESCE($3, remarks) WHERE id = $1`,
        [assessmentId, nextStatus, body.remarks ? String(body.remarks) : null]
      );
      await recordAuditLog({
        actor: session,
        action: `JUDGE_${action}`,
        entityType: "LIVE_ASSESSMENT",
        entityId: assessmentId,
        details: { remarks: body.remarks || null },
      });
      return NextResponse.json({ ok: true, status: nextStatus });
    }

    if (action === "SUBMIT_SCORE") {
      const tajweed = Number(body.tajweed);
      const makharij = Number(body.makharij);
      const fluency = Number(body.fluency);
      const accuracy = Number(body.accuracy);
      const voice = Number(body.voice);
      const remarks = String(body.remarks || "").trim();

      if (
        Number.isNaN(tajweed) || tajweed < 0 || tajweed > 30 ||
        Number.isNaN(makharij) || makharij < 0 || makharij > 25 ||
        Number.isNaN(fluency) || fluency < 0 || fluency > 20 ||
        Number.isNaN(accuracy) || accuracy < 0 || accuracy > 15 ||
        Number.isNaN(voice) || voice < 0 || voice > 10
      ) {
        return NextResponse.json(
          { error: "Scores exceed rubric bounds (30 / 25 / 20 / 15 / 10)." },
          { status: 400 }
        );
      }

      const total = Number((tajweed + makharij + fluency + accuracy + voice).toFixed(2));
      await query(
        `UPDATE live_assessments
         SET status = 'COMPLETED',
             completed_at = COALESCE(completed_at, NOW()),
             tajweed_score = $2,
             makharij_score = $3,
             fluency_score = $4,
             accuracy_score = $5,
             voice_score = $6,
             total_score = $7,
             remarks = $8
         WHERE id = $1`,
        [assessmentId, tajweed, makharij, fluency, accuracy, voice, total, remarks]
      );

      await recordAuditLog({
        actor: session,
        action: existing.total_score ? "JUDGE_SCORE_UPDATED" : "JUDGE_SCORE_SUBMITTED",
        entityType: "LIVE_ASSESSMENT",
        entityId: assessmentId,
        details: {
          previousTotal: existing.total_score,
          newTotal: total,
          rubric: { tajweed, makharij, fluency, accuracy, voice },
        },
      });

      return NextResponse.json({ ok: true, status: "COMPLETED", totalScore: total });
    }

    return NextResponse.json({ error: "Unsupported judge action." }, { status: 400 });
  } catch (err) {
    console.error("Judge evaluate error:", err);
    return NextResponse.json({ error: "Failed to save evaluation." }, { status: 500 });
  }
}
