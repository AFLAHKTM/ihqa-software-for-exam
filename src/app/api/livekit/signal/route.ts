import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function authorizeAssessment(
  assessmentId: number,
  requestedRole?: "STUDENT" | "JUDGE"
) {
  const session = await getSession(requestedRole);
  if (!session || !["STUDENT", "JUDGE"].includes(session.role)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const res = await query<{
    id: number;
    student_id: number;
    judge_id: number;
    room_name: string;
  }>(
    "SELECT id, student_id, judge_id, room_name FROM live_assessments WHERE id = $1",
    [assessmentId]
  );
  const row = res.rows[0];
  if (!row) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (session.role === "STUDENT" && row.student_id !== session.studentId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (session.role === "JUDGE" && row.judge_id !== session.judgeId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    session,
    role: session.role as "STUDENT" | "JUDGE",
    roomName: row.room_name,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assessmentId = Number(searchParams.get("assessmentId"));
  const since = Number(searchParams.get("since") || 0);
  const roleParam = searchParams.get("role");
  const requestedRole =
    roleParam === "JUDGE" ? "JUDGE" : roleParam === "STUDENT" ? "STUDENT" : undefined;
  if (!assessmentId) {
    return NextResponse.json({ error: "assessmentId required" }, { status: 400 });
  }

  const auth = await authorizeAssessment(assessmentId, requestedRole);
  if ("error" in auth && auth.error) return auth.error;

  await query(
    `DELETE FROM webrtc_signals WHERE created_at < NOW() - INTERVAL '3 minutes'`
  );

  const res = await query<{
    id: number;
    sender_role: "STUDENT" | "JUDGE";
    signal_type: string;
    payload_json: unknown;
  }>(
    `SELECT id, sender_role, signal_type, payload_json
     FROM webrtc_signals
     WHERE room_name = $1 AND id > $2 AND sender_role <> $3
     ORDER BY id ASC`,
    [auth.roomName, since, auth.role]
  );

  const messages = res.rows.map((r) => ({
    seq: r.id,
    from: r.sender_role,
    type: r.signal_type,
    payload: r.payload_json,
  }));
  const lastSeq =
    messages.length > 0 ? messages[messages.length - 1].seq : since;

  return NextResponse.json({ messages, lastSeq });
}

export async function POST(request: Request) {
  const body = await request.json();
  const assessmentId = Number(body.assessmentId);
  const type = String(body.type || "");
  const requestedRole =
    body.role === "JUDGE" ? "JUDGE" : body.role === "STUDENT" ? "STUDENT" : undefined;
  if (!assessmentId || !type) {
    return NextResponse.json({ error: "Invalid signal" }, { status: 400 });
  }

  const auth = await authorizeAssessment(assessmentId, requestedRole);
  if ("error" in auth && auth.error) return auth.error;

  if (type === "ready" || type === "offer") {
    await query(
      `DELETE FROM webrtc_signals
       WHERE room_name = $1 AND sender_role = $2 AND signal_type IN ('ready', 'offer', 'answer', 'ice')`,
      [auth.roomName, auth.role]
    );
  }

  const ins = await query<{ id: number }>(
    `INSERT INTO webrtc_signals (room_name, sender_role, signal_type, payload_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [
      auth.roomName,
      auth.role,
      type,
      body.payload !== undefined ? JSON.stringify(body.payload) : null,
    ]
  );

  return NextResponse.json({ ok: true, seq: ins.rows[0]?.id });
}
