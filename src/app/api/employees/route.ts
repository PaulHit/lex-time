import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Employee } from "@/lib/types";

export async function GET() {
  const employees = db
    .prepare("SELECT id, name FROM employees WHERE deleted_at IS NULL ORDER BY name")
    .all() as Employee[];
  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT id, name, deleted_at FROM employees WHERE name = ?")
    .get(name) as { id: number; name: string; deleted_at: string | null } | undefined;
  if (existing) {
    // Re-adding a name that sits in the trash restores it instead of colliding.
    if (existing.deleted_at) {
      db.prepare("UPDATE employees SET deleted_at = NULL WHERE id = ?").run(
        existing.id,
      );
    }
    return NextResponse.json(
      { id: existing.id, name: existing.name },
      { status: 200 },
    );
  }

  const info = db.prepare("INSERT INTO employees (name) VALUES (?)").run(name);
  const employee = db
    .prepare("SELECT id, name FROM employees WHERE id = ?")
    .get(info.lastInsertRowid) as Employee;
  return NextResponse.json(employee, { status: 201 });
}
