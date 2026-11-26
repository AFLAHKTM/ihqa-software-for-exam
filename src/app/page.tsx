import { query } from "@/lib/db";
import { getActiveConfig } from "@/lib/exam-engine";
import { LandingClient } from "@/components/LandingClient";

export const dynamic = "force-dynamic";

const FALLBACK_CONFIG = {
  title: "KERALA INITIAL SCREENING",
  subtitle: "India Holy Quran Award – Kerala State Examination",
  welcome_message:
    "Welcome to the official Kerala State Initial Screening Portal of the India Holy Quran Award. Qualifying candidates from this objective screening stage advance to the 1-to-1 Live Quran Recitation Assessment.",
  eligibility_info:
    "Open to registered participants from recognised Madrasas, Islamic Academies, and Schools across all 14 districts of Kerala, subject to institutional and committee verification.",
  exam_date_label: "Configurable Schedule · Active Kerala Batches",
  duration_minutes: 45,
  exam_status: "OPEN",
};

export default async function HomePage() {
  try {
    const config = await getActiveConfig();
    const [catRes, distRes, batchRes] = await Promise.all([
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

    return (
      <LandingClient
        config={config ?? FALLBACK_CONFIG}
        categories={catRes.rows}
        activeDistrictsCount={Number(distRes.rows[0]?.count ?? 14)}
        batches={batchRes.rows}
      />
    );
  } catch (err) {
    console.error("HomePage DB load fallback:", err);
    return (
      <LandingClient
        config={FALLBACK_CONFIG}
        categories={[]}
        activeDistrictsCount={14}
        batches={[]}
      />
    );
  }
}
