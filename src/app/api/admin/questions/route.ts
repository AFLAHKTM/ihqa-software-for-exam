import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { query } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const [qRes, catRes] = await Promise.all([
    query(`
      SELECT q.*, c.name_en AS category_name
      FROM questions q
      LEFT JOIN categories c ON c.id = q.category_id
      ORDER BY q.id DESC
    `),
    query(`SELECT id, code, name_en FROM categories ORDER BY id ASC`),
  ]);

  return NextResponse.json({
    questions: qRes.rows,
    categories: catRes.rows,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const res = await query(
      `INSERT INTO questions (
         category_id, question_set, question_type,
         question_text_en, question_text_ml, question_text_ar,
         image_url, options_json, correct_option_id, marks, negative_marks, is_active, is_sample_demo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, FALSE)
       RETURNING *`,
      [
        body.categoryId ? Number(body.categoryId) : null,
        String(body.questionSet || "SET-A"),
        body.imageUrl ? "IMAGE_MCQ" : "MCQ",
        String(body.questionTextEn || ""),
        body.questionTextMl ? String(body.questionTextMl) : null,
        body.questionTextAr ? String(body.questionTextAr) : null,
        body.imageUrl ? String(body.imageUrl) : null,
        JSON.stringify(body.options || []),
        String(body.correctOptionId || "A"),
        Number(body.marks ?? 2),
        Number(body.negativeMarks ?? 0),
        body.isActive !== false,
      ]
    );

    await recordAuditLog({
      actor: auth.session,
      action: "ADMIN_CREATED_QUESTION",
      entityType: "QUESTION",
      entityId: (res.rows[0] as { id: number }).id,
    });
    return NextResponse.json({ question: res.rows[0] });
  } catch (err) {
    console.error("Create question error:", err);
    return NextResponse.json({ error: "Invalid question payload." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await query("DELETE FROM questions WHERE id = $1", [id]);
  await recordAuditLog({
    actor: auth.session,
    action: "ADMIN_DELETED_QUESTION",
    entityType: "QUESTION",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}
