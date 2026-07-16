import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cascade = new URL(req.url).searchParams.get("cascade") === "1";

  const employee = db
    .prepare("SELECT id, name FROM employees WHERE id = ? AND deleted_at IS NULL")
    .get(id) as { id: number; name: string } | undefined;
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entryCount = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM time_entries WHERE employee_id = ? AND deleted_at IS NULL",
      )
      .get(id) as { c: number }
  ).c;

  // A delete that would sweep entries along needs explicit confirmation
  // from the caller; the count lets the UI phrase the warning.
  if (entryCount > 0 && !cascade) {
    return NextResponse.json(
      {
        requiresConfirmation: true,
        entryCount,
        error: `${employee.name} has ${entryCount} time ${
          entryCount === 1 ? "entry" : "entries"
        }.`,
      },
      { status: 409 },
    );
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE time_entries SET deleted_at = datetime('now') WHERE employee_id = ? AND deleted_at IS NULL",
    ).run(id);
    db.prepare(
      "UPDATE employees SET deleted_at = datetime('now') WHERE id = ?",
    ).run(id);
  })();

  return NextResponse.json({ ok: true, trashedEntries: entryCount });
}
