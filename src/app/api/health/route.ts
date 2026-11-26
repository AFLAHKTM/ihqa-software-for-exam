import { NextResponse } from "next/server";
import { getDbMode, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM districts"
    );
    return NextResponse.json({
      ok: true,
      dbMode: getDbMode(),
      districts: Number(res.rows[0]?.count ?? 0),
    });
  } catch (err) {
    console.error("Health check error:", err);
    return NextResponse.json(
      {
        ok: false,
        dbMode: getDbMode(),
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
