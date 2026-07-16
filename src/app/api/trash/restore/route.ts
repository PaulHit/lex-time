import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { TrashItem } from "@/lib/types";

const TABLES = { employee: "employees", client: "clients" } as const;

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
  const items = parseItems(body?.items);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array of { type, id }" },
      { status: 400 },
    );
  }

  let restored = 0;
  // Items already gone from the trash are skipped rather than failing the
  // batch — a selection can go stale between render and confirm.
  db.transaction(() => {
    for (const item of items) {
      if (item.type === "entry") {
        const entry = db
          .prepare(
            "SELECT employee_id, client_id FROM time_entries WHERE id = ? AND deleted_at IS NOT NULL",
          )
          .get(item.id) as
          | { employee_id: number; client_id: number }
          | undefined;
        if (!entry) continue;
        // A live entry must reference live records, so restoring an entry
        // also restores its employee and client if they sit in the trash.
        db.prepare("UPDATE employees SET deleted_at = NULL WHERE id = ?").run(
          entry.employee_id,
        );
        db.prepare("UPDATE clients SET deleted_at = NULL WHERE id = ?").run(
          entry.client_id,
        );
        db.prepare("UPDATE time_entries SET deleted_at = NULL WHERE id = ?").run(
          item.id,
        );
        restored++;
      } else {
        restored += db
          .prepare(
            `UPDATE ${TABLES[item.type]} SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
          )
          .run(item.id).changes;
      }
    }
  })();

  return NextResponse.json({ ok: true, restored });
}
