import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { setSessionCookie, type UserRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");
    const portal = String(body.portal || "STUDENT").toUpperCase();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Please enter your ID/Email and password." },
        { status: 400 }
      );
    }

    const userRes = await query<{
      id: number;
      username: string;
      email: string | null;
      full_name: string;
      role: UserRole;
      password_hash: string;
      is_active: boolean;
    }>(
      `SELECT id, username, email, full_name, role, password_hash, is_active
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    const user = userRes.rows[0];
    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: "Invalid credentials or inactive account." },
        { status: 401 }
      );
    }

    if (portal === "STUDENT" && user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Please use your Student Registration Number on the student portal." },
        { status: 403 }
      );
    }
    if (portal === "JUDGE" && user.role !== "JUDGE") {
      return NextResponse.json(
        { error: "This portal is restricted to authorised Judges." },
        { status: 403 }
      );
    }
    if (
      portal === "ADMIN" &&
      !["SUPER_ADMIN", "EXAM_CONTROLLER", "EVALUATOR", "DISTRICT_COORDINATOR"].includes(user.role)
    ) {
      return NextResponse.json(
        { error: "Administrator authorisation is required." },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await recordAuditLog({
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: user.id,
        details: { username: user.username, portal },
      });
      return NextResponse.json(
        { error: "Incorrect password. Please try again or use Forgot Password." },
        { status: 401 }
      );
    }

    let studentId: number | null = null;
    let judgeId: number | null = null;

    if (user.role === "STUDENT") {
      const sRes = await query<{ id: number }>(
        "SELECT id FROM students WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      studentId = sRes.rows[0]?.id ?? null;
    } else if (user.role === "JUDGE") {
      const jRes = await query<{ id: number }>(
        "SELECT id FROM judges WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      judgeId = jRes.rows[0]?.id ?? null;
    }

    await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

    const sessionUser = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      studentId,
      judgeId,
    };

    await setSessionCookie(sessionUser);
    await recordAuditLog({
      actor: sessionUser,
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      details: { portal },
    });

    return NextResponse.json({ user: sessionUser });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Authentication service error." },
      { status: 500 }
    );
  }
}
