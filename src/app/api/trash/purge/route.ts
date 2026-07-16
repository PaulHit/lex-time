import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body?.all === true) {
    let purged = 0;
    db.transaction(() => {
      purged += db
        .prepare("DELETE FROM time_entries WHERE deleted_at IS NOT NULL")
        .run().changes;
      purged += db
        .prepare("DELETE FROM employees WHERE deleted_at IS NOT NULL")
        .run().changes;
      purged += db
        .prepare("DELETE FROM clients WHERE deleted_at IS NOT NULL")
        .run().changes;
    })();
    return NextResponse.json({ ok: true, purged });
  }

  const type: string = body?.type;
  const id = Number(body?.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (type === "entry") {
    const result = db
      .prepare("DELETE FROM time_entries WHERE id = ? AND deleted_at IS NOT NULL")
      .run(id);
    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  if (type === "employee" || type === "client") {
    const table = type === "employee" ? "employees" : "clients";
    const fk = type === "employee" ? "employee_id" : "client_id";

    const record = db
      .prepare(`SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`)
      .get(id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Live entries never reference a trashed record; guard anyway so a purge
    // can never orphan live data.
    const liveCount = (
      db
        .prepare(
          `SELECT COUNT(*) as c FROM time_entries WHERE ${fk} = ? AND deleted_at IS NULL`,
        )
        .get(id) as { c: number }
    ).c;
    if (liveCount > 0) {
      return NextResponse.json(
        { error: "Record still has live time entries" },
        { status: 409 },
      );
    }

    db.transaction(() => {
      db.prepare(
        `DELETE FROM time_entries WHERE ${fk} = ? AND deleted_at IS NOT NULL`,
      ).run(id);
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    })();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "type must be entry, employee, or client" },
    { status: 400 },
  );
}
