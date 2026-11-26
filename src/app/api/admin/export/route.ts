import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "students";
  const format = (searchParams.get("format") || "csv").toLowerCase();

  let rows: Record<string, unknown>[] = [];
  let sheetName = "IHQA_Report";

  if (type === "results") {
    sheetName = "Screening_Results";
    const res = await query(`
      SELECT s.registration_number AS "Registration Number",
             s.full_name AS "Student Name",
             d.name_en AS "District",
             c.name_en AS "Category",
             i.name AS "Institution",
             ea.status AS "Status",
             ea.obtained_marks AS "Obtained Marks",
             ea.total_marks AS "Total Marks",
             ea.correct_count AS "Correct",
             ea.wrong_count AS "Wrong",
             ea.unanswered_count AS "Unanswered",
             ea.submitted_at AS "Submitted At"
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN institutions i ON i.id = s.institution_id
      ORDER BY ea.obtained_marks DESC
    `);
    rows = res.rows;
  } else if (type === "merit") {
    sheetName = "Merit_List";
    const res = await query(`
      SELECT s.registration_number AS "Registration Number",
             s.full_name AS "Student Name",
             d.name_en AS "District",
             c.name_en AS "Category",
             COALESCE(ea.obtained_marks, 0) AS "Screening Marks",
             ea.status AS "Screening Status",
             la.total_score AS "Live Recitation Score (/100)",
             la.tajweed_score AS "Tajweed (/30)",
             la.makharij_score AS "Makharij (/25)",
             la.fluency_score AS "Fluency (/20)",
             la.accuracy_score AS "Accuracy (/15)",
             la.voice_score AS "Voice (/10)",
             la.status AS "Live Status"
      FROM students s
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN exam_attempts ea ON ea.student_id = s.id
      LEFT JOIN live_assessments la ON la.student_id = s.id
      ORDER BY COALESCE(la.total_score, 0) DESC, COALESCE(ea.obtained_marks, 0) DESC
    `);
    rows = res.rows;
  } else if (type === "districts") {
    sheetName = "District_Participation";
    const res = await query(`
      SELECT d.code AS "Code",
             d.name_en AS "District",
             d.zone AS "Zone",
             COUNT(DISTINCT s.id)::int AS "Registered Students",
             COUNT(DISTINCT CASE WHEN ea.status <> 'IN_PROGRESS' THEN ea.id END)::int AS "Completed Screening",
             COUNT(DISTINCT CASE WHEN ea.status = 'QUALIFIED' THEN ea.id END)::int AS "Qualified"
      FROM districts d
      LEFT JOIN students s ON s.district_id = d.id
      LEFT JOIN exam_attempts ea ON ea.student_id = s.id
      GROUP BY d.id, d.code, d.name_en, d.zone
      ORDER BY d.id ASC
    `);
    rows = res.rows;
  } else {
    sheetName = "Registered_Students";
    const res = await query(`
      SELECT s.registration_number AS "Registration Number",
             s.full_name AS "Full Name",
             d.name_en AS "District",
             c.name_en AS "Category",
             i.name AS "Institution",
             b.batch_code AS "Batch",
             s.eligibility_status AS "Eligibility",
             COALESCE(ea.status, 'NOT_STARTED') AS "Screening Status"
      FROM students s
      JOIN districts d ON d.id = s.district_id
      JOIN categories c ON c.id = s.category_id
      LEFT JOIN institutions i ON i.id = s.institution_id
      LEFT JOIN exam_batches b ON b.id = s.batch_id
      LEFT JOIN exam_attempts ea ON ea.student_id = s.id
      ORDER BY s.id ASC
    `);
    rows = res.rows;
  }

  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_EXPORTED_REPORT",
    entityType: "REPORT",
    entityId: `${type}.${format}`,
    details: { rowCount: rows.length },
  });

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Message: "No records" }]);

  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ihqa-${type}-${Date.now()}.xlsx"`,
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ihqa-${type}-${Date.now()}.csv"`,
    },
  });
}
