import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Employee } from "@/lib/types";

export async function GET() {
  const employees = db
    .prepare("SELECT * FROM employees ORDER BY name")
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
    .prepare("SELECT * FROM employees WHERE name = ?")
    .get(name) as Employee | undefined;
  if (existing) return NextResponse.json(existing, { status: 200 });

  const info = db.prepare("INSERT INTO employees (name) VALUES (?)").run(name);
  const employee = db
    .prepare("SELECT * FROM employees WHERE id = ?")
    .get(info.lastInsertRowid) as Employee;
  return NextResponse.json(employee, { status: 201 });
}
