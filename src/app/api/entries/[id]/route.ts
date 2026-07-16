import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { minutesBetween } from "@/lib/time";
import { TimeEntry } from "@/lib/types";

const SELECT_ENTRY = `
  SELECT te.*, e.name as employee_name, c.name as client_name
  FROM time_entries te
  JOIN employees e ON e.id = te.employee_id
  JOIN clients c ON c.id = te.client_id
`;

type RawEntry = {
  id: number;
  employee_id: number;
  client_id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  billable: number;
  notes: string | null;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = db
    .prepare("SELECT * FROM time_entries WHERE id = ? AND deleted_at IS NULL")
    .get(id) as RawEntry | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    employeeId,
    clientId,
    date,
    startTime,
    endTime,
    durationMinutes,
    billable,
    notes,
  } = body ?? {};

  let duration = existing.duration_minutes;
  if (durationMinutes != null && durationMinutes !== "") {
    duration = Math.round(Number(durationMinutes));
  } else if (startTime && endTime) {
    duration = minutesBetween(startTime, endTime);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "Duration must resolve to a positive number of minutes" },
      { status: 400 },
    );
  }

  db.prepare(
    `UPDATE time_entries SET
       employee_id = ?, client_id = ?, date = ?, start_time = ?, end_time = ?,
       duration_minutes = ?, billable = ?, notes = ?
     WHERE id = ?`,
  ).run(
    employeeId ?? existing.employee_id,
    clientId ?? existing.client_id,
    date ?? existing.date,
    startTime !== undefined ? startTime || null : existing.start_time,
    endTime !== undefined ? endTime || null : existing.end_time,
    duration,
    billable != null ? (billable ? 1 : 0) : existing.billable,
    notes !== undefined ? notes || null : existing.notes,
    id,
  );

  const updated = db.prepare(`${SELECT_ENTRY} WHERE te.id = ?`).get(id) as TimeEntry;
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Soft delete: the entry moves to the trash and can be restored from there.
  const result = db
    .prepare(
      "UPDATE time_entries SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    )
    .run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
