import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getActiveConfig } from "@/lib/exam-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getActiveConfig();
    const [catRes, distCountRes, batchRes] = await Promise.all([
      query<{
        id: number;
        code: string;
        name_en: string;
        name_ml: string;
        name_ar: string;
        age_group: string | null;
      }>(
        "SELECT id, code, name_en, name_ml, name_ar, age_group FROM categories WHERE is_active = TRUE ORDER BY id ASC"
      ),
      query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM districts WHERE is_active = TRUE"
      ),
      query<{
        id: number;
        batch_code: string;
        title: string;
        zone: string;
        start_time: string;
        end_time: string;
        max_capacity: number;
        status: string;
      }>(
        "SELECT id, batch_code, title, zone, start_time, end_time, max_capacity, status FROM exam_batches ORDER BY start_time ASC"
      ),
    ]);

    return NextResponse.json({
      config,
      categories: catRes.rows,
      activeDistrictsCount: Number(distCountRes.rows[0]?.count ?? 14),
      batches: batchRes.rows,
    });
  } catch (err) {
    console.error("Landing API error:", err);
    return NextResponse.json(
      { error: "Unable to load examination configuration." },
      { status: 500 }
    );
  }
}
