import { NextRequest } from "next/server";
import db from "@/lib/db";

/** Wipes every table so each test starts from a known state. */
export function resetDb() {
  db.exec("DELETE FROM time_entries; DELETE FROM employees; DELETE FROM clients;");
}

export function addEmployee(name: string): number {
  return Number(
    db.prepare("INSERT INTO employees (name) VALUES (?)").run(name)
      .lastInsertRowid,
  );
}

export function addClient(name: string): number {
  return Number(
    db.prepare("INSERT INTO clients (name) VALUES (?)").run(name)
      .lastInsertRowid,
  );
}

export function addEntry(entry: {
  employeeId: number;
  clientId: number;
  date: string;
  durationMinutes: number;
  billable?: 0 | 1;
  notes?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): number {
  return Number(
    db
      .prepare(
        `INSERT INTO time_entries
           (employee_id, client_id, date, start_time, end_time, duration_minutes, billable, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.employeeId,
        entry.clientId,
        entry.date,
        entry.startTime ?? null,
        entry.endTime ?? null,
        entry.durationMinutes,
        entry.billable ?? 1,
        entry.notes ?? null,
      ).lastInsertRowid,
  );
}

export const get = (url: string) => new NextRequest(`http://localhost${url}`);

export const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const del = (url: string) =>
  new NextRequest(`http://localhost${url}`, { method: "DELETE" });

/** Route handlers take `params` as a promise in Next 15+. */
export const routeParams = (id: number | string) => ({
  params: Promise.resolve({ id: String(id) }),
});

export function isDeleted(table: string, id: number): boolean {
  const row = db
    .prepare(`SELECT deleted_at FROM ${table} WHERE id = ?`)
    .get(id) as { deleted_at: string | null } | undefined;
  return !!row?.deleted_at;
}

export function rowExists(table: string, id: number): boolean {
  return !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id);
}
