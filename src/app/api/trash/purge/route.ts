import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { TrashItem } from "@/lib/types";

const TABLES = { employee: "employees", client: "clients" } as const;
const FOREIGN_KEYS = { employee: "employee_id", client: "client_id" } as const;

function parseItems(raw: unknown): TrashItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is TrashItem =>
      !!item &&
      ["entry", "employee", "client"].includes(item.type) &&
      Number.isInteger(item.id),
  );
}

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

  const items = parseItems(body?.items);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array of { type, id }" },
      { status: 400 },
    );
  }

  let purged = 0;
  db.transaction(() => {
    // Entries first: purging a record sweeps its trashed entries too, so
    // doing entries up front keeps the count honest either way.
    for (const item of items) {
      if (item.type !== "entry") continue;
      purged += db
        .prepare(
          "DELETE FROM time_entries WHERE id = ? AND deleted_at IS NOT NULL",
        )
        .run(item.id).changes;
    }

    for (const item of items) {
      if (item.type === "entry") continue;
      const table = TABLES[item.type];
      const fk = FOREIGN_KEYS[item.type];

      const record = db
        .prepare(`SELECT id FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`)
        .get(item.id);
      if (!record) continue;

      // Live entries never reference a trashed record; guard anyway so a
      // purge can never orphan live data.
      const liveCount = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM time_entries WHERE ${fk} = ? AND deleted_at IS NULL`,
          )
          .get(item.id) as { c: number }
      ).c;
      if (liveCount > 0) continue;

      purged += db
        .prepare(
          `DELETE FROM time_entries WHERE ${fk} = ? AND deleted_at IS NOT NULL`,
        )
        .run(item.id).changes;
      purged += db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(item.id)
        .changes;
    }
  })();

  return NextResponse.json({ ok: true, purged });
}
