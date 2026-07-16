import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cascade = new URL(req.url).searchParams.get("cascade") === "1";

  const client = db
    .prepare("SELECT id, name FROM clients WHERE id = ? AND deleted_at IS NULL")
    .get(id) as { id: number; name: string } | undefined;
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const entryCount = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM time_entries WHERE client_id = ? AND deleted_at IS NULL",
      )
      .get(id) as { c: number }
  ).c;

  if (entryCount > 0 && !cascade) {
    return NextResponse.json(
      {
        requiresConfirmation: true,
        entryCount,
        error: `${client.name} has ${entryCount} time ${
          entryCount === 1 ? "entry" : "entries"
        }.`,
      },
      { status: 409 },
    );
  }

  db.transaction(() => {
    db.prepare(
      "UPDATE time_entries SET deleted_at = datetime('now') WHERE client_id = ? AND deleted_at IS NULL",
    ).run(id);
    db.prepare(
      "UPDATE clients SET deleted_at = datetime('now') WHERE id = ?",
    ).run(id);
  })();

  return NextResponse.json({ ok: true, trashedEntries: entryCount });
}
