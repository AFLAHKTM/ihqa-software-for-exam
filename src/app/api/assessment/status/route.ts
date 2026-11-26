import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession("STUDENT");
    if (!session || session.role !== "STUDENT" || !session.studentId) {
      return NextResponse.json({ error: "Student authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const assessmentId = Number(body.assessmentId);
    const action = String(body.action || "");

    const res = await query<{ id: number; student_id: number; status: string }>(
      "SELECT id, student_id, status FROM live_assessments WHERE id = $1",
      [assessmentId]
    );
    const row = res.rows[0];
    if (!row || row.student_id !== session.studentId) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    if (action === "TECH_CHECK_PASS") {
      await query(
        `UPDATE live_assessments
         SET student_tech_checked_at = NOW(),
             status = CASE WHEN status = 'SCHEDULED' THEN 'WAITING' ELSE status END
         WHERE id = $1`,
        [row.id]
      );
      if (body.guardianConsent) {
        await query(
          `UPDATE students SET guardian_consent_at = NOW() WHERE id = $1 AND guardian_consent_at IS NULL`,
          [session.studentId]
        );
      }
      await recordAuditLog({
        actor: session,
        action: "STUDENT_ENTERED_WAITING_ROOM",
        entityType: "LIVE_ASSESSMENT",
        entityId: row.id,
      });
    } else if (action === "LEAVE_CALL") {
      // Student leaves without completing judge scoring
      await recordAuditLog({
        actor: session,
        action: "STUDENT_LEFT_LIVE_ROOM",
        entityType: "LIVE_ASSESSMENT",
        entityId: row.id,
      });
    }

    const updated = await query(
      "SELECT id, status, student_tech_checked_at, admitted_at, completed_at FROM live_assessments WHERE id = $1",
      [row.id]
    );
    return NextResponse.json({ assessment: updated.rows[0] });
  } catch (err) {
    console.error("Assessment status error:", err);
    return NextResponse.json({ error: "Could not update assessment status." }, { status: 500 });
  }
}
