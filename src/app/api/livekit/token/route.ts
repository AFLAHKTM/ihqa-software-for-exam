import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { createAssessmentRoomToken } from "@/lib/livekit";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const assessmentId = Number(body.assessmentId);
    const requestedRole =
      body.role === "JUDGE" ? "JUDGE" : body.role === "STUDENT" ? "STUDENT" : undefined;
    const session = await getSession(requestedRole);
    if (!session || !["STUDENT", "JUDGE"].includes(session.role)) {
      return NextResponse.json({ error: "Authorisation required." }, { status: 401 });
    }
    if (!assessmentId) {
      return NextResponse.json({ error: "assessmentId is required." }, { status: 400 });
    }

    const res = await query<{
      id: number;
      student_id: number;
      judge_id: number;
      room_name: string;
      status: string;
      recording_disabled: boolean;
      student_reg: string;
      student_name: string;
      judge_code: string;
      judge_name: string;
    }>(
      `SELECT la.id, la.student_id, la.judge_id, la.room_name, la.status, la.recording_disabled,
              s.registration_number AS student_reg, s.full_name AS student_name,
              j.judge_code, j.full_name AS judge_name
       FROM live_assessments la
       JOIN students s ON s.id = la.student_id
       JOIN judges j ON j.id = la.judge_id
       WHERE la.id = $1`,
      [assessmentId]
    );

    const row = res.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Assessment session not found." }, { status: 404 });
    }

    if (session.role === "STUDENT") {
      if (row.student_id !== session.studentId) {
        return NextResponse.json(
          { error: "Unassigned students cannot enter this live assessment room." },
          { status: 403 }
        );
      }
      if (!["WAITING", "IN_CALL"].includes(row.status)) {
        return NextResponse.json(
          { error: "Please complete your technical check and enter the waiting room first." },
          { status: 403 }
        );
      }
    }

    if (session.role === "JUDGE") {
      if (row.judge_id !== session.judgeId) {
        return NextResponse.json(
          { error: "Judges may only enter rooms for their assigned students." },
          { status: 403 }
        );
      }
    }

    const tokenPayload = await createAssessmentRoomToken({
      roomName: row.room_name,
      identity:
        session.role === "STUDENT" ? row.student_reg : row.judge_code,
      name:
        session.role === "STUDENT" ? row.student_name : row.judge_name,
      role: session.role === "STUDENT" ? "STUDENT" : "JUDGE",
    });

    await recordAuditLog({
      actor: session,
      action: "LIVEKIT_TOKEN_ISSUED",
      entityType: "LIVE_ASSESSMENT",
      entityId: row.id,
      details: {
        roomName: row.room_name,
        recordingDisabled: true,
        mode: tokenPayload.mode,
      },
    });

    return NextResponse.json({
      ...tokenPayload,
      assessmentStatus: row.status,
    });
  } catch (err) {
    console.error("LiveKit token error:", err);
    return NextResponse.json({ error: "Could not issue room token." }, { status: 500 });
  }
}
