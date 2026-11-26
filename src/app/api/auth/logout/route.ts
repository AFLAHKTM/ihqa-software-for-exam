import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, type SessionScope } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scope = body.scope as SessionScope | undefined;
  const session = await getSession(scope);
  if (session) {
    await recordAuditLog({
      actor: session,
      action: "LOGOUT",
      entityType: "USER",
      entityId: session.userId,
    });
  }
  await clearSessionCookie(scope);
  return NextResponse.json({ ok: true });
}
