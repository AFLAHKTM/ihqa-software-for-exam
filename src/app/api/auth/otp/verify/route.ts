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
    const otp = String(body.otp || "").trim();
    const purpose =
      String(body.purpose || "LOGIN").toUpperCase() === "RESET_PASSWORD"
        ? "RESET_PASSWORD"
        : "LOGIN";
    const newPassword = body.newPassword ? String(body.newPassword) : null;

    if (!identifier || !otp) {
      return NextResponse.json(
        { error: "Registration Number and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    const userRes = await query<{
      id: number;
      username: string;
      full_name: string;
      role: UserRole;
      is_active: boolean;
    }>(
      `SELECT id, username, full_name, role, is_active
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    const user = userRes.rows[0];
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const tokenRes = await query<{
      id: number;
      otp_hash: string;
      expires_at: string;
      attempts: number;
    }>(
      `SELECT id, otp_hash, expires_at, attempts
       FROM otp_tokens
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, purpose]
    );

    const tokenRow = tokenRes.rows[0];
    if (!tokenRow) {
      return NextResponse.json(
        { error: "No active OTP found. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (tokenRow.attempts >= 5) {
      return NextResponse.json(
        { error: "Maximum verification attempts exceeded. Request a new OTP." },
        { status: 429 }
      );
    }

    const match = await bcrypt.compare(otp, tokenRow.otp_hash);
    if (!match) {
      await query("UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1", [
        tokenRow.id,
      ]);
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 401 });
    }

    await query("UPDATE otp_tokens SET consumed_at = NOW() WHERE id = $1", [
      tokenRow.id,
    ]);

    if (purpose === "RESET_PASSWORD") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }
      const nextHash = await bcrypt.hash(newPassword, 10);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        nextHash,
        user.id,
      ]);
      await recordAuditLog({
        action: "PASSWORD_RESET",
        entityType: "USER",
        entityId: user.id,
        details: { username: user.username },
      });
      return NextResponse.json({
        ok: true,
        message: "Password updated successfully. You may now sign in.",
      });
    }

    let studentId: number | null = null;
    if (user.role === "STUDENT") {
      const sRes = await query<{ id: number }>(
        "SELECT id FROM students WHERE user_id = $1 LIMIT 1",
        [user.id]
      );
      studentId = sRes.rows[0]?.id ?? null;
    }

    const sessionUser = {
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      studentId,
      judgeId: null,
    };
    await setSessionCookie(sessionUser);
    await recordAuditLog({
      actor: sessionUser,
      action: "LOGIN_OTP_SUCCESS",
      entityType: "USER",
      entityId: user.id,
    });

    return NextResponse.json({ ok: true, user: sessionUser });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
