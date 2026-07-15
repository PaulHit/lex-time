import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const employee = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(id) as { id: number } | undefined;
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const count = (
    db
      .prepare("SELECT COUNT(*) as c FROM time_entries WHERE employee_id = ?")
      .get(id) as { c: number }
  ).c;
  if (count > 0) {
    return NextResponse.json(
      {
        error: `This employee still has ${count} time ${
          count === 1 ? "entry" : "entries"
        }. Delete those first.`,
      },
      { status: 409 },
    );
  }

  db.prepare("DELETE FROM employees WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
