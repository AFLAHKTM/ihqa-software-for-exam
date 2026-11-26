import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SignalMessage {
  seq: number;
  from: "STUDENT" | "JUDGE";
  type: "join" | "offer" | "answer" | "ice" | "leave";
  payload?: unknown;
  ts: number;
}

interface RoomSignals {
  nextSeq: number;
  messages: SignalMessage[];
}

const globalForSignal = globalThis as unknown as {
  __ihqaSignals?: Map<string, RoomSignals>;
};

function getSignalStore(): Map<string, RoomSignals> {
  if (!globalForSignal.__ihqaSignals) {
    globalForSignal.__ihqaSignals = new Map();
  }
  return globalForSignal.__ihqaSignals;
}

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

  const store = getSignalStore();
  const room = store.get(auth.roomName);
  if (!room) {
    return NextResponse.json({ messages: [], lastSeq: since });
  }

  // Prune stale messages older than 2 minutes
  const cutoff = Date.now() - 120_000;
  room.messages = room.messages.filter((m) => m.ts >= cutoff);

  const incoming = room.messages.filter(
    (m) => m.seq > since && m.from !== auth.role
  );
  const lastSeq =
    incoming.length > 0 ? incoming[incoming.length - 1].seq : since;

  return NextResponse.json({ messages: incoming, lastSeq });
}

export async function POST(request: Request) {
  const body = await request.json();
  const assessmentId = Number(body.assessmentId);
  const type = body.type as SignalMessage["type"];
  const requestedRole =
    body.role === "JUDGE" ? "JUDGE" : body.role === "STUDENT" ? "STUDENT" : undefined;
  if (!assessmentId || !type) {
    return NextResponse.json({ error: "Invalid signal" }, { status: 400 });
  }

  const auth = await authorizeAssessment(assessmentId, requestedRole);
  if ("error" in auth && auth.error) return auth.error;

  const store = getSignalStore();
  let room = store.get(auth.roomName);
  if (!room) {
    room = { nextSeq: 1, messages: [] };
    store.set(auth.roomName, room);
  }

  // If peer starts a fresh join/offer, clear previous SDP offers so reconnects are clean
  if (type === "join" || type === "offer") {
    room.messages = room.messages.filter(
      (m) => !(m.from === auth.role && (m.type === "offer" || m.type === "answer" || m.type === "ice"))
    );
  }

  const seq = room.nextSeq++;
  room.messages.push({
    seq,
    from: auth.role,
    type,
    payload: body.payload,
    ts: Date.now(),
  });

  return NextResponse.json({ ok: true, seq });
}
