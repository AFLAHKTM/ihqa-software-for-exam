import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    const subject = String(body.subject || "Technical Support Request").slice(0, 160);
    const message = String(body.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO support_tickets (user_id, role, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [session?.userId ?? null, session?.role ?? "GUEST", subject, message]
    );
    return NextResponse.json({ ok: true, ticket: res.rows[0] });
  } catch (err) {
    console.error("Support ticket error:", err);
    return NextResponse.json({ error: "Could not submit ticket." }, { status: 500 });
  }
}
