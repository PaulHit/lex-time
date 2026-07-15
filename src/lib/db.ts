import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "timesheet.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER NOT NULL,
    billable INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seed() {
  const employeeCount = (
    db.prepare("SELECT COUNT(*) as c FROM employees").get() as { c: number }
  ).c;
  if (employeeCount === 0) {
    const insert = db.prepare("INSERT INTO employees (name) VALUES (?)");
    for (const name of ["Alice Nguyen", "Ben Carter", "Priya Shah"]) {
      insert.run(name);
    }
  }

  const clientCount = (
    db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }
  ).c;
  if (clientCount === 0) {
    const insert = db.prepare("INSERT INTO clients (name) VALUES (?)");
    for (const name of [
      "Acme Corp",
      "Initech LLC",
      "Globex Industries",
      "Pro Bono",
    ]) {
      insert.run(name);
    }
  }

  const entryCount = (
    db.prepare("SELECT COUNT(*) as c FROM time_entries").get() as {
      c: number;
    }
  ).c;
  if (entryCount === 0) {
    const alice = db
      .prepare("SELECT id FROM employees WHERE name = ?")
      .get("Alice Nguyen") as { id: number };
    const ben = db
      .prepare("SELECT id FROM employees WHERE name = ?")
      .get("Ben Carter") as { id: number };
    const acme = db
      .prepare("SELECT id FROM clients WHERE name = ?")
      .get("Acme Corp") as { id: number };
    const initech = db
      .prepare("SELECT id FROM clients WHERE name = ?")
      .get("Initech LLC") as { id: number };
    const proBono = db
      .prepare("SELECT id FROM clients WHERE name = ?")
      .get("Pro Bono") as { id: number };

    const insert = db.prepare(`
      INSERT INTO time_entries
        (employee_id, client_id, date, start_time, end_time, duration_minutes, billable, notes)
      VALUES (@employee_id, @client_id, @date, @start_time, @end_time, @duration_minutes, @billable, @notes)
    `);
    const today = new Date();
    const iso = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().slice(0, 10);
    };

    insert.run({
      employee_id: alice.id,
      client_id: acme.id,
      date: iso(0),
      start_time: "09:00",
      end_time: "11:30",
      duration_minutes: 150,
      billable: 1,
      notes: "Contract review and redlines",
    });
    insert.run({
      employee_id: alice.id,
      client_id: initech.id,
      date: iso(1),
      start_time: "13:00",
      end_time: "14:00",
      duration_minutes: 60,
      billable: 1,
      notes: "Client call re: settlement terms",
    });
    insert.run({
      employee_id: ben.id,
      client_id: proBono.id,
      date: iso(1),
      start_time: null,
      end_time: null,
      duration_minutes: 90,
      billable: 0,
      notes: "Pro bono intake consultation",
    });
    insert.run({
      employee_id: ben.id,
      client_id: acme.id,
      date: iso(3),
      start_time: "10:00",
      end_time: "12:15",
      duration_minutes: 135,
      billable: 1,
      notes: null,
    });
  }
}
seed();

export default db;
