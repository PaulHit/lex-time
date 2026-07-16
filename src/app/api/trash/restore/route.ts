import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

const RECORD_TABLES = { employee: "employees", client: "clients" } as const;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type: string = body?.type;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (type === "entry") {
    const entry = db
      .prepare(
        "SELECT * FROM time_entries WHERE id = ? AND deleted_at IS NOT NULL",
      )
      .get(id) as
      | { id: number; employee_id: number; client_id: number }
      | undefined;
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // A live entry must reference live records, so restoring an entry
    // also restores its employee and client if they sit in the trash.
    db.transaction(() => {
      db.prepare("UPDATE employees SET deleted_at = NULL WHERE id = ?").run(
        entry.employee_id,
      );
      db.prepare("UPDATE clients SET deleted_at = NULL WHERE id = ?").run(
        entry.client_id,
      );
      db.prepare("UPDATE time_entries SET deleted_at = NULL WHERE id = ?").run(
        id,
      );
    })();
    return NextResponse.json({ ok: true });
  }

  if (type === "employee" || type === "client") {
    const result = db
      .prepare(
        `UPDATE ${RECORD_TABLES[type]} SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
      )
      .run(id);
    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "type must be entry, employee, or client" },
    { status: 400 },
  );
}
