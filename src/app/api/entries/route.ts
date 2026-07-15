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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const clientId = searchParams.get("clientId");
  const billable = searchParams.get("billable");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = `${SELECT_ENTRY} WHERE 1=1`;
  const params: (string | number)[] = [];

  if (employeeId) {
    query += " AND te.employee_id = ?";
    params.push(Number(employeeId));
  }
  if (clientId) {
    query += " AND te.client_id = ?";
    params.push(Number(clientId));
  }
  if (billable === "1" || billable === "0") {
    query += " AND te.billable = ?";
    params.push(Number(billable));
  }
  if (from) {
    query += " AND te.date >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND te.date <= ?";
    params.push(to);
  }
  query += " ORDER BY te.date DESC, te.id DESC";

  const entries = db.prepare(query).all(...params) as TimeEntry[];
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
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

  if (!employeeId || !clientId || !date) {
    return NextResponse.json(
      { error: "employeeId, clientId, and date are required" },
      { status: 400 },
    );
  }

  let duration: number;
  if (durationMinutes != null && durationMinutes !== "") {
    duration = Math.round(Number(durationMinutes));
  } else if (startTime && endTime) {
    duration = minutesBetween(startTime, endTime);
  } else {
    return NextResponse.json(
      { error: "Provide durationMinutes or both startTime and endTime" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "Duration must resolve to a positive number of minutes" },
      { status: 400 },
    );
  }

  const info = db
    .prepare(
      `INSERT INTO time_entries
        (employee_id, client_id, date, start_time, end_time, duration_minutes, billable, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      employeeId,
      clientId,
      date,
      startTime || null,
      endTime || null,
      duration,
      billable ? 1 : 0,
      notes || null,
    );

  const entry = db
    .prepare(`${SELECT_ENTRY} WHERE te.id = ?`)
    .get(info.lastInsertRowid) as TimeEntry;
  return NextResponse.json(entry, { status: 201 });
}
