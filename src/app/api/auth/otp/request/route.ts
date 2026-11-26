import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier || "").trim();
    const purpose =
      String(body.purpose || "LOGIN").toUpperCase() === "RESET_PASSWORD"
        ? "RESET_PASSWORD"
        : "LOGIN";

    if (!identifier) {
      return NextResponse.json(
        { error: "Registration Number or registered email is required." },
        { status: 400 }
      );
    }

    const userRes = await query<{
      id: number;
      username: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      role: string;
      is_active: boolean;
    }>(
      `SELECT id, username, full_name, phone, email, role, is_active
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    const user = userRes.rows[0];
    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: "No active account found for that Registration Number." },
        { status: 404 }
      );
    }

    const otpCode = String(crypto.randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(otpCode, 8);
    const isProdGateway = Boolean(process.env.SMS_GATEWAY_URL);

    await query(
      `UPDATE otp_tokens SET consumed_at = NOW()
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [user.id, purpose]
    );

    await query(
      `INSERT INTO otp_tokens (user_id, purpose, otp_hash, demo_code_hint, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
      [user.id, purpose, otpHash, isProdGateway ? null : otpCode]
    );

    await recordAuditLog({
      action: "OTP_REQUESTED",
      entityType: "USER",
      entityId: user.id,
      details: { purpose, username: user.username },
    });

    const maskedTarget = user.phone
      ? user.phone.replace(/.(?=.{4})/g, "*")
      : user.email || "registered contact";

    return NextResponse.json({
      ok: true,
      maskedTarget,
      expiresInMinutes: 10,
      // Provided only when no external SMS gateway is configured so local testing works seamlessly
      demoOtp: isProdGateway ? undefined : otpCode,
    });
  } catch (err) {
    console.error("OTP request error:", err);
    return NextResponse.json({ error: "Could not issue OTP." }, { status: 500 });
  }
}
