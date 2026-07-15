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

const EMPLOYEE_NAMES = [
  "Alice Nguyen",
  "Ben Carter",
  "Priya Shah",
  "Marcus Feld",
  "Dana Whitfield",
];

const CLIENT_NAMES = [
  "Acme Corp",
  "Initech LLC",
  "Globex Industries",
  "Wayne Enterprises",
  "Stark & Associates",
  "Pro Bono",
];

// Each tuple: [employeeName, clientName, daysAgo, start, end, durationMinutes, billable, notes]
// When start/end are provided, duration is derived from them; otherwise durationMinutes is used.
type SeedEntry = [
  string,
  string,
  number,
  string | null,
  string | null,
  number | null,
  0 | 1,
  string | null,
];

const SEED_ENTRIES: SeedEntry[] = [
  ["Alice Nguyen", "Acme Corp", 0, "09:00", "11:30", null, 1, "Contract review and redlines"],
  ["Alice Nguyen", "Stark & Associates", 0, "13:00", "14:15", null, 1, "Discovery strategy call"],
  ["Ben Carter", "Wayne Enterprises", 0, "10:00", "12:00", null, 1, "Drafting NDA and MSA"],
  ["Priya Shah", "Globex Industries", 0, null, null, 45, 0, "Internal matter sync"],
  ["Marcus Feld", "Initech LLC", 0, "14:30", "17:00", null, 1, "Deposition prep"],

  ["Alice Nguyen", "Initech LLC", 1, "13:00", "14:00", null, 1, "Client call re: settlement terms"],
  ["Ben Carter", "Pro Bono", 1, null, null, 90, 0, "Pro bono intake consultation"],
  ["Priya Shah", "Acme Corp", 1, "09:30", "12:30", null, 1, "Due diligence review"],
  ["Dana Whitfield", "Stark & Associates", 1, "15:00", "16:30", null, 1, "Trademark filing"],

  ["Marcus Feld", "Wayne Enterprises", 2, "09:00", "11:45", null, 1, "Regulatory compliance memo"],
  ["Alice Nguyen", "Globex Industries", 2, "13:30", "15:00", null, 1, "Contract negotiation"],
  ["Dana Whitfield", "Pro Bono", 2, null, null, 120, 0, "Community legal clinic"],

  ["Ben Carter", "Acme Corp", 3, "10:00", "12:15", null, 1, null],
  ["Priya Shah", "Initech LLC", 3, "14:00", "16:00", null, 1, "Patent claim analysis"],
  ["Marcus Feld", "Stark & Associates", 3, null, null, 30, 0, "Case admin"],

  ["Alice Nguyen", "Wayne Enterprises", 4, "09:15", "11:00", null, 1, "Board resolution drafting"],
  ["Dana Whitfield", "Globex Industries", 4, "13:00", "15:30", null, 1, "Employment agreement review"],
  ["Ben Carter", "Initech LLC", 4, "16:00", "17:00", null, 1, "Weekly client update"],

  ["Priya Shah", "Stark & Associates", 6, "10:30", "13:00", null, 1, "Litigation research"],
  ["Marcus Feld", "Acme Corp", 6, "14:00", "15:45", null, 1, "Merger term sheet"],
  ["Alice Nguyen", "Pro Bono", 7, null, null, 60, 0, "Pro bono case review"],
  ["Dana Whitfield", "Wayne Enterprises", 8, "09:00", "12:00", null, 1, "IP portfolio audit"],
  ["Ben Carter", "Globex Industries", 9, "13:30", "16:00", null, 1, "Vendor contract dispute"],
];

function seed() {
  const employeeCount = (
    db.prepare("SELECT COUNT(*) as c FROM employees").get() as { c: number }
  ).c;
  if (employeeCount === 0) {
    const insert = db.prepare("INSERT INTO employees (name) VALUES (?)");
    for (const name of EMPLOYEE_NAMES) insert.run(name);
  }

  const clientCount = (
    db.prepare("SELECT COUNT(*) as c FROM clients").get() as { c: number }
  ).c;
  if (clientCount === 0) {
    const insert = db.prepare("INSERT INTO clients (name) VALUES (?)");
    for (const name of CLIENT_NAMES) insert.run(name);
  }

  const entryCount = (
    db.prepare("SELECT COUNT(*) as c FROM time_entries").get() as {
      c: number;
    }
  ).c;
  if (entryCount === 0) {
    const employeeId = new Map(
      (
        db.prepare("SELECT id, name FROM employees").all() as {
          id: number;
          name: string;
        }[]
      ).map((e) => [e.name, e.id]),
    );
    const clientId = new Map(
      (
        db.prepare("SELECT id, name FROM clients").all() as {
          id: number;
          name: string;
        }[]
      ).map((c) => [c.name, c.id]),
    );

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
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const insertMany = db.transaction((entries: SeedEntry[]) => {
      for (const [
        empName,
        cliName,
        daysAgo,
        start,
        end,
        duration,
        billable,
        notes,
      ] of entries) {
        const derived =
          start && end
            ? toMinutes(end) - toMinutes(start)
            : (duration ?? 0);
        insert.run({
          employee_id: employeeId.get(empName),
          client_id: clientId.get(cliName),
          date: iso(daysAgo),
          start_time: start,
          end_time: end,
          duration_minutes: derived,
          billable,
          notes,
        });
      }
    });
    insertMany(SEED_ENTRIES);
  }
}
seed();

export default db;
