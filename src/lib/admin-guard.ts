import { NextResponse } from "next/server";
import { getSession, isAdminRole, type SessionUser } from "./auth";

export async function requireAdmin(): Promise<
  { session: SessionUser; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession("ADMIN");
  if (!session || !isAdminRole(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Administrator authorisation required." },
        { status: 403 }
      ),
    };
  }
  return { session };
}
