import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ids: number[] = Array.isArray(body?.ids)
    ? body.ids.filter((n: unknown) => Number.isInteger(n))
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty array of entry ids" },
      { status: 400 },
    );
  }

  const placeholders = ids.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE time_entries SET deleted_at = datetime('now')
       WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    )
    .run(...ids);

  return NextResponse.json({ ok: true, trashed: result.changes });
}
