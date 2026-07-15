import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Client } from "@/lib/types";

export async function GET() {
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY name")
    .all() as Client[];
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = db
    .prepare("SELECT * FROM clients WHERE name = ?")
    .get(name) as Client | undefined;
  if (existing) return NextResponse.json(existing, { status: 200 });

  const info = db.prepare("INSERT INTO clients (name) VALUES (?)").run(name);
  const client = db
    .prepare("SELECT * FROM clients WHERE id = ?")
    .get(info.lastInsertRowid) as Client;
  return NextResponse.json(client, { status: 201 });
}
