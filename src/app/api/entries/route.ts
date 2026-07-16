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

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const clientId = searchParams.get("clientId");
  const billable = searchParams.get("billable");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let where = " WHERE 1=1";
  const params: (string | number)[] = [];

  if (employeeId) {
    where += " AND te.employee_id = ?";
    params.push(Number(employeeId));
  }
  if (clientId) {
    where += " AND te.client_id = ?";
    params.push(Number(clientId));
  }
  if (billable === "1" || billable === "0") {
    where += " AND te.billable = ?";
    params.push(Number(billable));
  }
  if (from) {
    where += " AND te.date >= ?";
    params.push(from);
  }
  if (to) {
    where += " AND te.date <= ?";
    params.push(to);
  }

  // Totals cover the whole filtered set, not just the page, so the summary
  // stats stay meaningful while paging.
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         COALESCE(SUM(te.duration_minutes), 0) as totalMinutes,
         COALESCE(SUM(CASE WHEN te.billable = 1 THEN te.duration_minutes ELSE 0 END), 0) as billableMinutes
       FROM time_entries te${where}`,
    )
    .get(...params) as {
    total: number;
    totalMinutes: number;
    billableMinutes: number;
  };

  const parsedLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const parsedOffset = Number(searchParams.get("offset"));
  const offset =
    Number.isFinite(parsedOffset) && parsedOffset > 0
      ? Math.floor(parsedOffset)
      : 0;

  const entries = db
    .prepare(
      `${SELECT_ENTRY}${where} ORDER BY te.date DESC, te.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as TimeEntry[];

  return NextResponse.json({ entries, ...totals });
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
