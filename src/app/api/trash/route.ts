import { NextResponse } from "next/server";
import db from "@/lib/db";
import { TrashedEntry, TrashedRecord } from "@/lib/types";

export async function GET() {
  const entries = db
    .prepare(
      `SELECT te.*, e.name as employee_name, c.name as client_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       JOIN clients c ON c.id = te.client_id
       WHERE te.deleted_at IS NOT NULL
       ORDER BY te.deleted_at DESC, te.id DESC`,
    )
    .all() as TrashedEntry[];

  const employees = db
    .prepare(
      `SELECT emp.id, emp.name, emp.deleted_at,
         (SELECT COUNT(*) FROM time_entries te
          WHERE te.employee_id = emp.id AND te.deleted_at IS NOT NULL) as trashedEntryCount
       FROM employees emp
       WHERE emp.deleted_at IS NOT NULL
       ORDER BY emp.deleted_at DESC`,
    )
    .all() as TrashedRecord[];

  const clients = db
    .prepare(
      `SELECT cl.id, cl.name, cl.deleted_at,
         (SELECT COUNT(*) FROM time_entries te
          WHERE te.client_id = cl.id AND te.deleted_at IS NOT NULL) as trashedEntryCount
       FROM clients cl
       WHERE cl.deleted_at IS NOT NULL
       ORDER BY cl.deleted_at DESC`,
    )
    .all() as TrashedRecord[];

  return NextResponse.json({ entries, employees, clients });
}
